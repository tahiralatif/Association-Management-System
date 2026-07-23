"use client";

import { useEffect, useState, useCallback } from "react";
import {
  apiFetch,
  type Integration,
  type Webhook,
  type WebhookLog,
  type IntegrationEvent,
  type IntegrationDashboard,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader,
  StatusBadge,
  DataTable,
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
import {
  Plug,
  Link2,
  Activity,
  Plus,
  RefreshCw,
  TestTube,
  RotateCw,
  Trash2,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  Send,
  ExternalLink,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";

type TabKey = "integrations" | "webhooks" | "events";

export default function IntegrationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("integrations");
  const [loading, setLoading] = useState(true);

  // ── Dashboard Stats ──
  const [dashStats, setDashStats] = useState<IntegrationDashboard | null>(null);

  // ── Integrations ──
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [intLoading, setIntLoading] = useState(false);
  const [showCreateInt, setShowCreateInt] = useState(false);
  const [intForm, setIntForm] = useState({
    name: "",
    integration_type: "custom",
    config: "{}",
  });
  const [intCreating, setIntCreating] = useState(false);
  const [deleteIntId, setDeleteIntId] = useState<string | null>(null);
  const [deletingInt, setDeletingInt] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedIntId, setExpandedIntId] = useState<string | null>(null);

  // ── Webhooks ──
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [whLoading, setWhLoading] = useState(false);
  const [showCreateWh, setShowCreateWh] = useState(false);
  const [whForm, setWhForm] = useState({
    name: "",
    url: "",
    events: "",
    retry_count: "3",
  });
  const [whCreating, setWhCreating] = useState(false);
  const [deleteWhId, setDeleteWhId] = useState<string | null>(null);
  const [deletingWh, setDeletingWh] = useState(false);
  const [testingWhId, setTestingWhId] = useState<string | null>(null);
  const [whLogs, setWhLogs] = useState<WebhookLog[]>([]);
  const [showWhLogs, setShowWhLogs] = useState(false);
  const [whLogsLoading, setWhLogsLoading] = useState(false);
  const [testWhEvent, setTestWhEvent] = useState("member.created");
  const [testWhPayload, setTestWhPayload] = useState("{}");
  const [showTestWhModal, setShowTestWhModal] = useState(false);
  const [testWhId, setTestWhId] = useState<string | null>(null);

  // ── Events ──
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [evLoading, setEvLoading] = useState(false);
  const [showEmitEvent, setShowEmitEvent] = useState(false);
  const [emitForm, setEmitForm] = useState({
    event_type: "member.created",
    payload: "{}",
  });
  const [emitting, setEmitting] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // ──────────────────────────── Data Loaders ────────────────────────────

  const loadDashboard = useCallback(() => {
    apiFetch<IntegrationDashboard>("/api/v1/integrations/dashboard")
      .then(setDashStats)
      .catch(() => {});
  }, []);

  const loadIntegrations = useCallback(() => {
    setIntLoading(true);
    apiFetch("/api/v1/integrations/")
      .then((data: unknown) => {
        const d = data as { items?: Integration[] } | Integration[];
        setIntegrations(Array.isArray(d) ? d : d.items || []);
      })
      .catch(() => {
        setIntegrations([]);
        toast.error("Failed to load integrations");
      })
      .finally(() => setIntLoading(false));
  }, [toast]);

  const loadWebhooks = useCallback(() => {
    setWhLoading(true);
    apiFetch("/api/v1/integrations/webhooks")
      .then((data: unknown) => {
        const d = data as { items?: Webhook[] } | Webhook[];
        setWebhooks(Array.isArray(d) ? d : d.items || []);
      })
      .catch(() => {
        setWebhooks([]);
        toast.error("Failed to load webhooks");
      })
      .finally(() => setWhLoading(false));
  }, [toast]);

  const loadEvents = useCallback(() => {
    setEvLoading(true);
    apiFetch("/api/v1/integrations/events")
      .then((data: unknown) => {
        const d = data as { items?: IntegrationEvent[] } | IntegrationEvent[];
        setEvents(Array.isArray(d) ? d : d.items || []);
      })
      .catch(() => {
        setEvents([]);
        toast.error("Failed to load events");
      })
      .finally(() => setEvLoading(false));
  }, [toast]);

  // ── Load dashboard on mount ──
  useEffect(() => {
    loadDashboard();
    setLoading(false);
  }, [loadDashboard]);

  // ── Load tab data ──
  useEffect(() => {
    if (tab === "integrations") loadIntegrations();
    if (tab === "webhooks") loadWebhooks();
    if (tab === "events") loadEvents();
  }, [tab, loadIntegrations, loadWebhooks, loadEvents]);

  // ──────────────────────────── Integration Handlers ────────────────────

  async function handleCreateIntegration() {
    if (!intForm.name.trim()) {
      toast.warning("Integration name is required");
      return;
    }
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(intForm.config);
    } catch {
      toast.warning("Invalid JSON in config field");
      return;
    }
    setIntCreating(true);
    try {
      await apiFetch("/api/v1/integrations/", {
        method: "POST",
        body: JSON.stringify({
          name: intForm.name.trim(),
          integration_type: intForm.integration_type,
          config,
        }),
      });
      toast.success("Integration created successfully");
      setShowCreateInt(false);
      setIntForm({ name: "", integration_type: "custom", config: "{}" });
      loadIntegrations();
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create integration");
    } finally {
      setIntCreating(false);
    }
  }

  async function handleTestConnection(id: string) {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>(
        `/api/v1/integrations/${id}/test`,
        { method: "POST" }
      );
      setTestResult({ id, success: res.success, message: res.message });
      if (res.success) {
        toast.success("Connection test passed");
      } else {
        toast.warning(`Connection test failed: ${res.message}`);
      }
    } catch (err) {
      setTestResult({
        id,
        success: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
      toast.error("Connection test failed");
    } finally {
      setTestingId(null);
    }
  }

  async function handleSync(id: string) {
    setSyncingId(id);
    try {
      await apiFetch(`/api/v1/integrations/${id}/sync`, { method: "POST" });
      toast.success("Sync started successfully");
      loadIntegrations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDeleteIntegration() {
    if (!deleteIntId) return;
    setDeletingInt(true);
    try {
      await apiFetch(`/api/v1/integrations/${deleteIntId}`, { method: "DELETE" });
      setIntegrations((prev) => prev.filter((i) => i.id !== deleteIntId));
      setDeleteIntId(null);
      toast.success("Integration deleted");
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete integration");
    } finally {
      setDeletingInt(false);
    }
  }

  async function handleUpdateIntegration(id: string, updates: Partial<Integration>) {
    try {
      await apiFetch(`/api/v1/integrations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
      );
      toast.success("Integration updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update integration");
    }
  }

  // ──────────────────────────── Webhook Handlers ────────────────────────

  async function handleCreateWebhook() {
    if (!whForm.name.trim() || !whForm.url.trim()) {
      toast.warning("Name and URL are required");
      return;
    }
    let retryCount: number;
    try {
      retryCount = parseInt(whForm.retry_count, 10);
      if (isNaN(retryCount) || retryCount < 1 || retryCount > 5) throw new Error();
    } catch {
      toast.warning("Retry count must be between 1 and 5");
      return;
    }
    setWhCreating(true);
    try {
      const events = whForm.events
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      await apiFetch("/api/v1/integrations/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: whForm.name.trim(),
          url: whForm.url.trim(),
          events,
          retry_count: retryCount,
        }),
      });
      toast.success("Webhook created successfully");
      setShowCreateWh(false);
      setWhForm({ name: "", url: "", events: "", retry_count: "3" });
      loadWebhooks();
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setWhCreating(false);
    }
  }

  async function handleTestWebhook() {
    if (!testWhId) return;
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(testWhPayload);
    } catch {
      toast.warning("Invalid JSON in payload");
      return;
    }
    setTestingWhId(testWhId);
    try {
      await apiFetch("/api/v1/integrations/webhooks/test", {
        method: "POST",
        body: JSON.stringify({
          webhook_id: testWhId,
          event_type: testWhEvent,
          payload,
        }),
      });
      toast.success("Test webhook sent successfully");
      setShowTestWhModal(false);
      setTestWhId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test webhook failed");
    } finally {
      setTestingWhId(null);
    }
  }

  async function handleViewLogs(id: string) {
    setWhLogsLoading(true);
    setShowWhLogs(true);
    setWhLogs([]);
    try {
      const res = await apiFetch(`/api/v1/integrations/webhooks/${id}/logs`);
      const d = res as { items?: WebhookLog[] } | WebhookLog[];
      setWhLogs(Array.isArray(d) ? d : d.items || []);
    } catch {
      toast.error("Failed to load webhook logs");
    } finally {
      setWhLogsLoading(false);
    }
  }

  async function handleDeleteWebhook() {
    if (!deleteWhId) return;
    setDeletingWh(true);
    try {
      await apiFetch(`/api/v1/integrations/webhooks/${deleteWhId}`, { method: "DELETE" });
      setWebhooks((prev) => prev.filter((w) => w.id !== deleteWhId));
      setDeleteWhId(null);
      toast.success("Webhook deleted");
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete webhook");
    } finally {
      setDeletingWh(false);
    }
  }

  async function handleToggleWebhook(webhook: Webhook) {
    try {
      await apiFetch(`/api/v1/integrations/webhooks/${webhook.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !webhook.is_active }),
      });
      setWebhooks((prev) =>
        prev.map((w) =>
          w.id === webhook.id ? { ...w, is_active: !w.is_active } : w
        )
      );
      toast.success(`Webhook ${webhook.is_active ? "deactivated" : "activated"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle webhook");
    }
  }

  // ──────────────────────────── Event Handlers ──────────────────────────

  async function handleEmitEvent() {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(emitForm.payload);
    } catch {
      toast.warning("Invalid JSON in payload");
      return;
    }
    setEmitting(true);
    try {
      await apiFetch("/api/v1/integrations/events", {
        method: "POST",
        body: JSON.stringify({
          event_type: emitForm.event_type,
          payload,
        }),
      });
      toast.success("Event emitted successfully");
      setShowEmitEvent(false);
      setEmitForm({ event_type: "member.created", payload: "{}" });
      loadEvents();
      loadDashboard();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to emit event");
    } finally {
      setEmitting(false);
    }
  }

  // ──────────────────────────── Helpers ─────────────────────────────────

  const eventTypeOptions = [
    { value: "member.created", label: "Member Created" },
    { value: "member.updated", label: "Member Updated" },
    { value: "member.deleted", label: "Member Deleted" },
    { value: "payment.received", label: "Payment Received" },
    { value: "payment.failed", label: "Payment Failed" },
    { value: "event.registration", label: "Event Registration" },
    { value: "event.cancelled", label: "Event Cancelled" },
    { value: "invoice.created", label: "Invoice Created" },
    { value: "invoice.paid", label: "Invoice Paid" },
    { value: "election.vote", label: "Election Vote" },
    { value: "document.uploaded", label: "Document Uploaded" },
  ];

  const integrationTypeOptions = [
    { value: "stripe", label: "Stripe (Payments)" },
    { value: "slack", label: "Slack (Messaging)" },
    { value: "google_calendar", label: "Google Calendar" },
    { value: "mailchimp", label: "Mailchimp (Email)" },
    { value: "salesforce", label: "Salesforce (CRM)" },
    { value: "quickbooks", label: "QuickBooks (Accounting)" },
    { value: "zapier", label: "Zapier" },
    { value: "webhook", label: "Generic Webhook" },
    { value: "custom", label: "Custom" },
  ];

  // ──────────────────────────── Render ──────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect third-party services, manage webhooks, and monitor events"
        actions={
          <button
            onClick={() => {
              loadDashboard();
              if (tab === "integrations") loadIntegrations();
              else if (tab === "webhooks") loadWebhooks();
              else loadEvents();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Integrations</p>
            <Plug className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold mt-1">
            {dashStats?.total_integrations ?? integrations.length}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active</p>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold mt-1">{dashStats?.active_integrations ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Webhooks</p>
            <Link2 className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold mt-1">
            {dashStats?.total_webhooks ?? webhooks.length}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Events Today</p>
            <Zap className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold mt-1">{dashStats?.events_today ?? 0}</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "integrations", label: "Integrations", count: integrations.length || undefined },
          { key: "webhooks", label: "Webhooks", count: webhooks.length || undefined },
          { key: "events", label: "Events", count: events.length || undefined },
        ]}
        activeTab={tab}
        onChange={(k) => setTab(k as TabKey)}
      />

      {/* ═══════════════════════════ INTEGRATIONS TAB ═══════════════════════════ */}

      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateInt(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Integration
            </button>
          </div>

          {/* Test Result Banner */}
          {testResult && (
            <div
              className={`rounded-lg border p-3 text-sm flex items-center gap-2 ${
                testResult.success
                  ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400"
                  : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="flex-1">{testResult.message}</span>
              <button
                onClick={() => setTestResult(null)}
                className="text-current opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          <DataTable
            columns={[
              {
                key: "name",
                header: "Name",
                render: (row: Record<string, unknown>) => (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{row.name as string}</span>
                    {row.webhook_url ? (
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    ) : null}
                  </div>
                ),
              },
              {
                key: "integration_type",
                header: "Type",
                render: (row: Record<string, unknown>) => (
                  <StatusBadge status={row.integration_type as string} />
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row: Record<string, unknown>) => (
                  <StatusBadge status={row.status as string} />
                ),
              },
              {
                key: "error_message",
                header: "Errors",
                render: (row: Record<string, unknown>) =>
                  row.error_message ? (
                    <span className="text-xs text-red-600 truncate max-w-[150px] block" title={row.error_message as string}>
                      {row.error_message as string}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  ),
              },
              {
                key: "last_sync_at",
                header: "Last Sync",
                render: (row: Record<string, unknown>) => (
                  <span className="text-sm">
                    {row.last_sync_at
                      ? new Date(row.last_sync_at as string).toLocaleString()
                      : "Never"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                render: (row: Record<string, unknown>) => (
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleTestConnection(row.id as string)}
                      disabled={testingId === row.id}
                      title="Test connection"
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {testingId === row.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSync(row.id as string)}
                      disabled={syncingId === row.id}
                      title="Sync data"
                      className="p-1.5 rounded hover:bg-green-50 text-green-600 disabled:opacity-50 transition-colors"
                    >
                      {syncingId === row.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteIntId(row.id as string)}
                      title="Delete integration"
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={integrations as unknown as Record<string, unknown>[]}
            loading={intLoading}
            emptyMessage="No integrations configured"
          />
        </div>
      )}

      {/* ═══════════════════════════ WEBHOOKS TAB ═══════════════════════════ */}

      {tab === "webhooks" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateWh(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Webhook
            </button>
          </div>

          <DataTable
            columns={[
              {
                key: "name",
                header: "Name",
                render: (row: Record<string, unknown>) => (
                  <span className="font-medium">{row.name as string}</span>
                ),
              },
              {
                key: "url",
                header: "URL",
                render: (row: Record<string, unknown>) => (
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px] block">
                    {row.url as string}
                  </span>
                ),
              },
              {
                key: "events",
                header: "Events",
                render: (row: Record<string, unknown>) => (
                  <div className="flex flex-wrap gap-1 max-w-[250px]">
                    {((row.events as string[]) || [])
                      .slice(0, 3)
                      .map((ev) => (
                        <span
                          key={ev}
                          className="text-xs bg-muted px-1.5 py-0.5 rounded"
                        >
                          {ev}
                        </span>
                      ))}
                    {((row.events as string[]) || []).length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{(row.events as string[]).length - 3}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "retry_count",
                header: "Retries",
                render: (row: Record<string, unknown>) => (
                  <span className="text-sm">{row.retry_count as number}</span>
                ),
              },
              {
                key: "is_active",
                header: "Active",
                render: (row: Record<string, unknown>) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWebhook(row as unknown as Webhook);
                    }}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
                      row.is_active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {row.is_active ? "Active" : "Inactive"}
                  </button>
                ),
              },
              {
                key: "last_triggered_at",
                header: "Last Triggered",
                render: (row: Record<string, unknown>) => (
                  <span className="text-sm">
                    {row.last_triggered_at
                      ? new Date(row.last_triggered_at as string).toLocaleString()
                      : "Never"}
                  </span>
                ),
              },
              {
                key: "id",
                header: "Actions",
                render: (row: Record<string, unknown>) => (
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setTestWhId(row.id as string);
                        setShowTestWhModal(true);
                      }}
                      disabled={testingWhId === row.id}
                      title="Test webhook"
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600 disabled:opacity-50 transition-colors"
                    >
                      <TestTube className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleViewLogs(row.id as string)}
                      title="View logs"
                      className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteWhId(row.id as string)}
                      title="Delete webhook"
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              },
            ]}
            data={webhooks as unknown as Record<string, unknown>[]}
            loading={whLoading}
            emptyMessage="No webhooks configured"
          />
        </div>
      )}

      {/* ═══════════════════════════ EVENTS TAB ═══════════════════════════ */}

      {tab === "events" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowEmitEvent(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
              Emit Event
            </button>
          </div>

          <DataTable
            columns={[
              {
                key: "event_type",
                header: "Event Type",
                render: (row: Record<string, unknown>) => (
                  <StatusBadge status={row.event_type as string} />
                ),
              },
              {
                key: "source_module",
                header: "Source",
                render: (row: Record<string, unknown>) => (
                  <span className="text-sm">{(row.source_module as string) || "—"}</span>
                ),
              },
              {
                key: "processed",
                header: "Status",
                render: (row: Record<string, unknown>) => (
                  <StatusBadge status={row.processed ? "completed" : "pending"} />
                ),
              },
              {
                key: "created_at",
                header: "Date",
                render: (row: Record<string, unknown>) => (
                  <span className="text-sm">
                    {row.created_at
                      ? new Date(row.created_at as string).toLocaleString()
                      : "—"}
                  </span>
                ),
              },
              {
                key: "id",
                header: "",
                className: "w-10",
                render: (row: Record<string, unknown>) => (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedEventId(
                        expandedEventId === row.id ? null : (row.id as string)
                      );
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedEventId === row.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ),
              },
            ]}
            data={events as unknown as Record<string, unknown>[]}
            loading={evLoading}
            emptyMessage="No events recorded"
          />

          {/* Expanded Event Detail */}
          {expandedEventId && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Event Payload</h4>
                <button
                  onClick={() => setExpandedEventId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-[300px] overflow-y-auto">
                {JSON.stringify(
                  events.find((e) => e.id === expandedEventId)?.payload || {},
                  null,
                  2
                )}
              </pre>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {events.find((e) => e.id === expandedEventId)?.processed_at && (
                  <span>
                    Processed:{" "}
                    {new Date(
                      events.find((e) => e.id === expandedEventId)!.processed_at!
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════ MODALS ═══════════════════════════ */}

      {/* Create Integration Modal */}
      <Modal
        open={showCreateInt}
        onOpenChange={setShowCreateInt}
        title="Create Integration"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <Input
              value={intForm.name}
              onChange={(e) => setIntForm({ ...intForm, name: e.target.value })}
              placeholder="e.g. Production Stripe"
            />
          </FormField>
          <FormField label="Type">
            <Select
              value={intForm.integration_type}
              onChange={(v) => setIntForm({ ...intForm, integration_type: v })}
              options={integrationTypeOptions}
            />
          </FormField>
          <FormField label="Configuration (JSON)">
            <Textarea
              value={intForm.config}
              onChange={(e) => setIntForm({ ...intForm, config: e.target.value })}
              rows={6}
              className="font-mono text-xs"
              placeholder='{"api_key": "sk_live_...", "webhook_secret": "whsec_..."}'
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreateInt(false)}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={intCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateIntegration}
              disabled={intCreating || !intForm.name.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
            >
              {intCreating ? "Creating..." : "Create Integration"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Webhook Modal */}
      <Modal
        open={showCreateWh}
        onOpenChange={setShowCreateWh}
        title="Create Webhook"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <FormField label="Name" required>
            <Input
              value={whForm.name}
              onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
              placeholder="e.g. Slack Notifications"
            />
          </FormField>
          <FormField label="Endpoint URL" required>
            <Input
              value={whForm.url}
              onChange={(e) => setWhForm({ ...whForm, url: e.target.value })}
              placeholder="https://your-service.com/webhook"
            />
          </FormField>
          <FormField label="Events (comma-separated)">
            <Input
              value={whForm.events}
              onChange={(e) => setWhForm({ ...whForm, events: e.target.value })}
              placeholder="member.created, payment.received, event.registration"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available: member.created, member.updated, payment.received, payment.failed,
              event.registration, invoice.created, election.vote
            </p>
          </FormField>
          <FormField label="Retry Count">
            <Input
              type="number"
              min={1}
              max={5}
              value={whForm.retry_count}
              onChange={(e) => setWhForm({ ...whForm, retry_count: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of retry attempts on failure (1-5)
            </p>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowCreateWh(false)}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={whCreating}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateWebhook}
              disabled={whCreating || !whForm.name.trim() || !whForm.url.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
            >
              {whCreating ? "Creating..." : "Create Webhook"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Test Webhook Modal */}
      <Modal
        open={showTestWhModal}
        onOpenChange={setShowTestWhModal}
        title="Test Webhook"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send a test event to this webhook endpoint.
          </p>
          <FormField label="Event Type">
            <Select
              value={testWhEvent}
              onChange={setTestWhEvent}
              options={eventTypeOptions}
            />
          </FormField>
          <FormField label="Test Payload (JSON)">
            <Textarea
              value={testWhPayload}
              onChange={(e) => setTestWhPayload(e.target.value)}
              rows={5}
              className="font-mono text-xs"
              placeholder='{"member_id": "123", "name": "Test User"}'
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setShowTestWhModal(false); setTestWhId(null); }}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={testingWhId === testWhId}
            >
              Cancel
            </button>
            <button
              onClick={handleTestWebhook}
              disabled={testingWhId === testWhId}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {testingWhId === testWhId ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {testingWhId === testWhId ? "Sending..." : "Send Test"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Emit Event Modal */}
      <Modal
        open={showEmitEvent}
        onOpenChange={setShowEmitEvent}
        title="Emit Event"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manually emit an event to trigger webhooks and integrations.
          </p>
          <FormField label="Event Type" required>
            <Select
              value={emitForm.event_type}
              onChange={(v) => setEmitForm({ ...emitForm, event_type: v })}
              options={eventTypeOptions}
            />
          </FormField>
          <FormField label="Payload (JSON)">
            <Textarea
              value={emitForm.payload}
              onChange={(e) => setEmitForm({ ...emitForm, payload: e.target.value })}
              rows={5}
              className="font-mono text-xs"
              placeholder='{"member_id": "123", "name": "John Smith", "email": "john@example.com"}'
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowEmitEvent(false)}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted"
              disabled={emitting}
            >
              Cancel
            </button>
            <button
              onClick={handleEmitEvent}
              disabled={emitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {emitting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {emitting ? "Emitting..." : "Emit Event"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Webhook Logs Modal */}
      <Modal
        open={showWhLogs}
        onOpenChange={setShowWhLogs}
        title="Webhook Delivery Logs"
        maxWidth="max-w-3xl"
      >
        {whLogsLoading ? (
          <LoadingSpinner />
        ) : whLogs.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No logs found"
            description="No delivery attempts have been recorded for this webhook yet."
          />
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {whLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border p-3 text-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={log.event_type} />
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        log.success ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {log.success ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      HTTP {log.status_code}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Attempts: {log.attempts}</span>
                </div>
                {log.request_body && (
                  <details className="mt-1">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Request body
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-[150px] overflow-y-auto">
                      {log.request_body}
                    </pre>
                  </details>
                )}
                {log.response_body && (
                  <details className="mt-1">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Response body
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-[150px] overflow-y-auto">
                      {log.response_body}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ═══════════════════════════ CONFIRMATIONS ═══════════════════════════ */}

      <ConfirmDialog
        open={!!deleteIntId}
        onOpenChange={(v) => {
          if (!v) setDeleteIntId(null);
        }}
        title="Delete Integration"
        description="This will permanently remove this integration and all its configuration. Connected webhooks will stop receiving events."
        confirmText="Delete Integration"
        variant="destructive"
        loading={deletingInt}
        onConfirm={handleDeleteIntegration}
      />

      <ConfirmDialog
        open={!!deleteWhId}
        onOpenChange={(v) => {
          if (!v) setDeleteWhId(null);
        }}
        title="Delete Webhook"
        description="This will permanently remove this webhook endpoint. All delivery history will be lost."
        confirmText="Delete Webhook"
        variant="destructive"
        loading={deletingWh}
        onConfirm={handleDeleteWebhook}
      />
    </div>
  );
}
