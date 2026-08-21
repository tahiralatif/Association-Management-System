"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, API_BASE, type PaginatedResponse } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatusBadge, DataTable, Pagination, SearchInput,
  StatCard, Modal, ConfirmDialog, FormField, Input, Select,
  Textarea, Tabs, EmptyState, LoadingSpinner,
} from "@/components/ui/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, UserPlus, Download, Upload, Tag, Shield, Activity,
  ChevronDown, Mail, Phone, Edit, Trash2, Eye, MoreHorizontal,
} from "lucide-react";

/**
 * Backend returns UserWithProfile: flat user object with nested member_profile.
 *
 * Actual API shape:
 * {
 *   id: "c2a5381c...",          ← THIS is the user_id (the users.id)
 *   email, first_name, last_name, tenant_id, roles, is_active, ...
 *   member_profile: {
 *     id: "2abf0009...",        ← member_profiles.id
 *     user_id: "c2a5381c...",
 *     status: "active",
 *     tier: "basic",
 *     phone, joined_at, tags, engagement_score, ...
 *   }
 * }
 *
 * The frontend interface MUST match this shape.
 */

interface Member {
  // Flat user fields
  id: string;                    // ← user ID (for status, delete, etc.)
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  roles: string[];
  created_at: string;
  // Nested profile
  member_profile?: {
    id: string;                  // member_profile.id
    user_id: string;
    phone?: string;
    status?: string;
    tier?: string;
    member_number?: string;
    joined_at?: string;
    engagement_score?: number;
    tags?: string[];
  };
}

interface MemberStats {
  total: number;       // active members (matches list)
  total_all?: number;   // all members including inactive
  active: number;
  pending: number;
  lapsed: number;
  cancelled: number;
  suspended?: number;
  recent_joins?: number;
  avg_engagement?: number;
  at_risk_count?: number;
  by_tier?: Record<string, number>;
}

interface Group { id: string; name: string; description?: string; member_count?: number; is_active?: boolean; }
interface TagItem { id: string; name: string; color?: string; count?: number; }

function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

/** Safely extract fields from the nested API shape */
function getPhone(m: Member) { return m.member_profile?.phone || ""; }
function getStatus(m: Member) { return m.member_profile?.status || (m.is_active ? "active" : "inactive"); }
function getTier(m: Member) { return m.member_profile?.tier || "basic"; }
function getJoined(m: Member) { return m.member_profile?.joined_at || m.created_at; }
function getScore(m: Member) { return m.member_profile?.engagement_score; }
function getTags(m: Member) { return m.member_profile?.tags || []; }

export default function MembersPage() {
  const toast = useToast();
  const [tab, setTab] = useState("list");
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);

  // Authenticated CSV download helper — uses API_BASE to hit the backend directly
  async function downloadCsv(url: string, filename: string) {
    const { getToken } = await import("@/lib/api");
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${url}`, { headers });
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = filename; a.click();
    URL.revokeObjectURL(blobUrl);
  }
  const [groups, setGroups] = useState<Group[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  // Detail/Edit
  const [selected, setSelected] = useState<Member | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", email: "" });
  const [memberNotes, setMemberNotes] = useState<string[]>([]);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", first_name: "", last_name: "", phone: "", password: "" });
  const [creating, setCreating] = useState(false);

  // Groups
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [addToGroupMemberId, setAddToGroupMemberId] = useState("");

  // Tags
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [tagForm, setTagForm] = useState({ name: "", color: "#3b82f6" });

  // Bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [showBulkTagModal, setShowBulkTagModal] = useState(false);
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([]);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  // ── Load Data ────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const r = await apiFetch<PaginatedResponse<Member>>(`/api/v1/members/?${params}`);
      setMembers(r.items || []);
      setTotal(r.total || 0);
    } catch (e: any) { toast.error(e.message || "Failed to load members"); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  const loadStats = useCallback(async () => {
    try { setStats(await apiFetch<MemberStats>("/api/v1/members/stats")); }
    catch { /* non-critical */ }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const r = await apiFetch<Group[] | { items: Group[] }>("/api/v1/members/groups/all");
      setGroups(Array.isArray(r) ? r : (r as any).items || []);
    } catch { /* non-critical */ }
  }, []);

  const loadTags = useCallback(async () => {
    try {
      const r = await apiFetch<TagItem[] | { items: TagItem[] }>("/api/v1/members/tags/all");
      setTags(Array.isArray(r) ? r : (r as any).items || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { loadStats(); loadGroups(); loadTags(); }, [loadStats, loadGroups, loadTags]);

  // ── CRUD ─────────────────────────────────────────────────
  async function handleCreate() {
    if (!createForm.email || !createForm.first_name) { toast.warning("Email and name required"); return; }
    setCreating(true);
    try {
      await apiFetch("/api/v1/members/", { method: "POST", body: JSON.stringify(createForm) });
      toast.success("Member created");
      setShowCreate(false);
      setCreateForm({ email: "", first_name: "", last_name: "", phone: "", password: "" });
      loadMembers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Create failed"); }
    finally { setCreating(false); }
  }

  async function handleUpdate() {
    if (!selected) return;
    try {
      // Use m.id which IS the user_id in the API response
      await apiFetch(`/api/v1/members/${selected.id}/profile`, { method: "PATCH", body: JSON.stringify(editForm) });
      toast.success("Member updated");
      setShowDetail(false);
      loadMembers();
    } catch (e: any) { toast.error(e.message || "Update failed"); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    // Use m.id — this is the user_id (users.id) that the DELETE endpoint expects
    const userId = deleteTarget.id;
    try {
      await apiFetch(`/api/v1/members/${userId}`, { method: "DELETE" });
      toast.success("Member deleted");
      setDeleteTarget(null);
      loadMembers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  }

  /**
   * Change member status.
   *
   * Backend endpoint: PATCH /api/v1/members/{user_id}/status
   * Backend body: { member_ids: [str], status: str }
   * Valid statuses: pending | active | suspended | lapsed | cancelled
   *
   * @param userId - The user ID (Member.id, NOT Member.member_profile.id)
   * @param status - One of the valid backend status values
   */
  async function handleStatusChange(userId: string, status: string) {
    try {
      await apiFetch(`/api/v1/members/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ member_ids: [userId], status }),
      });
      toast.success(`Member status updated to ${status}`);
      loadMembers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Status change failed"); }
  }

  // ── Groups ───────────────────────────────────────────────
  async function handleCreateGroup() {
    if (!groupForm.name) { toast.warning("Group name required"); return; }
    try {
      await apiFetch("/api/v1/members/groups", { method: "POST", body: JSON.stringify(groupForm) });
      toast.success("Group created");
      setShowCreateGroup(false);
      setGroupForm({ name: "", description: "" });
      loadGroups();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function loadGroupMembers(group: Group) {
    setSelectedGroup(group);
    try {
      const r = await apiFetch<{ members: any[] }>(`/api/v1/members/groups/${group.id}`);
      const data = r as any;
      setGroupMembers(data.members?.map((m: any) => ({
        id: m.member_id,
        first_name: m.user_name?.split(" ")[0] || "",
        last_name: m.user_name?.split(" ").slice(1).join(" ") || "",
        email: m.email || "",
        role: m.role,
        joined_at: m.joined_at,
      })) || []);
    } catch (e: any) { toast.error("Failed to load group members"); }
  }

  async function handleAddToGroup() {
    if (!selectedGroup || !addToGroupMemberId) { toast.warning("Select a member"); return; }
    try {
      await apiFetch(`/api/v1/members/groups/${selectedGroup.id}/members`, {
        method: "POST",
        body: JSON.stringify({ member_id: addToGroupMemberId, role: "member" }),
      });
      toast.success("Member added to group — they've been notified!");
      setShowAddToGroup(false);
      setAddToGroupMemberId("");
      loadGroupMembers(selectedGroup);
    } catch (e: any) { toast.error(e.message || "Failed to add member"); }
  }

  async function handleRemoveFromGroup(memberId: string) {
    if (!selectedGroup) return;
    if (!confirm("Remove this member from the group?")) return;
    try {
      await apiFetch(`/api/v1/members/groups/${selectedGroup.id}/members/${memberId}`, { method: "DELETE" });
      toast.success("Member removed from group");
      loadGroupMembers(selectedGroup);
    } catch (e: any) { toast.error(e.message || "Failed to remove member"); }
  }

  // ── Tags ─────────────────────────────────────────────────
  async function handleCreateTag() {
    if (!tagForm.name) { toast.warning("Tag name required"); return; }
    try {
      await apiFetch("/api/v1/members/tags", { method: "POST", body: JSON.stringify(tagForm) });
      toast.success("Tag created");
      setShowCreateTag(false);
      setTagForm({ name: "", color: "#3b82f6" });
      loadTags();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  // ── Bulk ─────────────────────────────────────────────────
  async function handleBulk() {
    if (selectedIds.length === 0 || !bulkAction) { toast.warning("Select members and action"); return; }
    try {
      if (bulkAction === "activate" || bulkAction === "deactivate") {
        await apiFetch("/api/v1/members/bulk/status", {
          method: "POST",
          body: JSON.stringify({
            member_ids: selectedIds,
            status: bulkAction === "activate" ? "active" : "suspended",
          }),
        });
      } else if (bulkAction === "add_tag" || bulkAction === "remove_tag") {
        // Show tag selection modal
        setBulkTagIds([]);
        setShowBulkTagModal(true);
        return; // Don't clear selection or show success yet
      } else if (bulkAction === "delete") {
        await handleBulkDelete(selectedIds);
        return;
      } else if (bulkAction === "export") {
        downloadCsv("/api/v1/members/export/csv", "members.csv");
      }
      toast.success(`Bulk ${bulkAction} completed`);
      setSelectedIds([]);
      loadMembers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Bulk action failed"); }
  }

  async function handleBulkTagSubmit() {
    if (bulkTagIds.length === 0) { toast.warning("Select at least one tag"); return; }
    try {
      const endpoint = bulkAction === "add_tag" ? "/api/v1/members/bulk/tag" : "/api/v1/members/bulk/remove-tag";
      await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({
          member_ids: selectedIds,
          tag_ids: bulkTagIds,
        }),
      });
      toast.success(`${bulkAction === "add_tag" ? "Tagged" : "Untagged"} ${selectedIds.length} member(s)`);
      setShowBulkTagModal(false);
      setSelectedIds([]);
      setBulkAction("");
      loadMembers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Bulk tag failed"); }
  }

  async function handleBulkDelete(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} member(s)? This cannot be undone.`)) return;
    try {
      await apiFetch("/api/v1/members/bulk/delete", {
        method: "POST",
        body: JSON.stringify({ member_ids: ids }),
      });
      toast.success(`Deleted ${ids.length} members`);
      setSelectedIds([]);
      loadMembers(); loadStats();
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Members"
        description="Manage association members"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <UserPlus className="h-4 w-4" /> Add Member
            </button>
            <button onClick={() => downloadCsv("/api/v1/members/export/csv", "members.csv")} className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => { if (confirm("Delete ALL members? This cannot be undone.")) handleBulkDelete(members.map(m => m.id)); }} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
              <Trash2 className="h-4 w-4" /> Delete All ({total})
            </button>
          </div>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Active Members" value={stats.total} icon="👥" subtitle={`${stats.total_all ?? '?'} total (incl. inactive)`} />
          <StatCard label="Lapsed" value={stats.lapsed} icon="⚠️" subtitle="Profile status: lapsed" />
          <StatCard label="New This Month" value={stats.recent_joins ?? 0} icon="🆕" subtitle="Joined in last 30 days" />
          <StatCard label="At Risk" value={stats.at_risk_count ?? 0} icon="🔔" subtitle="Churn risk > 70%" />
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: "list", label: "All Members" },
          { key: "groups", label: "Groups" },
          { key: "tags", label: "Tags" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {/* ── Members List ────────────────────────────────── */}
      {tab === "list" && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search members..." />
            <select
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="lapsed">Lapsed</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {selectedIds.length > 0 && (
              <div className="flex gap-2 items-center">
                <Select value={bulkAction} onChange={setBulkAction} options={[
                  { value: "activate", label: "Activate" },
                  { value: "deactivate", label: "Deactivate" },
                  { value: "add_tag", label: "Add Tag" },
                  { value: "remove_tag", label: "Remove Tag" },
                  { value: "delete", label: "Delete Selected" },
                  { value: "export", label: "Export Selected" },
                ]} />
                <button onClick={handleBulk} className="bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700">
                  Apply ({selectedIds.length})
                </button>
              </div>
            )}
          </div>

          {loading ? <LoadingSpinner /> : members.length === 0 ? (
            <EmptyState title="No members found" description="Add your first member to get started" />
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left">
                        <input type="checkbox" onChange={(e) => {
                          // Select by user ID (m.id)
                          setSelectedIds(e.target.checked ? members.map(m => m.id) : []);
                        }} checked={selectedIds.length === members.length && members.length > 0} />
                      </th>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Tier</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Joined</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const status = getStatus(m);
                      return (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <input type="checkbox" checked={selectedIds.includes(m.id)}
                              onChange={(e) => setSelectedIds(
                                e.target.checked ? [...selectedIds, m.id] : selectedIds.filter(id => id !== m.id)
                              )} />
                          </td>
                          <td className="p-3 font-medium">{m.first_name} {m.last_name}</td>
                          <td className="p-3 text-gray-500">{m.email}</td>
                          <td className="p-3"><StatusBadge status={getTier(m)} /></td>
                          <td className="p-3"><StatusBadge status={status} /></td>
                          <td className="p-3 text-gray-500">{fmtDate(getJoined(m))}</td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button onClick={() => {
                                setSelected(m);
                                setEditForm({ first_name: m.first_name, last_name: m.last_name, phone: getPhone(m), email: m.email });
                                setShowDetail(true);
                              }} className="p-1 hover:bg-gray-100 rounded"><Eye className="h-4 w-4" /></button>
                              <select className="text-xs border rounded p-1" value={status}
                                onChange={(e) => handleStatusChange(m.id, e.target.value)}>
                                <option value="pending">Pending</option>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="lapsed">Lapsed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <button onClick={() => setDeleteTarget(m)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={total} perPage={perPage} onChange={setPage} />
            </>
          )}
        </div>
      )}

      {/* ── Groups ──────────────────────────────────────── */}
      {tab === "groups" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateGroup(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <UserPlus className="h-4 w-4" /> New Group
            </button>
          </div>
          {groups.length === 0 ? (
            <EmptyState title="No groups" description="Create your first group" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
              {groups.map((g) => (
                <Card key={g.id} className={`cursor-pointer hover:border-teal-400 transition-all duration-200 ${selectedGroup?.id === g.id ? "border-teal-500" : ""}`} onClick={() => loadGroupMembers(g)}>
                  <CardHeader className="pb-2"><CardTitle className="text-base text-slate-800">{g.name}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">{g.description || "No description"}</p>
                    <p className="text-xs mt-2 text-gray-400">{g.member_count || 0} members</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {selectedGroup && (
            <Card className="rounded-2xl border-slate-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base text-slate-800">{selectedGroup.name} — Members ({groupMembers.length})</CardTitle>
                <button onClick={() => setShowAddToGroup(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)" }}>
                  <UserPlus className="h-3.5 w-3.5" /> Add Member
                </button>
              </CardHeader>
              <CardContent>
                {groupMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No members in this group yet</p>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map((m: any) => (
                      <div key={m.id} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <span className="text-sm font-medium text-slate-700">{m.first_name} {m.last_name}</span>
                          <span className="text-xs text-gray-400 ml-2">{m.role}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-500">{m.email}</span>
                          <button onClick={() => handleRemoveFromGroup(m.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tags ────────────────────────────────────────── */}
      {tab === "tags" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateTag(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <Tag className="h-4 w-4" /> New Tag
            </button>
          </div>
          {tags.length === 0 ? (
            <EmptyState title="No tags" description="Create tags to categorize members" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border" style={{ borderColor: t.color || "#e5e7eb" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color || "#3b82f6" }} />
                  {t.name}
                  {t.count !== undefined && <span className="text-gray-400 text-xs">({t.count})</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      {/* Create Member */}
      <Modal open={showCreate} onOpenChange={(v) => setShowCreate(v)} title="Add Member">
        <div className="space-y-4">
          <FormField label="Email" required error={""}>
            <Input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} type="email" autoComplete="new-email" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required>
              <Input value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} autoComplete="given-name" />
            </FormField>
            <FormField label="Last Name">
              <Input value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} autoComplete="family-name" />
            </FormField>
          </div>
          <FormField label="Phone">
            <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} type="tel" autoComplete="tel" placeholder="+1-555-123-4567" />
          </FormField>
          <FormField label="Password" required>
            <Input value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} type="password" autoComplete="new-password" />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              {creating ? "Creating..." : "Create Member"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Member Detail / Edit */}
      <Modal open={showDetail} onOpenChange={(v) => setShowDetail(v)} title={selected ? `${selected.first_name} ${selected.last_name}` : "Member Details"}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name">
                <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </FormField>
              <FormField label="Last Name">
                <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Email">
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </FormField>
            <FormField label="Phone">
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Tier:</span> <StatusBadge status={getTier(selected)} /></div>
              <div><span className="text-gray-500">Status:</span> <StatusBadge status={getStatus(selected)} /></div>
              <div><span className="text-gray-500">Score:</span> {getScore(selected) ?? "—"}</div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDetail(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleUpdate} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Save Changes</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Group */}
      <Modal open={showCreateGroup} onOpenChange={(v) => setShowCreateGroup(v)} title="New Group">
        <div className="space-y-4">
          <FormField label="Group Name" required>
            <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
          </FormField>
          <FormField label="Description">
            <Textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateGroup(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreateGroup} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Create</button>
          </div>
        </div>
      </Modal>

      {/* Add Member to Group */}
      <Modal open={showAddToGroup} onOpenChange={(v) => setShowAddToGroup(v)} title={`Add Member to ${selectedGroup?.name || "Group"}`}>
        <div className="space-y-4">
          <FormField label="Select Member" required>
            <select
              value={addToGroupMemberId}
              onChange={(e) => setAddToGroupMemberId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
            >
              <option value="">Choose a member...</option>
              {members.filter(m => !groupMembers.some(gm => gm.id === m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email})</option>
              ))}
            </select>
          </FormField>
          <p className="text-xs text-gray-400">The member will receive an in-app notification and email.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddToGroup(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleAddToGroup} disabled={!addToGroupMemberId} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Add to Group</button>
          </div>
        </div>
      </Modal>

      {/* Create Tag */}
      <Modal open={showCreateTag} onOpenChange={(v) => setShowCreateTag(v)} title="New Tag">
        <div className="space-y-4">
          <FormField label="Tag Name" required>
            <Input value={tagForm.name} onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })} />
          </FormField>
          <FormField label="Color">
            <input type="color" value={tagForm.color} onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })} className="h-10 w-20 rounded border" />
          </FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateTag(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreateTag} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Create</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Tag Modal */}
      <Modal open={showBulkTagModal} onOpenChange={(v) => { setShowBulkTagModal(v); if (!v) { setBulkAction(""); } }} title={bulkAction === "add_tag" ? "Add Tag to Members" : "Remove Tag from Members"}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select tags to {bulkAction === "add_tag" ? "add to" : "remove from"} {selectedIds.length} member(s):</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tags.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No tags created yet. Create a tag first.</p>
            ) : (
              tags.map((t) => (
                <label key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkTagIds.includes(t.id)}
                    onChange={(e) => {
                      setBulkTagIds(e.target.checked
                        ? [...bulkTagIds, t.id]
                        : bulkTagIds.filter(id => id !== t.id)
                      );
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color || "#3b82f6" }} />
                  <span className="text-sm font-medium text-slate-700">{t.name}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowBulkTagModal(false); setBulkAction(""); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleBulkTagSubmit} disabled={bulkTagIds.length === 0} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              {bulkAction === "add_tag" ? "Add Tag" : "Remove Tag"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Member"
        description={`Are you sure you want to delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This action cannot be undone.`}
      />
    </div>
  );
}
