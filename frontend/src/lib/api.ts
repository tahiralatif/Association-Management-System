export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

// ---------- helpers ----------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user: AuthUser) {
  localStorage.setItem("auth_user", JSON.stringify(user));
}

// ---------- types ----------

export interface AuthUser {
  email: string;
  roles: string[];
  token_type: string;
  tenant_id?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  roles: string[];
  email: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

// ── Members ──────────────────────────────────────────────────

export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: string;
  membership_tier?: string;
  organization?: string;
  job_title?: string;
  join_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MemberProfile {
  id: string;
  user_id: string;
  phone?: string;
  organization?: string;
  job_title?: string;
  bio?: string;
  status: string;
  membership_tier?: string;
  join_date?: string;
  address?: Record<string, string>;
  social_links?: Record<string, string>;
  interests?: string[];
  email_opt_in?: boolean;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  description?: string;
  member_count: number;
  created_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  member_count?: number;
}

export interface MemberNote {
  id: string;
  member_id: string;
  content: string;
  created_by: string;
  created_at?: string;
}

export interface MemberStats {
  total_members: number;
  active_members: number;
  new_members_this_month: number;
  members_by_status: Record<string, number>;
  members_by_tier: Record<string, number>;
}

// ── Finances ─────────────────────────────────────────────────

export interface FinanceDashboard {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  outstanding_invoices: number;
  overdue_invoices?: number;
  revenue_by_tier?: Record<string, number>;
  expenses_by_category?: Record<string, number>;
  monthly_trend?: { month: string; revenue: number; expenses: number }[];
  budget_utilization?: any[];
  revenue_trend?: { month: string; amount: number }[];
  [key: string]: unknown;
}

export interface DuesStructure {
  id: string;
  name: string;
  tier: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  description?: string;
  is_active: boolean;
  prorate: boolean;
  trial_days: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  member_id: string;
  member_name?: string;
  subtotal?: number;
  total?: number;
  total_amount?: number;  // alias
  amount_paid?: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  status: string;
  notes?: string;
  due_date?: string;
  due_at?: string;
  paid_at?: string;
  currency?: string;
  line_items?: InvoiceLineItem[];
  created_at?: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  processed_at?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  status: string;
  receipt_url?: string;
  submitter_id?: string;
  submitter_name?: string;
  approver_id?: string;
  approved_at?: string;
  created_at?: string;
}

export interface Budget {
  id: string;
  name: string;
  category: string;
  amount?: number;
  planned_amount?: number;
  spent?: number;
  actual_amount?: number;
  utilization_pct?: number;
  remaining?: number;
  is_active?: boolean;
  period: string;
  currency?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

// ── Events ───────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  event_type?: string;
  status: string;
  is_virtual: boolean;
  is_hybrid?: boolean;
  virtual_link?: string;
  virtual_platform?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  max_attendees?: number;
  registration_count?: number;
  ticket_price?: number;
  created_at?: string;
}

export interface EventSpeaker {
  id: string;
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  avatar_url?: string;
  is_keynote: boolean;
}

export interface EventSession {
  id: string;
  title: string;
  description?: string;
  session_type?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  track?: string;
}

export interface EventTicket {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  member_id: string;
  member_name?: string;
  status: string;
  checked_in: boolean;
  checked_in_at?: string;
  ticket_id?: string;
  registered_at?: string;
}

export interface EventSponsor {
  id: string;
  name: string;
  tier: string;
  logo_url?: string;
  website_url?: string;
}

export interface EventFeedback {
  id: string;
  rating: number;
  comment?: string;
  member_name?: string;
  created_at?: string;
}

export interface EventStats {
  total_events: number;
  upcoming_events: number;
  total_registrations: number;
  total_revenue: number;
}

// ── Communications ───────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  preview_text?: string;
  status: string;
  target_segments?: string[];
  target_all?: boolean;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at?: string;
  sent_at?: string;
  created_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  image_url?: string;
  audience: string;
  status: string;
  is_pinned: boolean;
  allow_comments: boolean;
  expires_at?: string;
  published_at?: string;
  created_at?: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  questions: SurveyQuestion[];
  response_count: number;
  created_at?: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  question_type: string;
  options?: string[];
  required: boolean;
  order: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  plain_body?: string;
  variables?: string[];
  created_at?: string;
}

export interface CommunicationsSummary {
  total_campaigns: number;
  total_sent: number;
  total_opened: number;
  active_announcements: number;
}

// ── Elections ────────────────────────────────────────────────

export interface Election {
  id: string;
  title: string;
  description?: string;
  election_type: string;
  status: string;
  seats_available: number;
  quorum_percentage: number;
  secret_ballot: boolean;
  nominations_open?: string;
  nominations_close?: string;
  voting_start?: string;
  voting_end?: string;
  total_votes?: number;
  created_at?: string;
}

export interface ElectionPosition {
  id: string;
  title: string;
  description?: string;
  seats: number;
  sort_order: number;
}

export interface ElectionNomination {
  id: string;
  election_id: string;
  member_id: string;
  member_name?: string;
  position_id: string;
  position_title?: string;
  statement?: string;
  status: string;
  nominated_at?: string;
}

export interface ElectionBallot {
  id: string;
  election_id: string;
  member_id: string;
  votes: { position_id: string; candidate_ids: string[] }[];
  submitted_at?: string;
}

export interface ElectionResult {
  position_id: string;
  position_title: string;
  winners: { member_id: string; member_name: string; votes: number }[];
  all_candidates: { member_id: string; member_name: string; votes: number }[];
}

export interface ElectionStats {
  total_elections: number;
  active_elections: number;
  total_votes_cast: number;
  voter_turnout: number;
}

// ── Documents ────────────────────────────────────────────────

export interface DocumentCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parent_id?: string;
  document_count: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  document_type: string;
  status: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  file_url?: string;
  storage_path?: string;
  category_id?: string;
  category_name?: string;
  access_level?: string;
  tags?: string[];
  version_number?: number;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  file_name: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string;
  change_notes?: string;
  created_at?: string;
}

export interface DocumentComment {
  id: string;
  content: string;
  author_name?: string;
  created_at?: string;
}

export interface DocumentShare {
  id: string;
  user_id: string;
  user_name?: string;
  permission: string;
  shared_at?: string;
}

// ── Workflows ────────────────────────────────────────────────

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  steps: WorkflowStepDef[];
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowStepDef {
  type: string;
  config: Record<string, unknown>;
  next_step?: number;
  condition?: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: string;
  current_step: number;
  total_steps: number;
  trigger_data?: Record<string, unknown>;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  trigger_type: string;
  steps: WorkflowStepDef[];
}

export interface WorkflowStats {
  total_workflows: number;
  active_workflows: number;
  total_runs: number;
  success_rate: number;
}

// ── AI Engine ────────────────────────────────────────────────

export interface AIModel {
  id: string;
  name: string;
  version: string;
  model_type: string;
  description?: string;
  config?: Record<string, unknown>;
  metrics?: Record<string, number>;
  is_active: boolean;
  created_at?: string;
}

export interface AIEmbedding {
  id: string;
  content_id: string;
  content_type: string;
  text_chunk: string;
  created_at?: string;
}

export interface AIPrediction {
  id: string;
  model_id: string;
  entity_id: string;
  entity_type: string;
  prediction_type: string;
  prediction: Record<string, unknown>;
  confidence: number;
  created_at?: string;
}

export interface AIConversation {
  id: string;
  role: string;
  content: string;
  created_at?: string;
}

export interface AIInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  data?: Record<string, unknown>;
  is_read?: boolean;
  created_at?: string;
}

// ── Integrations ─────────────────────────────────────────────

export interface Integration {
  id: string;
  name: string;
  integration_type: string;
  status: string;
  config?: Record<string, unknown>;
  webhook_url?: string;
  error_message?: string;
  last_sync_at?: string;
  created_at?: string;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret?: string;
  retry_count: number;
  last_triggered_at?: string;
  created_at?: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  status_code: number;
  request_body?: string;
  response_body?: string;
  success: boolean;
  attempts: number;
  created_at?: string;
}

export interface IntegrationEvent {
  id: string;
  event_type: string;
  payload?: Record<string, unknown>;
  source_module?: string;
  processed: boolean;
  processed_at?: string;
  created_at?: string;
}

export interface IntegrationDashboard {
  total_integrations: number;
  active_integrations: number;
  total_webhooks: number;
  events_today: number;
}

// ── Analytics ────────────────────────────────────────────────

export interface AnalyticsOverview {
  total_members: number;
  active_members: number;
  total_revenue?: number;
  revenue_this_month?: number;
  total_events?: number;
  events_this_month?: number;
  total_invoices?: number;
  emails_sent?: number;
  new_members_this_month?: number;
  member_growth_rate?: number;
  [key: string]: unknown;
}

export interface AnalyticsInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  metric_value?: number;
  is_read?: boolean;
  created_at?: string;
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_public: boolean;
  widgets?: AnalyticsWidget[];
  created_at?: string;
}

export interface AnalyticsWidget {
  id: string;
  dashboard_id: string;
  name: string;
  widget_type: string;
  data_source: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number; w: number; h: number };
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  status: string;
  query_config?: Record<string, unknown>;
  result?: Record<string, unknown>;
  is_scheduled: boolean;
  schedule_cron?: string;
  last_run?: string;
  created_at?: string;
}

export interface AnalyticsExport {
  id: string;
  name: string;
  export_type: string;
  format: string;
  status: string;
  file_url?: string;
  created_at?: string;
}

// ── API Client ───────────────────────────────────────────────

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add tenant header from user
  const user = getUser();
  if (user?.tenant_id) {
    headers["X-Tenant-ID"] = user.tenant_id;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    let msg = "Something went wrong. Please try again.";
    try {
      const parsed = JSON.parse(errorBody);
      // FastAPI error format: { detail: [...] } or { detail: "string" }
      if (parsed.detail) {
        if (Array.isArray(parsed.detail)) {
          msg = parsed.detail.map((d: any) => d.msg || d.message || String(d)).join("; ");
        } else if (typeof parsed.detail === "string") {
          msg = parsed.detail;
        }
      }
      // Custom error format: { error: { message: "..." } }
      else if (parsed.error?.message) {
        msg = parsed.error.message;
      }
    } catch {
      // Not JSON — use as-is
      if (errorBody && errorBody.length < 200) msg = errorBody;
    }
    throw new Error(msg);
  }

  return res.json();
}

// ---------- auth ----------

export async function login(
  email: string,
  password: string,
  tenant_id: string
): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, tenant_id }),
  });

  setToken(data.access_token);
  setUser({ email: data.email, roles: data.roles, token_type: data.token_type, tenant_id });

  return data;
}

export async function register(
  email: string,
  password: string,
  first_name: string,
  last_name: string,
  tenant_id: string
): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, first_name, last_name, tenant_id }),
  });

  setToken(data.access_token);
  setUser({ email: data.email, roles: data.roles, token_type: data.token_type, tenant_id });

  return data;
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
