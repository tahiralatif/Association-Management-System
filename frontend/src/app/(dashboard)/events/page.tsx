"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch, type PaginatedResponse } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatusBadge, Pagination, SearchInput, StatCard,
  Modal, ConfirmDialog, FormField, Input, Select, Textarea,
  Tabs, EmptyState, LoadingSpinner,
} from "@/components/ui/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar, Users, MapPin, Plus, Trash2, Edit, Eye,
  CheckCircle, XCircle, Send, Star,
} from "lucide-react";

interface Event {
  id: string; title: string; name?: string; description?: string;
  event_type?: string; start_date: string; end_date?: string;
  location?: string; capacity?: number; status?: string;
  registered_count?: number; created_at?: string;
}
interface Registration {
  id: string; member_id?: string; name?: string; email?: string;
  status?: string; checked_in?: boolean; registered_at?: string;
}
interface Session { id: string; title: string; speaker?: string; start_time?: string; end_time?: string; }
interface Speaker { id: string; name: string; title?: string; bio?: string; }
interface Ticket { id: string; name: string; price: number; quantity: number; sold?: number; }
interface Feedback { id: string; rating: number; comment?: string; member_name?: string; created_at?: string; }

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"; }
function fmtDateTime(d?: string) { return d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function EventsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("list");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [delEvent, setDelEvent] = useState<Event | null>(null);
  const [form, setForm] = useState({ title: "", description: "", event_type: "conference", start_date: "", end_date: "", location: "", capacity: "100" });

  const [detail, setDetail] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [detailTab, setDetailTab] = useState("info");

  // Speaker/Session forms
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({ name: "", title: "", bio: "" });
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", speaker: "", start_time: "", end_time: "" });

  // ── Load ──────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: "20" });
      if (search) params.set("search", search);
      const r = await apiFetch<PaginatedResponse<Event>>(`/api/v1/events/?${params}`);
      setEvents(r.items || []); setTotal(r.total || 0);
    } catch (e: any) { toast.error("Failed to load events"); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  async function loadDetail(ev: Event) {
    setDetail(ev);
    setDetailTab("info");
    try {
      const [regs, sess, spk, fb] = await Promise.allSettled([
        apiFetch<Registration[] | { items: Registration[] }>(`/api/v1/events/${ev.id}/registrations`),
        apiFetch<Session[] | { items: Session[] }>(`/api/v1/events/${ev.id}/sessions`),
        apiFetch<Speaker[] | { items: Speaker[] }>(`/api/v1/events/${ev.id}/speakers`),
        apiFetch<Feedback[] | { items: Feedback[] }>(`/api/v1/events/${ev.id}/feedback`),
      ]);
      if (regs.status === "fulfilled") { const v = regs.value; setRegistrations(Array.isArray(v) ? v : (v as any).items || []); }
      if (sess.status === "fulfilled") { const v = sess.value; setSessions(Array.isArray(v) ? v : (v as any).items || []); }
      if (spk.status === "fulfilled") { const v = spk.value; setSpeakers(Array.isArray(v) ? v : (v as any).items || []); }
      if (fb.status === "fulfilled") { const v = fb.value; setFeedbacks(Array.isArray(v) ? v : (v as any).items || []); }
    } catch {}
  }

  // ── CRUD ──────────────────────────────────────────────
  function resetForm() { setForm({ title: "", description: "", event_type: "conference", start_date: "", end_date: "", location: "", capacity: "100" }); }

  async function handleCreate() {
    if (!form.title || !form.start_date) { toast.warning("Title and start date required"); return; }
    try {
      await apiFetch("/api/v1/events/", {
        method: "POST",
        body: JSON.stringify({ name: form.title, description: form.description, event_type: form.event_type, start_date: form.start_date, end_date: form.end_date, venue_name: form.location, max_attendees: parseInt(form.capacity) || 100 }),
      });
      toast.success("Event created");
      setShowCreate(false); resetForm(); loadEvents();
    } catch (e: any) { toast.error(e.message || "Create failed"); }
  }

  async function handleUpdate() {
    if (!editEvent) return;
    try {
      await apiFetch(`/api/v1/events/${editEvent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity) || 100 }),
      });
      toast.success("Event updated");
      setEditEvent(null); resetForm(); loadEvents();
    } catch (e: any) { toast.error(e.message || "Update failed"); }
  }

  async function handleDelete() {
    if (!delEvent) return;
    try {
      await apiFetch(`/api/v1/events/${delEvent.id}`, { method: "DELETE" });
      toast.success("Event deleted"); setDelEvent(null); loadEvents();
    } catch (e: any) { toast.error(e.message || "Delete failed"); }
  }

  async function handlePublish(ev: Event) {
    try {
      await apiFetch(`/api/v1/events/${ev.id}/publish`, { method: "POST" });
      toast.success("Event published"); loadEvents();
    } catch (e: any) { toast.error(e.message || "Publish failed"); }
  }

  async function handleCancel(ev: Event) {
    try {
      await apiFetch(`/api/v1/events/${ev.id}/cancel`, { method: "POST" });
      toast.success("Event cancelled"); loadEvents();
    } catch (e: any) { toast.error(e.message || "Cancel failed"); }
  }

  async function handleCheckin(reg: Registration) {
    try {
      await apiFetch(`/api/v1/events/registrations/${reg.id}/checkin`, { method: "POST" });
      toast.success("Checked in"); if (detail) loadDetail(detail);
    } catch (e: any) { toast.error(e.message || "Check-in failed"); }
  }

  async function handleAddSpeaker() {
    if (!detail || !speakerForm.name) return;
    try {
      await apiFetch(`/api/v1/events/${detail.id}/speakers`, { method: "POST", body: JSON.stringify(speakerForm) });
      toast.success("Speaker added"); setShowAddSpeaker(false); setSpeakerForm({ name: "", title: "", bio: "" }); loadDetail(detail);
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  async function handleAddSession() {
    if (!detail || !sessionForm.title) return;
    try {
      await apiFetch(`/api/v1/events/${detail.id}/sessions`, { method: "POST", body: JSON.stringify(sessionForm) });
      toast.success("Session added"); setShowAddSession(false); setSessionForm({ title: "", speaker: "", start_time: "", end_time: "" }); loadDetail(detail);
    } catch (e: any) { toast.error(e.message || "Failed"); }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title="Events" description="Manage association events"
        actions={
          <button onClick={() => { resetForm(); setShowCreate(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="h-4 w-4" /> New Event
          </button>
        }
      />

      {/* List Tab */}
      {tab === "list" && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search events..." />
          </div>
          {loading ? <LoadingSpinner /> : events.length === 0 ? (
            <EmptyState title="No events" description="Create your first event" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((ev) => (
                  <Card key={ev.id} className="cursor-pointer hover:border-blue-300 transition" onClick={() => loadDetail(ev)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{ev.title || ev.name}</CardTitle>
                        <StatusBadge status={ev.status || "draft"} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-3.5 w-3.5" /> {fmtDate(ev.start_date)}
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin className="h-3.5 w-3.5" /> {ev.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-3.5 w-3.5" /> {ev.registered_count || 0}/{ev.capacity || "∞"} registered
                      </div>
                      <div className="flex gap-1 pt-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditEvent(ev); setForm({ title: ev.title || ev.name || "", description: ev.description || "", event_type: ev.event_type || "conference", start_date: ev.start_date, end_date: ev.end_date || "", location: ev.location || "", capacity: String(ev.capacity || 100) }); }}
                          className="p-1 hover:bg-gray-100 rounded"><Edit className="h-3.5 w-3.5" /></button>
                        {ev.status === "draft" && <button onClick={() => handlePublish(ev)} className="p-1 hover:bg-green-50 rounded text-green-600"><Send className="h-3.5 w-3.5" /></button>}
                        {ev.status !== "cancelled" && <button onClick={() => handleCancel(ev)} className="p-1 hover:bg-red-50 rounded text-red-500"><XCircle className="h-3.5 w-3.5" /></button>}
                        <button onClick={() => setDelEvent(ev)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Pagination page={page} total={total} perPage={20} onChange={setPage} />
            </>
          )}
        </div>
      )}

      {/* Detail Slide-over */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-semibold">{detail.title || detail.name}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              <StatusBadge status={detail.status || "draft"} />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Type:</span> {detail.event_type}</div>
                <div><span className="text-gray-500">Location:</span> {detail.location || "—"}</div>
                <div><span className="text-gray-500">Start:</span> {fmtDateTime(detail.start_date)}</div>
                <div><span className="text-gray-500">End:</span> {fmtDateTime(detail.end_date)}</div>
                <div><span className="text-gray-500">Capacity:</span> {detail.capacity || "∞"}</div>
                <div><span className="text-gray-500">Registered:</span> {detail.registered_count || registrations.length}</div>
              </div>
              {detail.description && <p className="text-sm text-gray-600">{detail.description}</p>}

              <Tabs tabs={[
                { key: "info", label: "Info" },
                { key: "registrations", label: `Registrations (${registrations.length})` },
                { key: "sessions", label: `Sessions (${sessions.length})` },
                { key: "speakers", label: `Speakers (${speakers.length})` },
                { key: "feedback", label: `Feedback (${feedbacks.length})` },
              ]} activeTab={detailTab} onChange={setDetailTab} />

              {detailTab === "registrations" && (
                <div className="space-y-2">
                  {registrations.length === 0 ? <p className="text-sm text-gray-400">No registrations yet</p> :
                    registrations.map((reg) => (
                      <div key={reg.id} className="flex justify-between items-center py-2 border-b text-sm">
                        <div>
                          <span className="font-medium">{reg.name || reg.member_id}</span>
                          {reg.email && <span className="text-gray-500 ml-2">{reg.email}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={reg.status || "confirmed"} />
                          {!reg.checked_in && (
                            <button onClick={() => handleCheckin(reg)} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Check In</button>
                          )}
                          {reg.checked_in && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {detailTab === "sessions" && (
                <div className="space-y-2">
                  <button onClick={() => setShowAddSession(true)} className="text-blue-600 text-sm hover:underline mb-2">+ Add Session</button>
                  {sessions.length === 0 ? <p className="text-sm text-gray-400">No sessions</p> :
                    sessions.map((s) => (
                      <div key={s.id} className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-gray-500">{s.speaker} · {fmtDateTime(s.start_time)} — {fmtDateTime(s.end_time)}</p>
                      </div>
                    ))
                  }
                </div>
              )}

              {detailTab === "speakers" && (
                <div className="space-y-2">
                  <button onClick={() => setShowAddSpeaker(true)} className="text-blue-600 text-sm hover:underline mb-2">+ Add Speaker</button>
                  {speakers.length === 0 ? <p className="text-sm text-gray-400">No speakers</p> :
                    speakers.map((sp) => (
                      <div key={sp.id} className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">{sp.name}</p>
                        <p className="text-xs text-gray-500">{sp.title}</p>
                        {sp.bio && <p className="text-xs text-gray-400 mt-1">{sp.bio}</p>}
                      </div>
                    ))
                  }
                </div>
              )}

              {detailTab === "feedback" && (
                <div className="space-y-2">
                  {feedbacks.length === 0 ? <p className="text-sm text-gray-400">No feedback yet</p> :
                    feedbacks.map((fb) => (
                      <div key={fb.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < fb.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                          ))}
                          <span className="text-xs text-gray-500 ml-2">{fb.member_name}</span>
                        </div>
                        {fb.comment && <p className="text-sm text-gray-600">{fb.comment}</p>}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={showCreate} onOpenChange={() => { setShowCreate(false); setEditEvent(null); }} title={editEvent ? "Edit Event" : "New Event"}>
        <div className="space-y-4">
          <FormField label="Title" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField>
          <FormField label="Type">
            <Select value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} options={[
              { value: "conference", label: "Conference" }, { value: "workshop", label: "Workshop" },
              { value: "networking", label: "Networking" }, { value: "webinar", label: "Webinar" },
              { value: "social", label: "Social" }, { value: "other", label: "Other" },
            ]} />
          </FormField>
          <FormField label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date" required><Input value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} type="datetime-local" /></FormField>
            <FormField label="End Date"><Input value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} type="datetime-local" /></FormField>
          </div>
          <FormField label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></FormField>
          <FormField label="Capacity"><Input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} type="number" /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowCreate(false); setEditEvent(null); }} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={editEvent ? handleUpdate : handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {editEvent ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showAddSpeaker} onOpenChange={(v) => setShowAddSpeaker(v)} title="Add Speaker">
        <div className="space-y-4">
          <FormField label="Name" required><Input value={speakerForm.name} onChange={(e) => setSpeakerForm({ ...speakerForm, name: e.target.value })} /></FormField>
          <FormField label="Title"><Input value={speakerForm.title} onChange={(e) => setSpeakerForm({ ...speakerForm, title: e.target.value })} /></FormField>
          <FormField label="Bio"><Textarea value={speakerForm.bio} onChange={(e) => setSpeakerForm({ ...speakerForm, bio: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddSpeaker(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={handleAddSpeaker} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add</button>
          </div>
        </div>
      </Modal>

      <Modal open={showAddSession} onOpenChange={(v) => setShowAddSession(v)} title="Add Session">
        <div className="space-y-4">
          <FormField label="Title" required><Input value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} /></FormField>
          <FormField label="Speaker"><Input value={sessionForm.speaker} onChange={(e) => setSessionForm({ ...sessionForm, speaker: e.target.value })} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start"><Input value={sessionForm.start_time} onChange={(e) => setSessionForm({ ...sessionForm, start_time: e.target.value })} type="datetime-local" /></FormField>
            <FormField label="End"><Input value={sessionForm.end_time} onChange={(e) => setSessionForm({ ...sessionForm, end_time: e.target.value })} type="datetime-local" /></FormField>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddSession(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button onClick={handleAddSession} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delEvent} onOpenChange={(v) => { if (!v) setDelEvent(null); }} onConfirm={handleDelete}
        title="Delete Event" description={`Delete "${delEvent?.title || delEvent?.name}"?`} />
    </div>
  );
}
