"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatusBadge, Pagination, SearchInput,
  Modal, ConfirmDialog, FormField, Input, Select, Textarea,
  Tabs, EmptyState, LoadingSpinner,
} from "@/components/ui/shared";
import {
  Megaphone, Send, Bell, FileText, BarChart3, Plus, Trash2,
  Copy, Eye, Edit,
} from "lucide-react";

interface Announcement { id: string; title: string; content?: string; priority?: string; status?: string; created_at?: string; published_at?: string; }
interface Campaign { id: string; name: string; subject?: string; status?: string; sent_count?: number; open_count?: number; created_at?: string; }
interface Survey { id: string; title: string; description?: string; status?: string; response_count?: number; created_at?: string; }
interface Template { id: string; name: string; subject?: string; body?: string; template_type?: string; created_at?: string; }
interface Notification { id: string; title: string; message?: string; is_read?: boolean; created_at?: string; type?: string; }

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }

export default function CommunicationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("announcements");

  // Announcements
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [showCreateAnn, setShowCreateAnn] = useState(false);
  const [annForm, setAnnForm] = useState({ title: "", content: "", priority: "normal" });

  // Campaigns
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campLoading, setCampLoading] = useState(true);
  const [showCreateCamp, setShowCreateCamp] = useState(false);
  const [campForm, setCampForm] = useState({ name: "", subject: "", html_body: "", from_name: "AssocHub", from_email: "noreply@assochub.com", target_all: true });

  // Surveys
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [survLoading, setSurvLoading] = useState(true);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tmplLoading, setTmplLoading] = useState(true);
  const [showCreateTmpl, setShowCreateTmpl] = useState(false);
  const [tmplForm, setTmplForm] = useState({ name: "", subject: "", body: "", template_type: "email" });

  // Notifications
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);

  // ── Loaders ───────────────────────────────────────────
  const loadAnns = useCallback(async () => {
    if (tab !== "announcements") return;
    setAnnLoading(true);
    try {
      const r = await apiFetch<Announcement[] | { items: Announcement[] }>("/api/v1/communications/announcements");
      setAnns(Array.isArray(r) ? r : (r as any).items || []);
    } catch (e: any) { toast.error("Failed to load announcements"); }
    finally { setAnnLoading(false); }
  }, [tab]);

  const loadCampaigns = useCallback(async () => {
    if (tab !== "campaigns") return;
    setCampLoading(true);
    try {
      const r = await apiFetch<Campaign[] | { items: Campaign[] }>("/api/v1/communications/campaigns");
      setCampaigns(Array.isArray(r) ? r : (r as any).items || []);
    } catch (e: any) { toast.error("Failed to load campaigns"); }
    finally { setCampLoading(false); }
  }, [tab]);

  const loadSurveys = useCallback(async () => {
    if (tab !== "surveys") return;
    setSurvLoading(true);
    try {
      const r = await apiFetch<Survey[] | { items: Survey[] }>("/api/v1/communications/surveys");
      setSurveys(Array.isArray(r) ? r : (r as any).items || []);
    } catch (e: any) { toast.error("Failed to load surveys"); }
    finally { setSurvLoading(false); }
  }, [tab]);

  const loadTemplates = useCallback(async () => {
    if (tab !== "templates") return;
    setTmplLoading(true);
    try {
      const r = await apiFetch<Template[] | { items: Template[] }>("/api/v1/communications/templates");
      setTemplates(Array.isArray(r) ? r : (r as any).items || []);
    } catch (e: any) { toast.error("Failed to load templates"); }
    finally { setTmplLoading(false); }
  }, [tab]);

  const loadNotifs = useCallback(async () => {
    if (tab !== "notifications") return;
    setNotifLoading(true);
    try {
      const r = await apiFetch<Notification[] | { items: Notification[] }>("/api/v1/communications/notifications");
      setNotifs(Array.isArray(r) ? r : (r as any).items || []);
    } catch (e: any) { toast.error("Failed to load notifications"); }
    finally { setNotifLoading(false); }
  }, [tab]);

  useEffect(() => { loadAnns(); }, [loadAnns]);
  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadSurveys(); }, [loadSurveys]);
  useEffect(() => { loadTemplates(); }, [loadTemplates]);
  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // ── CRUD ──────────────────────────────────────────────
  async function handleCreateAnn() {
    if (!annForm.title) { toast.warning("Title required"); return; }
    try {
      await apiFetch("/api/v1/communications/announcements", { method: "POST", body: JSON.stringify(annForm) });
      toast.success("Announcement created");
      setShowCreateAnn(false); setAnnForm({ title: "", content: "", priority: "normal" }); loadAnns();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handlePublishAnn(ann: Announcement) {
    try {
      await apiFetch(`/api/v1/communications/announcements/${ann.id}/publish`, { method: "POST" });
      toast.success("Announcement published"); loadAnns();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handleCreateCamp() {
    if (!campForm.name) { toast.warning("Name required"); return; }
    try {
      await apiFetch("/api/v1/communications/campaigns", { method: "POST", body: JSON.stringify(campForm) });
      toast.success("Campaign created");
      setShowCreateCamp(false); setCampForm({ name: "", subject: "", html_body: "", from_name: "AssocHub", from_email: "noreply@assochub.com", target_all: true }); loadCampaigns();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handleSendCamp(camp: Campaign) {
    try {
      await apiFetch(`/api/v1/communications/campaigns/${camp.id}/send`, { method: "POST" });
      toast.success("Campaign sent"); loadCampaigns();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handleDuplicateCamp(camp: Campaign) {
    try {
      await apiFetch(`/api/v1/communications/campaigns/${camp.id}/duplicate`, { method: "POST" });
      toast.success("Campaign duplicated"); loadCampaigns();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handleCreateTmpl() {
    if (!tmplForm.name) { toast.warning("Name required"); return; }
    try {
      await apiFetch("/api/v1/communications/templates", { method: "POST", body: JSON.stringify(tmplForm) });
      toast.success("Template created");
      setShowCreateTmpl(false); setTmplForm({ name: "", subject: "", body: "", template_type: "email" }); loadTemplates();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handleMarkAllRead() {
    try {
      await apiFetch("/api/v1/communications/notifications/read-all", { method: "POST" });
      toast.success("All notifications marked as read"); loadNotifs();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Communications" description="Announcements, campaigns, surveys and templates" />

      <Tabs
        tabs={[
          { key: "announcements", label: "Announcements" },
          { key: "campaigns", label: "Campaigns" },
          { key: "surveys", label: "Surveys" },
          { key: "templates", label: "Templates" },
          { key: "notifications", label: "Notifications" },
        ]}
        activeTab={tab} onChange={setTab}
      />

      {/* ── Announcements ─────────────────────────────── */}
      {tab === "announcements" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateAnn(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="h-4 w-4" /> New Announcement
            </button>
          </div>
          {annLoading ? <LoadingSpinner /> : anns.length === 0 ? (
            <EmptyState title="No announcements" description="Create your first announcement" />
          ) : (
            <div className="space-y-3">
              {anns.map((ann) => (
                <div key={ann.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{ann.title}</h3>
                      <StatusBadge status={ann.status || "draft"} />
                      <StatusBadge status={ann.priority || "normal"} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-2">{fmtDate(ann.created_at)}</p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    {ann.status === "draft" && (
                      <button onClick={() => handlePublishAnn(ann)} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Publish">
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Campaigns ─────────────────────────────────── */}
      {tab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateCamp(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="h-4 w-4" /> New Campaign
            </button>
          </div>
          {campLoading ? <LoadingSpinner /> : campaigns.length === 0 ? (
            <EmptyState title="No campaigns" />
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Subject</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Sent</th>
                    <th className="p-3 text-right">Opens</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 text-gray-500">{c.subject || "—"}</td>
                      <td className="p-3"><StatusBadge status={c.status || "draft"} /></td>
                      <td className="p-3 text-right">{c.sent_count || 0}</td>
                      <td className="p-3 text-right">{c.open_count || 0}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {c.status === "draft" && <button onClick={() => handleSendCamp(c)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Send className="h-4 w-4" /></button>}
                          <button onClick={() => handleDuplicateCamp(c)} className="p-1 hover:bg-gray-100 rounded"><Copy className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Surveys ───────────────────────────────────── */}
      {tab === "surveys" && (
        <div className="space-y-4">
          {survLoading ? <LoadingSpinner /> : surveys.length === 0 ? (
            <EmptyState title="No surveys" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {surveys.map((s) => (
                <div key={s.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{s.title}</h3>
                    <StatusBadge status={s.status || "draft"} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{s.description || "No description"}</p>
                  <p className="text-xs text-gray-400 mt-2">{s.response_count || 0} responses · {fmtDate(s.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Templates ─────────────────────────────────── */}
      {tab === "templates" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateTmpl(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="h-4 w-4" /> New Template
            </button>
          </div>
          {tmplLoading ? <LoadingSpinner /> : templates.length === 0 ? (
            <EmptyState title="No templates" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{t.name}</h3>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t.template_type}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Subject: {t.subject || "—"}</p>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{t.body?.slice(0, 100)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Notifications ─────────────────────────────── */}
      {tab === "notifications" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={handleMarkAllRead} className="text-sm text-blue-600 hover:underline">Mark all as read</button>
          </div>
          {notifLoading ? <LoadingSpinner /> : notifs.length === 0 ? (
            <EmptyState title="No notifications" />
          ) : (
            <div className="space-y-2">
              {notifs.map((n) => (
                <div key={n.id} className={`border rounded-lg p-4 ${n.is_read ? "bg-white" : "bg-blue-50 border-blue-200"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`text-sm ${n.is_read ? "" : "font-medium"}`}>{n.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{n.message}</p>
                    </div>
                    <span className="text-xs text-gray-400">{fmtDate(n.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────── */}
      <Modal open={showCreateAnn} onOpenChange={() => setShowCreateAnn(false)} title="New Announcement">
        <div className="space-y-4">
          <FormField label="Title" required><Input value={annForm.title} onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })} /></FormField>
          <FormField label="Content"><Textarea value={annForm.content} onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })} /></FormField>
          <FormField label="Priority">
            <Select value={annForm.priority} onChange={(v) => setAnnForm({ ...annForm, priority: v })} options={[
              { value: "low", label: "Low" }, { value: "normal", label: "Normal" },
              { value: "high", label: "High" }, { value: "urgent", label: "Urgent" },
            ]} />
          </FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateAnn(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={handleCreateAnn} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create</button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateCamp} onOpenChange={() => setShowCreateCamp(false)} title="New Campaign">
        <div className="space-y-4">
          <FormField label="Name" required><Input value={campForm.name} onChange={(e) => setCampForm({ ...campForm, name: e.target.value })} /></FormField>
          <FormField label="Subject"><Input value={campForm.subject} onChange={(e) => setCampForm({ ...campForm, subject: e.target.value })} /></FormField>
          <FormField label="Content"><Textarea value={campForm.html_body} onChange={(e) => setCampForm({ ...campForm, html_body: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateCamp(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={handleCreateCamp} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create</button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateTmpl} onOpenChange={() => setShowCreateTmpl(false)} title="New Template">
        <div className="space-y-4">
          <FormField label="Name" required><Input value={tmplForm.name} onChange={(e) => setTmplForm({ ...tmplForm, name: e.target.value })} /></FormField>
          <FormField label="Type">
            <Select value={tmplForm.template_type} onChange={(v) => setTmplForm({ ...tmplForm, template_type: v })} options={[
              { value: "email", label: "Email" }, { value: "sms", label: "SMS" },
              { value: "notification", label: "Notification" },
            ]} />
          </FormField>
          <FormField label="Subject"><Input value={tmplForm.subject} onChange={(e) => setTmplForm({ ...tmplForm, subject: e.target.value })} /></FormField>
          <FormField label="Body"><Textarea value={tmplForm.body} onChange={(e) => setTmplForm({ ...tmplForm, body: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateTmpl(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={handleCreateTmpl} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
