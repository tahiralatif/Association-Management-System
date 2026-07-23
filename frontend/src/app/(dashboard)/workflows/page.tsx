"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch, type PaginatedResponse, type Workflow, type WorkflowRun, type WorkflowTemplate, type WorkflowStats } from "@/lib/api";
import { PageHeader, StatusBadge, DataTable, Pagination, SearchInput, StatCard, Modal, ConfirmDialog, FormField, Input, Select, Textarea, Tabs, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { useToast } from "@/components/ui/toast";

export default function WorkflowsPage() {
  const toast = useToast();

  // ── List State ──
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Create Modal ──
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", trigger_type: "manual", steps: "[\n  {\n    \"type\": \"send_notification\",\n    \"config\": { \"template\": \"welcome\" }\n  }\n]" });

  // ── Detail State ──
  const [selected, setSelected] = useState<Workflow | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);

  // ── Templates ──
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "", description: "", category: "", trigger_type: "manual",
    steps: "[\n  {\n    \"type\": \"send_notification\",\n    \"config\": { \"template\": \"welcome\" }\n  }\n]",
  });
  const [templateCreating, setTemplateCreating] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState<WorkflowStats | null>(null);

  // ── Triggering ──
  const [triggering, setTriggering] = useState(false);

  // ── Delete ──
  const [deleteWorkflow, setDeleteWorkflow] = useState<Workflow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const perPage = 10;

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      if (tab !== "all") params.set("status", tab);
      const result = await apiFetch<PaginatedResponse<Workflow>>(`/api/v1/workflows/?${params}`);
      setWorkflows(result.items || []);
      setTotal(result.total || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load workflows";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, search, tab]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  useEffect(() => {
    apiFetch<WorkflowStats>("/api/v1/workflows/stats").then(setStats).catch(() => {});
  }, []);

  // ── Create Workflow ──
  async function handleCreate() {
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    let steps;
    try {
      steps = JSON.parse(form.steps);
      if (!Array.isArray(steps)) throw new Error("Steps must be a JSON array");
    } catch (e) {
      setFormError(`Invalid JSON in steps: ${e instanceof Error ? e.message : "parse error"}`);
      return;
    }
    try {
      setCreating(true);
      setFormError(null);
      await apiFetch("/api/v1/workflows/", {
        method: "POST",
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || undefined, trigger_type: form.trigger_type, steps }),
      });
      toast.success("Workflow created");
      setShowCreate(false);
      setForm({ name: "", description: "", trigger_type: "manual", steps: "[\n  {\n    \"type\": \"send_notification\",\n    \"config\": { \"template\": \"welcome\" }\n  }\n]" });
      loadWorkflows();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create workflow";
      toast.error(msg);
      setFormError(msg);
    } finally {
      setCreating(false);
    }
  }

  // ── Trigger Workflow ──
  async function handleTrigger() {
    if (!selected) return;
    try {
      setTriggering(true);
      await apiFetch(`/api/v1/workflows/${selected.id}/trigger`, { method: "POST" });
      toast.success("Workflow triggered");
      loadWorkflows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger workflow");
    } finally {
      setTriggering(false);
    }
  }

  // ── Pause / Resume ──
  async function handlePauseResume() {
    if (!selected) return;
    const newStatus = selected.status === "active" ? "paused" : "active";
    try {
      await apiFetch(`/api/v1/workflows/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Workflow ${newStatus === "paused" ? "paused" : "resumed"}`);
      setSelected({ ...selected, status: newStatus });
      loadWorkflows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update workflow");
    }
  }

  // ── Delete Workflow ──
  async function handleDelete() {
    if (!deleteWorkflow) return;
    try {
      setDeleting(true);
      await apiFetch(`/api/v1/workflows/${deleteWorkflow.id}`, { method: "DELETE" });
      toast.success("Workflow deleted");
      setDeleteWorkflow(null);
      loadWorkflows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete workflow");
    } finally {
      setDeleting(false);
    }
  }

  // ── Load Runs ──
  useEffect(() => {
    if (!selected) return;
    setRunsLoading(true);
    apiFetch<PaginatedResponse<WorkflowRun>>(`/api/v1/workflows/${selected.id}/runs`)
      .then((res) => setRuns(res.items || []))
      .catch(() => setRuns([]))
      .finally(() => setRunsLoading(false));
  }, [selected]);

  // ── Load Templates ──
  function loadTemplates() {
    setTemplatesLoading(true);
    apiFetch<PaginatedResponse<WorkflowTemplate>>("/api/v1/workflows/templates")
      .then((res) => setTemplates(res.items || []))
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }

  // ── Create Template ──
  async function handleCreateTemplate() {
    if (!templateForm.name.trim()) return;
    let steps;
    try {
      steps = JSON.parse(templateForm.steps);
    } catch {
      toast.warning("Invalid JSON in steps");
      return;
    }
    try {
      setTemplateCreating(true);
      await apiFetch("/api/v1/workflows/templates", {
        method: "POST",
        body: JSON.stringify({ name: templateForm.name.trim(), description: templateForm.description.trim() || undefined, category: templateForm.category.trim() || undefined, trigger_type: templateForm.trigger_type, steps }),
      });
      toast.success("Template created");
      setShowTemplateModal(false);
      setTemplateForm({ name: "", description: "", category: "", trigger_type: "manual", steps: "[\n  {\n    \"type\": \"send_notification\",\n    \"config\": { \"template\": \"welcome\" }\n  }\n]" });
      loadTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setTemplateCreating(false);
    }
  }

  const workflowTabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "paused", label: "Paused" },
    { key: "archived", label: "Archived" },
  ];

  const columns = [
    { key: "name", header: "Name", render: (row: Record<string, unknown>) => <span className="font-medium">{row.name as string}</span> },
    { key: "trigger_type", header: "Trigger", render: (row: Record<string, unknown>) => <span className="text-sm">{row.trigger_type as string}</span> },
    { key: "status", header: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={row.status as string} /> },
    { key: "total_runs", header: "Runs", render: (row: Record<string, unknown>) => <span className="text-sm">{(row.total_runs as number) || 0}</span> },
    {
      key: "success_rate",
      header: "Success Rate",
      render: (row: Record<string, unknown>) => {
        const total = (row.total_runs as number) || 0;
        const successful = (row.successful_runs as number) || 0;
        const rate = total ? Math.round((successful / total) * 100) : 0;
        return <span className="text-sm">{rate}%</span>;
      },
    },
    { key: "created_at", header: "Created", render: (row: Record<string, unknown>) => <span className="text-sm">{row.created_at ? new Date(row.created_at as string).toLocaleDateString() : "—"}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (row: Record<string, unknown>) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setSelected(row as unknown as Workflow)} className="text-sm text-primary hover:underline">View</button>
          <button onClick={() => setDeleteWorkflow(row as unknown as Workflow)} className="text-sm text-red-600 hover:underline ml-2">Delete</button>
        </div>
      ),
    },
  ];

  // ── Detail View ──
  if (selected) {
    const successRate = selected.total_runs ? Math.round((selected.successful_runs / selected.total_runs) * 100) : 0;
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelected(null); setSelectedRun(null); }} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Workflows
        </button>
        <PageHeader
          title={selected.name}
          description={selected.description}
          actions={
            <div className="flex gap-2">
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
              >
                {triggering ? "Triggering..." : "▶ Trigger"}
              </button>
              <button
                onClick={handlePauseResume}
                className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              >
                {selected.status === "active" ? "⏸ Pause" : "▶ Resume"}
              </button>
            </div>
          }
        />

        {/* Info Card */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selected.status} /></div>
            <div><span className="text-muted-foreground">Trigger:</span> {selected.trigger_type}</div>
            <div><span className="text-muted-foreground">Runs:</span> {selected.total_runs || 0}</div>
            <div><span className="text-muted-foreground">Success Rate:</span> {successRate}%</div>
            <div><span className="text-muted-foreground">Created:</span> {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : "—"}</div>
          </div>
        </div>

        {/* Steps Visualization */}
        {selected.steps && selected.steps.length > 0 && (
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">Steps</h3>
            <div className="space-y-2">
              {selected.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="font-medium">{step.type}</span>
                  <span className="text-muted-foreground">—</span>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{JSON.stringify(step.config)}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs: Runs / Templates */}
        <Tabs
          tabs={[
            { key: "runs", label: "Runs", count: runs.length },
            { key: "templates", label: "Templates" },
          ]}
          activeTab={selectedRun ? "runs" : "runs"}
          onChange={(k) => {
            if (k === "templates") loadTemplates();
          }}
        />

        {runsLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Runs List */}
            {!selectedRun && (
              <>
                {runs.length === 0 ? (
                  <EmptyState icon="🏃" title="No runs yet" description="Trigger the workflow to start a run." />
                ) : (
                  <DataTable
                    columns={[
                      { key: "status", header: "Status", render: (row: Record<string, unknown>) => <StatusBadge status={row.status as string} /> },
                      { key: "current_step", header: "Current Step", render: (row: Record<string, unknown>) => <span className="text-sm">Step {row.current_step as number} / {row.total_steps as number}</span> },
                      { key: "started_at", header: "Started", render: (row: Record<string, unknown>) => <span className="text-sm">{row.started_at ? new Date(row.started_at as string).toLocaleString() : "—"}</span> },
                      { key: "completed_at", header: "Completed", render: (row: Record<string, unknown>) => <span className="text-sm">{row.completed_at ? new Date(row.completed_at as string).toLocaleString() : "—"}</span> },
                      { key: "error_message", header: "Error", render: (row: Record<string, unknown>) => row.error_message ? <span className="text-xs text-red-500 truncate max-w-[200px] block">{row.error_message as string}</span> : "—" },
                      { key: "id", header: "Detail", render: (row: Record<string, unknown>) => (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedRun(row as unknown as WorkflowRun); }} className="text-xs text-primary hover:underline">View</button>
                      )},
                    ]}
                    data={runs as unknown as Record<string, unknown>[]}
                    emptyMessage="No runs"
                    onRowClick={(row) => setSelectedRun(row as unknown as WorkflowRun)}
                  />
                )}
              </>
            )}

            {/* Run Detail */}
            {selectedRun && (
              <div className="space-y-4">
                <button onClick={() => setSelectedRun(null)} className="text-sm text-muted-foreground hover:text-foreground">← Back to runs</button>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <h3 className="font-medium mb-2">Run Detail</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedRun.status} /></div>
                    <div><span className="text-muted-foreground">Step:</span> {selectedRun.current_step} / {selectedRun.total_steps}</div>
                    <div><span className="text-muted-foreground">Started:</span> {selectedRun.started_at ? new Date(selectedRun.started_at).toLocaleString() : "—"}</div>
                    <div><span className="text-muted-foreground">Completed:</span> {selectedRun.completed_at ? new Date(selectedRun.completed_at).toLocaleString() : "—"}</div>
                  </div>
                  {selectedRun.error_message && (
                    <div className="mt-3 rounded bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                      {selectedRun.error_message}
                    </div>
                  )}
                  {selectedRun.trigger_data && (
                    <div className="mt-3">
                      <span className="text-sm text-muted-foreground">Trigger Data:</span>
                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(selectedRun.trigger_data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Templates Tab Content */}
        {templatesLoading && <LoadingSpinner />}
        {!templatesLoading && templates.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="text-sm text-primary hover:underline"
              >
                + New Template
              </button>
            </div>
            {templates.map((t) => (
              <div key={t.id} className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{t.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{t.trigger_type}</span>
                  {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{t.category || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Automated workflows and processes"
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
          >
            + New Workflow
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Workflows" value={stats?.total_workflows ?? workflows.length} icon="⚙️" />
        <StatCard label="Active" value={stats?.active_workflows ?? 0} icon="✅" />
        <StatCard label="Total Runs" value={stats?.total_runs ?? 0} icon="🏃" />
        <StatCard label="Success Rate" value={`${stats?.success_rate ?? 0}%`} icon="📊" />
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <Tabs tabs={workflowTabs} activeTab={tab} onChange={(k) => { setTab(k); setPage(1); }} />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search workflows..." />
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <DataTable
          columns={columns}
          data={workflows as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage="No workflows found"
          onRowClick={(row) => setSelected(row as unknown as Workflow)}
        />
      )}

      <Pagination page={page} total={total} perPage={perPage} onChange={setPage} />

      {/* Create Modal */}
      <Modal open={showCreate} onOpenChange={setShowCreate} title="Create Workflow" maxWidth="max-w-xl">
        <div className="space-y-4">
          {formError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{formError}</div>
          )}
          <FormField label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Workflow name" />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} />
          </FormField>
          <FormField label="Trigger Type">
            <Select
              value={form.trigger_type}
              onChange={(v) => setForm({ ...form, trigger_type: v })}
              options={[
                { value: "member_joined", label: "Member Joined" },
                { value: "payment_received", label: "Payment Received" },
                { value: "event_registration", label: "Event Registration" },
                { value: "form_subscribed", label: "Form Subscribed" },
                { value: "manual", label: "Manual" },
                { value: "schedule", label: "Schedule" },
              ]}
            />
          </FormField>
          <FormField label="Steps (JSON)">
            <Textarea
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              rows={6}
              placeholder='[{"type": "send_notification", "config": {"template": "welcome"}}]'
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">JSON array of step objects with type and config</p>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted" disabled={creating}>Cancel</button>
            <button onClick={handleCreate} disabled={creating || !form.name.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50">
              {creating ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Template Create Modal */}
      <Modal open={showTemplateModal} onOpenChange={setShowTemplateModal} title="Create Template" maxWidth="max-w-xl">
        <div className="space-y-4">
          <FormField label="Name" required>
            <Input value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Template name" />
          </FormField>
          <FormField label="Description">
            <Textarea value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} rows={2} placeholder="Optional description" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <Input value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })} placeholder="e.g. onboarding" />
            </FormField>
            <FormField label="Trigger Type">
              <Select
                value={templateForm.trigger_type}
                onChange={(v) => setTemplateForm({ ...templateForm, trigger_type: v })}
                options={[
                  { value: "member_joined", label: "Member Joined" },
                  { value: "payment_received", label: "Payment Received" },
                  { value: "event_registration", label: "Event Registration" },
                  { value: "form_subscribed", label: "Form Subscribed" },
                  { value: "manual", label: "Manual" },
                  { value: "schedule", label: "Schedule" },
                ]}
              />
            </FormField>
          </div>
          <FormField label="Steps (JSON)">
            <Textarea
              value={templateForm.steps}
              onChange={(e) => setTemplateForm({ ...templateForm, steps: e.target.value })}
              rows={6}
              className="font-mono text-xs"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted" disabled={templateCreating}>Cancel</button>
            <button onClick={handleCreateTemplate} disabled={templateCreating || !templateForm.name.trim()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50">
              {templateCreating ? "Creating..." : "Create Template"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteWorkflow}
        onOpenChange={(v) => !v && setDeleteWorkflow(null)}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${deleteWorkflow?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
