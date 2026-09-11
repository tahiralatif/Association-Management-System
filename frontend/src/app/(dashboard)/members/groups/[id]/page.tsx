"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatusBadge, SearchInput, Modal, ConfirmDialog,
  FormField, Input, Textarea, LoadingSpinner, EmptyState,
} from "@/components/ui/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Users, Edit, Trash2, UserPlus, UserMinus, X,
} from "lucide-react";

interface GroupDetail {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  is_active?: boolean;
  created_at?: string;
}

interface GroupMember {
  member_id: string;
  user_name: string;
  email: string;
  role: string;
  joined_at?: string;
  is_active?: boolean;
}

interface SearchMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  member_profile?: {
    status?: string;
    member_number?: string;
  };
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const toast = useToast();

  // Group data
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Member search within group
  const [memberSearch, setMemberSearch] = useState("");

  // Edit group modal
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  // Delete group confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Remove member confirmation
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null);

  // Add members modal
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // ── Load Group ─────────────────────────────────────────
  const loadGroup = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<GroupDetail & { members: GroupMember[] }>(
        `/api/v1/members/groups/${groupId}`
      );
      setGroup(data);
      setMembers(data.members || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load group");
      router.push("/members");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { loadGroup(); }, [loadGroup]);

  // ── Edit Group ─────────────────────────────────────────
  function openEdit() {
    if (!group) return;
    setEditForm({ name: group.name, description: group.description || "" });
    setShowEdit(true);
  }

  async function handleEdit() {
    if (!editForm.name.trim()) { toast.warning("Group name is required"); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/v1/members/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      toast.success("Group updated");
      setShowEdit(false);
      loadGroup();
    } catch (e: any) {
      toast.error(e.message || "Failed to update group");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete Group ───────────────────────────────────────
  async function handleDeleteGroup() {
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/members/groups/${groupId}`, { method: "DELETE" });
      toast.success("Group deleted");
      router.push("/members");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete group");
      setDeleting(false);
    }
  }

  // ── Remove Member ──────────────────────────────────────
  async function handleRemoveMember() {
    if (!removeTarget) return;
    try {
      await apiFetch(
        `/api/v1/members/groups/${groupId}/members/${removeTarget.member_id}`,
        { method: "DELETE" }
      );
      toast.success(`${removeTarget.user_name} removed from group`);
      setRemoveTarget(null);
      loadGroup();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    }
  }

  // ── Search Members (for add modal) ─────────────────────
  useEffect(() => {
    if (!showAddMembers) return;
    const controller = new AbortController();

    const doSearch = async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          page: "1",
          per_page: "50",
        });
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const result = await apiFetch<{ items: SearchMember[]; total: number }>(
          `/api/v1/members/?${params}`
        );
        setSearchResults(result.items || []);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          toast.error("Failed to search members");
        }
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(doSearch, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery, showAddMembers]);

  // ── Add Members to Group ───────────────────────────────
  async function handleAddMembers() {
    if (selectedMemberIds.length === 0) { toast.warning("Select at least one member"); return; }
    setAdding(true);
    let added = 0;
    let failed = 0;
    for (const memberId of selectedMemberIds) {
      try {
        await apiFetch(`/api/v1/members/groups/${groupId}/members`, {
          method: "POST",
          body: JSON.stringify({ member_id: memberId, role: "member" }),
        });
        added++;
      } catch {
        failed++;
      }
    }
    setAdding(false);
    setShowAddMembers(false);
    setSelectedMemberIds([]);
    setSearchQuery("");
    setSearchResults([]);

    if (added > 0) {
      toast.success(`Added ${added} member(s) to group` + (failed ? ` (${failed} failed)` : ""));
      loadGroup();
    } else {
      toast.error("Failed to add members");
    }
  }

  // ── Filtered members within group ──────────────────────
  const filteredMembers = members.filter((m) => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.user_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  // Members already in group (for disabling in search)
  const memberIdsInGroup = new Set(members.map((m) => m.member_id));

  if (loading) {
    return (
      <div className="space-y-6 page-enter">
        <LoadingSpinner />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6 page-enter">
        <EmptyState title="Group not found" description="This group may have been deleted." />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title={group.name}
        description={group.description || "Group details"}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/members")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 bg-white/15 hover:bg-white/25 backdrop-blur"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Members
            </button>
          </div>
        }
      />

      {/* Group Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{group.member_count ?? members.length}</p>
                <p className="text-sm text-slate-500">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #065f46, #0d9488)" }}>
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{group.description || "No description"}</p>
                <p className="text-xs text-slate-400 mt-1">Description</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}
                >
                  <Edit className="h-4 w-4" /> Edit Group
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                >
                  <Trash2 className="h-4 w-4" /> Delete Group
                </button>
              </div>
              <button
                onClick={() => {
                  setSelectedMemberIds([]);
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowAddMembers(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}
              >
                <UserPlus className="h-4 w-4" /> Add Members
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800">
            Group Members ({filteredMembers.length})
          </CardTitle>
          <div className="w-64">
            <SearchInput
              value={memberSearch}
              onChange={setMemberSearch}
              placeholder="Filter group members..."
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <EmptyState
              icon="👥"
              title={memberSearch ? "No matching members" : "No members in this group"}
              description={memberSearch ? "Try a different search term" : "Click 'Add Members' to get started"}
            />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">Name</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Email</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Role</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Joined</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.member_id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{m.user_name}</td>
                      <td className="p-3 text-slate-500">{m.email}</td>
                      <td className="p-3">
                        <StatusBadge status={m.role} />
                      </td>
                      <td className="p-3 text-slate-500">{fmtDate(m.joined_at)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setRemoveTarget(m)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modals ──────────────────────────────────────── */}

      {/* Edit Group Modal */}
      <Modal open={showEdit} onOpenChange={setShowEdit} title="Edit Group">
        <div className="space-y-4">
          <FormField label="Group Name" required>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. Executive Committee"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Optional description..."
              rows={3}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowEdit(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? This will remove all members from the group and cannot be undone.`}
        confirmText="Delete Group"
        variant="destructive"
        onConfirm={handleDeleteGroup}
        loading={deleting}
      />

      {/* Remove Member Confirmation */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}
        title="Remove Member"
        description={`Remove ${removeTarget?.user_name} from this group?`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={handleRemoveMember}
      />

      {/* Add Members Modal */}
      <Modal open={showAddMembers} onOpenChange={setShowAddMembers} title="Add Members to Group" maxWidth="max-w-2xl">
        <div className="space-y-4">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search members by name or email..."
          />
          <div className="max-h-80 overflow-y-auto border rounded-lg">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-100 border-t-[#0d9488]" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                {searchQuery ? "No members found" : "Start typing to search members"}
              </p>
            ) : (
              <div className="divide-y">
                {searchResults.map((m) => {
                  const isInGroup = memberIdsInGroup.has(m.id);
                  const isSelected = selectedMemberIds.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-3 p-3 transition-colors ${
                        isInGroup
                          ? "bg-gray-50 cursor-not-allowed opacity-60"
                          : "hover:bg-teal-50/50 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected || isInGroup}
                        disabled={isInGroup}
                        onChange={(e) => {
                          if (isInGroup) return;
                          setSelectedMemberIds(
                            e.target.checked
                              ? [...selectedMemberIds, m.id]
                              : selectedMemberIds.filter((id) => id !== m.id)
                          );
                        }}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {m.first_name} {m.last_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{m.email}</p>
                      </div>
                      {isInGroup ? (
                        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                          Already in group
                        </span>
                      ) : (
                        <StatusBadge status={m.member_profile?.status || (m.is_active ? "active" : "inactive")} />
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              {selectedMemberIds.length > 0 ? (
                <span><strong>{selectedMemberIds.length}</strong> member(s) selected</span>
              ) : (
                <span>Select members to add to this group</span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddMembers(false);
                  setSelectedMemberIds([]);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMembers}
                disabled={selectedMemberIds.length === 0 || adding}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}
              >
                <UserPlus className="h-4 w-4" />
                {adding ? "Adding..." : `Add ${selectedMemberIds.length || ""} Member${selectedMemberIds.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
