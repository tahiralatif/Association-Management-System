"use client";

import { useEffect, useState, useCallback } from "react";
import {
  apiFetch,
  type Election,
  type ElectionPosition,
  type ElectionNomination,
  type ElectionResult,
  type ElectionStats,
  type PaginatedResponse,
} from "@/lib/api";
import {
  PageHeader,
  StatusBadge,
  DataTable,
  Pagination,
  SearchInput,
  StatCard,
  Modal,
  ConfirmDialog,
  FormField,
  Input,
  Select,
  Textarea,
  Tabs,
  EmptyState,
  LoadingSpinner,
} from "@/components/ui/shared";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// ── Election Form ───────────────────────────────────────────

function ElectionForm({
  initial,
  onSubmit,
  loading,
  onCancel,
}: {
  initial?: Partial<Election>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    election_type: initial?.election_type || "board",
    seats_available: initial?.seats_available?.toString() || "",
    quorum_percentage: initial?.quorum_percentage?.toString() || "",
    secret_ballot: initial?.secret_ballot ?? true,
    nominations_open: initial?.nominations_open ? initial.nominations_open.slice(0, 16) : "",
    nominations_close: initial?.nominations_close ? initial.nominations_close.slice(0, 16) : "",
    voting_start: initial?.voting_start ? initial.voting_start.slice(0, 16) : "",
    voting_end: initial?.voting_end ? initial.voting_end.slice(0, 16) : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (form.seats_available && (parseInt(form.seats_available) < 1)) errs.seats_available = "Must be at least 1";
    if (form.quorum_percentage && (parseFloat(form.quorum_percentage) < 0 || parseFloat(form.quorum_percentage) > 100)) errs.quorum_percentage = "Must be 0-100";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      election_type: form.election_type,
      seats_available: form.seats_available ? parseInt(form.seats_available) : undefined,
      quorum_percentage: form.quorum_percentage ? parseFloat(form.quorum_percentage) : undefined,
      secret_ballot: form.secret_ballot,
      nominations_open: form.nominations_open || undefined,
      nominations_close: form.nominations_close || undefined,
      voting_start: form.voting_start || undefined,
      voting_end: form.voting_end || undefined,
    });
  }

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Title" required error={errors.title}>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Election title" />
      </FormField>
      <FormField label="Description">
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Election description" />
      </FormField>
      <FormField label="Election Type">
        <Select value={form.election_type} onChange={(v) => set("election_type", v)} options={[{ value: "board", label: "Board" }, { value: "officer", label: "Officer" }, { value: "committee", label: "Committee" }, { value: "general", label: "General" }]} />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Seats Available" error={errors.seats_available}>
          <Input type="number" value={form.seats_available} onChange={(e) => set("seats_available", e.target.value)} min={1} />
        </FormField>
        <FormField label="Quorum %" error={errors.quorum_percentage}>
          <Input type="number" value={form.quorum_percentage} onChange={(e) => set("quorum_percentage", e.target.value)} min={0} max={100} />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="secret_ballot" checked={form.secret_ballot} onChange={(e) => set("secret_ballot", e.target.checked)} className="rounded" />
        <label htmlFor="secret_ballot" className="text-sm font-medium">Secret Ballot</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nominations Open">
          <Input type="datetime-local" value={form.nominations_open} onChange={(e) => set("nominations_open", e.target.value)} />
        </FormField>
        <FormField label="Nominations Close">
          <Input type="datetime-local" value={form.nominations_close} onChange={(e) => set("nominations_close", e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Voting Start">
          <Input type="datetime-local" value={form.voting_start} onChange={(e) => set("voting_start", e.target.value)} />
        </FormField>
        <FormField label="Voting End">
          <Input type="datetime-local" value={form.voting_end} onChange={(e) => set("voting_end", e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted" disabled={loading}>Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? "Saving..." : initial?.id ? "Update" : "Create Election"}
        </button>
      </div>
    </form>
  );
}

// ── Election Detail ─────────────────────────────────────────

function ElectionDetail({
  election,
  onBack,
  onUpdate,
}: {
  election: Election;
  onBack: () => void;
  onUpdate: () => void;
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("positions");
  const [positions, setPositions] = useState<ElectionPosition[]>([]);
  const [nominations, setNominations] = useState<ElectionNomination[]>([]);
  const [results, setResults] = useState<ElectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ElectionStats | null>(null);

  // Position form
  const [posForm, setPosForm] = useState({ title: "", description: "", seats: "1" });
  const [showPosForm, setShowPosForm] = useState(false);
  const [posLoading, setPosLoading] = useState(false);

  // Vote form
  const [votes, setVotes] = useState<Record<string, string>>({});

  const loadTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const eid = election.id;
      if (activeTab === "positions") {
        const res = await apiFetch<PaginatedResponse<ElectionPosition>>(`/api/v1/elections/${eid}/positions`);
        setPositions(res.items || []);
      } else if (activeTab === "nominations") {
        const res = await apiFetch<PaginatedResponse<ElectionNomination>>(`/api/v1/elections/${eid}/nominations`);
        setNominations(res.items || []);
      } else if (activeTab === "voting" || activeTab === "results") {
        const res = await apiFetch<{ results: ElectionResult[] }>(`/api/v1/elections/${eid}/results`);
        setResults(res.results || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeTab, election.id]);

  const loadStats = useCallback(async () => {
    try {
      const s = await apiFetch<ElectionStats>(`/api/v1/elections/${election.id}/stats`);
      setStats(s);
    } catch { /* ignore */ }
  }, [election.id]);

  useEffect(() => { loadTab(); }, [loadTab]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Position CRUD ──

  async function addPosition() {
    if (!posForm.title.trim()) return;
    setPosLoading(true);
    try {
      await apiFetch(`/api/v1/elections/${election.id}/positions`, {
        method: "POST",
        body: JSON.stringify({
          title: posForm.title.trim(),
          description: posForm.description.trim() || undefined,
          seats: parseInt(posForm.seats) || 1,
        }),
      });
      toast.success("Position added");
      setPosForm({ title: "", description: "", seats: "1" });
      setShowPosForm(false);
      loadTab();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add position");
    } finally {
      setPosLoading(false);
    }
  }

  // ── Nomination Actions ──

  async function acceptNomination(nom: ElectionNomination) {
    try {
      await apiFetch(`/api/v1/elections/${election.id}/nominations/${nom.id}/accept`, { method: "POST" });
      toast.success("Nomination accepted");
      loadTab();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept nomination");
    }
  }

  async function declineNomination(nom: ElectionNomination) {
    try {
      await apiFetch(`/api/v1/elections/${election.id}/nominations/${nom.id}/decline`, { method: "POST" });
      toast.success("Nomination declined");
      loadTab();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline nomination");
    }
  }

  // ── Vote Submission ──

  async function submitVotes() {
    const votePayload = Object.entries(votes)
      .filter(([, candidateId]) => candidateId)
      .map(([positionId, candidateIds]) => ({
        position_id: positionId,
        candidate_ids: [candidateIds],
      }));
    if (votePayload.length === 0) {
      toast.warning("Please select at least one candidate");
      return;
    }
    try {
      await apiFetch(`/api/v1/elections/${election.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ votes: votePayload }),
      });
      toast.success("Votes submitted!");
      setActiveTab("results");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit votes");
    }
  }

  // ── Status Workflow ──

  async function statusAction(action: string) {
    try {
      await apiFetch(`/api/v1/elections/${election.id}/${action}`, { method: "POST" });
      toast.success(`Workflow: ${action}`);
      onUpdate();
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed: ${action}`);
    }
  }

  const tabs = [
    { key: "positions", label: "Positions" },
    { key: "nominations", label: "Nominations" },
    ...(election.status === "voting" || election.status === "active" ? [{ key: "voting", label: "Vote" }] : []),
    { key: "results", label: "Results" },
  ];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        ← Back to Elections
      </button>

      {/* Election Info Card */}
      <div className="rounded-lg border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{election.title}</h2>
            <p className="text-muted-foreground mt-1">{election.description || "No description"}</p>
          </div>
          <StatusBadge status={election.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{election.election_type}</span></div>
          <div><span className="text-muted-foreground">Seats:</span> {election.seats_available}</div>
          <div><span className="text-muted-foreground">Quorum:</span> {election.quorum_percentage}%</div>
          <div><span className="text-muted-foreground">Secret Ballot:</span> {election.secret_ballot ? "Yes" : "No"}</div>
          <div><span className="text-muted-foreground">Nominations:</span> {election.nominations_open ? new Date(election.nominations_open).toLocaleDateString() : "—"} → {election.nominations_close ? new Date(election.nominations_close).toLocaleDateString() : "—"}</div>
          <div><span className="text-muted-foreground">Voting:</span> {election.voting_start ? new Date(election.voting_start).toLocaleDateString() : "—"} → {election.voting_end ? new Date(election.voting_end).toLocaleDateString() : "—"}</div>
          <div><span className="text-muted-foreground">Total Votes:</span> {election.total_votes ?? stats?.total_votes_cast ?? 0}</div>
        </div>
      </div>

      {/* Status Workflow Buttons */}
      <div className="flex flex-wrap gap-2">
        {election.status === "draft" && (
          <button onClick={() => statusAction("open-nominations")} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            Open Nominations
          </button>
        )}
        {election.status === "nominations_open" && (
          <button onClick={() => statusAction("start-voting")} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
            Start Voting
          </button>
        )}
        {(election.status === "voting" || election.status === "active") && (
          <button onClick={() => statusAction("close")} className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700">
            Close Election
          </button>
        )}
        {election.status === "closed" && (
          <button onClick={() => statusAction("publish-results")} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            Publish Results
          </button>
        )}
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>}

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {/* Positions Tab */}
          {activeTab === "positions" && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Positions ({positions.length})</h3>
                <button onClick={() => setShowPosForm(!showPosForm)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90">
                  {showPosForm ? "Cancel" : "+ Add Position"}
                </button>
              </div>
              {showPosForm && (
                <div className="rounded-lg border p-4 space-y-3">
                  <FormField label="Title" required>
                    <Input value={posForm.title} onChange={(e) => setPosForm((f) => ({ ...f, title: e.target.value }))} placeholder="Position title (e.g. President)" />
                  </FormField>
                  <FormField label="Description">
                    <Textarea value={posForm.description} onChange={(e) => setPosForm((f) => ({ ...f, description: e.target.value }))} placeholder="Position description" />
                  </FormField>
                  <FormField label="Seats">
                    <Input type="number" value={posForm.seats} onChange={(e) => setPosForm((f) => ({ ...f, seats: e.target.value }))} min={1} />
                  </FormField>
                  <button onClick={addPosition} disabled={posLoading || !posForm.title.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50">
                    {posLoading ? "Saving..." : "Add Position"}
                  </button>
                </div>
              )}
              {positions.length === 0 ? (
                <EmptyState title="No positions" description="Add positions for this election" />
              ) : (
                <div className="space-y-2">
                  {positions.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium">{p.title}</div>
                        {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                      </div>
                      <span className="text-sm text-muted-foreground">{p.seats} seat{p.seats !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Nominations Tab */}
          {activeTab === "nominations" && (
            <>
              {nominations.length === 0 ? (
                <EmptyState title="No nominations" description="Nominations will appear here" />
              ) : (
                <div className="space-y-2">
                  {nominations.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{n.member_name || "Unknown Member"}</div>
                          <div className="text-sm text-muted-foreground">Position: {n.position_title || "—"}</div>
                          {n.statement && <p className="text-sm mt-1">{n.statement}</p>}
                          {n.nominated_at && <div className="text-xs text-muted-foreground mt-1">Nominated: {new Date(n.nominated_at).toLocaleDateString()}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={n.status} />
                          {n.status === "pending" && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => acceptNomination(n)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Accept</button>
                              <button onClick={() => declineNomination(n)} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Decline</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Voting Tab */}
          {activeTab === "voting" && (
            <>
              <div className="rounded-lg border p-4">
                <h3 className="font-medium mb-4">Cast Your Vote</h3>
                {results.length === 0 && positions.length === 0 ? (
                  <EmptyState title="No positions available" description="Positions and accepted nominations are needed for voting" />
                ) : (
                  <div className="space-y-4">
                    {results.length > 0 ? results.map((r) => (
                      <div key={r.position_id} className="space-y-2">
                        <div className="font-medium text-sm">{r.position_title}</div>
                        {r.all_candidates.map((c) => (
                          <label key={c.member_id} className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 cursor-pointer">
                            <input
                              type="radio"
                              name={`vote_${r.position_id}`}
                              value={c.member_id}
                              checked={votes[r.position_id] === c.member_id}
                              onChange={() => setVotes((v) => ({ ...v, [r.position_id]: c.member_id }))}
                              className="rounded"
                            />
                            <span className="text-sm">{c.member_name}</span>
                          </label>
                        ))}
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No positions with accepted candidates available for voting.</p>
                    )}
                    {results.length > 0 && (
                      <button onClick={submitVotes} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                        Submit Vote
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Results Tab */}
          {activeTab === "results" && (
            <>
              {results.length === 0 ? (
                <EmptyState title="No results yet" description="Results will appear after voting closes" />
              ) : (
                <div className="space-y-4">
                  {results.map((r) => (
                    <div key={r.position_id} className="rounded-lg border p-4">
                      <h4 className="font-medium mb-3">{r.position_title}</h4>
                      <div className="space-y-2">
                        {r.all_candidates.map((c) => {
                          const maxVotes = Math.max(...r.all_candidates.map((x) => x.votes), 1);
                          const isWinner = r.winners.some((w) => w.member_id === c.member_id);
                          return (
                            <div key={c.member_id} className={cn("p-2 rounded", isWinner && "bg-green-50 border border-green-200")}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {c.member_name}
                                  {isWinner && <span className="ml-2 text-xs text-green-600 font-semibold">★ WINNER</span>}
                                </span>
                                <span className="text-sm text-muted-foreground">{c.votes} vote{c.votes !== 1 ? "s" : ""}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                                <div
                                  className={cn("h-1.5 rounded-full", isWinner ? "bg-green-500" : "bg-primary")}
                                  style={{ width: `${maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Elections Page ─────────────────────────────────────

export default function ElectionsPage() {
  const toast = useToast();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editElection, setEditElection] = useState<Election | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteElection, setDeleteElection] = useState<Election | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailElection, setDetailElection] = useState<Election | null>(null);

  const [stats, setStats] = useState<ElectionStats | null>(null);

  const loadElections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      if (tab !== "all") params.set("status", tab);
      const result = await apiFetch<PaginatedResponse<Election>>(`/api/v1/elections/?${params.toString()}`);
      setElections(result.items || []);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load elections";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  const loadStats = useCallback(async () => {
    try {
      const s = await apiFetch<ElectionStats>("/api/v1/elections/stats");
      setStats(s);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadElections(); }, [loadElections]);
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { setPage(1); }, [search, tab]);

  async function handleCreate(data: Record<string, unknown>) {
    setCreateLoading(true);
    try {
      await apiFetch("/api/v1/elections/", { method: "POST", body: JSON.stringify(data) });
      toast.success("Election created");
      setShowCreate(false);
      loadElections();
      loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create election");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleUpdate(data: Record<string, unknown>) {
    if (!editElection) return;
    setEditLoading(true);
    try {
      await apiFetch(`/api/v1/elections/${editElection.id}`, { method: "PATCH", body: JSON.stringify(data) });
      toast.success("Election updated");
      setEditElection(null);
      loadElections();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update election");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteElection) return;
    setDeleteLoading(true);
    try {
      await apiFetch(`/api/v1/elections/${deleteElection.id}`, { method: "DELETE" });
      toast.success("Election deleted");
      setDeleteElection(null);
      loadElections();
      loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete election");
    } finally {
      setDeleteLoading(false);
    }
  }

  if (detailElection) {
    return (
      <div>
        <ElectionDetail election={detailElection} onBack={() => { setDetailElection(null); loadElections(); }} onUpdate={loadElections} />
      </div>
    );
  }

  const electionTabs = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  const filtered = elections.filter((e) => {
    if (!search) return true;
    return e.title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Elections"
        description="Manage elections, nominations, and voting"
        actions={
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            + New Election
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Elections" value={stats.total_elections} icon="🗳️" />
          <StatCard label="Active" value={stats.active_elections} icon="⏳" />
          <StatCard label="Total Votes Cast" value={stats.total_votes_cast} icon="✅" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={setSearch} placeholder="Search elections..." />
        </div>
        <Tabs tabs={electionTabs} activeTab={tab} onChange={setTab} />
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{error}</div>}

      <DataTable
        columns={[
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{(r as unknown as Election).title}</span> },
          { key: "election_type", header: "Type", render: (r) => <span className="capitalize">{(r as unknown as Election).election_type}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={(r as unknown as Election).status} /> },
          { key: "seats_available", header: "Seats", render: (r) => (r as unknown as Election).seats_available },
          { key: "total_votes", header: "Votes", render: (r) => (r as unknown as Election).total_votes ?? 0 },
          { key: "voting_start", header: "Start", render: (r) => (r as unknown as Election).voting_start ? new Date((r as unknown as Election).voting_start!).toLocaleDateString() : "—" },
          { key: "voting_end", header: "End", render: (r) => (r as unknown as Election).voting_end ? new Date((r as unknown as Election).voting_end!).toLocaleDateString() : "—" },
          {
            key: "actions",
            header: "Actions",
            className: "text-right",
            render: (r) => {
              const el = r as unknown as Election;
              return (
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setEditElection(el)} className="px-2 py-1 text-xs border rounded hover:bg-muted">Edit</button>
                  <button onClick={() => setDeleteElection(el)} className="px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50">Delete</button>
                </div>
              );
            },
          },
        ]}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage="No elections found"
        onRowClick={(r) => setDetailElection(r as unknown as Election)}
      />

      <Pagination page={page} total={total} perPage={perPage} onChange={setPage} />

      {/* Create Modal */}
      <Modal open={showCreate} onOpenChange={setShowCreate} title="Create Election" maxWidth="max-w-xl">
        <ElectionForm onSubmit={handleCreate} loading={createLoading} onCancel={() => setShowCreate(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editElection} onOpenChange={(v) => !v && setEditElection(null)} title="Edit Election" maxWidth="max-w-xl">
        {editElection && <ElectionForm initial={editElection} onSubmit={handleUpdate} loading={editLoading} onCancel={() => setEditElection(null)} />}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteElection}
        onOpenChange={(v) => !v && setDeleteElection(null)}
        title="Delete Election"
        description={`Are you sure you want to delete "${deleteElection?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
