"use client";

import { useState, useEffect, useCallback } from "react";
import {
  apiFetch, API_BASE, getToken, type PaginatedResponse, type Invoice, type Expense,
  type Budget, type DuesStructure, type FinanceDashboard, type Payment,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatusBadge, Pagination, SearchInput, StatCard,
  Modal, ConfirmDialog, FormField, Input, Select, Textarea,
  Tabs, EmptyState, LoadingSpinner,
} from "@/components/ui/shared";
import {
  DollarSign, FileText, Receipt, PiggyBank, CreditCard,
  Plus, Trash2, Download, Send, CheckCircle, Eye,
} from "lucide-react";

const F = "/api/v1/finances";

function fmt$(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default function FinancesPage() {
  const toast = useToast();
  const [tab, setTab] = useState("dashboard");
  const [dash, setDash] = useState<FinanceDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invPage, setInvPage] = useState(1);
  const [invTotal, setInvTotal] = useState(0);
  const [invSearch, setInvSearch] = useState("");
  const [showCreateInv, setShowCreateInv] = useState(false);
  const [delInv, setDelInv] = useState<Invoice | null>(null);
  const [payInv, setPayInv] = useState<Invoice | null>(null);
  const [viewInv, setViewInv] = useState<Invoice | null>(null);
  const [invForm, setInvForm] = useState({ notes: "", due_days: "30" });
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expLoading, setExpLoading] = useState(true);
  const [expPage, setExpPage] = useState(1);
  const [expTotal, setExpTotal] = useState(0);
  const [showCreateExp, setShowCreateExp] = useState(false);
  const [expForm, setExpForm] = useState({ title: "", description: "", amount: "", category: "OTHER", notes: "", expense_date: new Date().toISOString() });

  // Budgets
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budLoading, setBudLoading] = useState(true);
  const [showCreateBud, setShowCreateBud] = useState(false);
  const [budForm, setBudForm] = useState({ name: "", category: "OTHER", planned_amount: "", period: "MONTHLY", start_date: "", end_date: "" });

  // Dues
  const [dues, setDues] = useState<DuesStructure[]>([]);
  const [duesLoading, setDuesLoading] = useState(true);
  const [showCreateDues, setShowCreateDues] = useState(false);
  const [duesForm, setDuesForm] = useState({ name: "", tier: "basic", amount: "", billing_cycle: "annual", description: "" });

  // ── Load Data ─────────────────────────────────────────
  const loadDash = useCallback(async () => {
    if (tab !== "dashboard") return;
    setDashLoading(true);
    try { setDash(await apiFetch<FinanceDashboard>(`${F}/dashboard`)); }
    catch (e: any) { toast.error(e.message || "Failed to load dashboard"); }
    finally { setDashLoading(false); }
  }, [tab]);

  const loadInvoices = useCallback(async () => {
    if (tab !== "invoices") return;
    setInvLoading(true);
    try {
      const r = await apiFetch<PaginatedResponse<Invoice>>(`${F}/invoices?page=${invPage}&per_page=20`);
      setInvoices(r.items || []); setInvTotal(r.total || 0);
    } catch (e: any) { toast.error(e.message || "Failed to load invoices"); }
    finally { setInvLoading(false); }
  }, [tab, invPage]);

  const loadExpenses = useCallback(async () => {
    if (tab !== "expenses") return;
    setExpLoading(true);
    try {
      const r = await apiFetch<PaginatedResponse<Expense>>(`${F}/expenses?page=${expPage}&per_page=20`);
      setExpenses(r.items || []); setExpTotal(r.total || 0);
    } catch (e: any) { toast.error(e.message || "Failed to load expenses"); }
    finally { setExpLoading(false); }
  }, [tab, expPage]);

  const loadBudgets = useCallback(async () => {
    if (tab !== "budgets") return;
    setBudLoading(true);
    try {
      const r = await apiFetch<any>(`${F}/budgets?page=1&per_page=50`);
      setBudgets(Array.isArray(r) ? r : (r.items || []));
    } catch (e: any) { toast.error(e.message || "Failed to load budgets"); }
    finally { setBudLoading(false); }
  }, [tab]);

  const loadDues = useCallback(async () => {
    if (tab !== "dues") return;
    setDuesLoading(true);
    try {
      const r = await apiFetch<any>(`${F}/dues/?page=1&per_page=50`);
      setDues(Array.isArray(r) ? r : (r.items || []));
    } catch (e: any) { toast.error(e.message || "Failed to load dues"); }
    finally { setDuesLoading(false); }
  }, [tab]);

  useEffect(() => { loadDash(); }, [loadDash]);
  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { loadBudgets(); }, [loadBudgets]);
  useEffect(() => { loadDues(); }, [loadDues]);

  // ── Member Search for Invoice Form ───────────────────────
  const searchMembers = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setMemberSearchResults([]); return; }
    try {
      const r = await apiFetch<any>(`/api/v1/members/?search=${encodeURIComponent(q)}&per_page=10`);
      setMemberSearchResults(r.items || []);
    } catch { setMemberSearchResults([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchMembers(memberSearchQuery), 300);
    return () => clearTimeout(t);
  }, [memberSearchQuery, searchMembers]);

  // Close member search dropdown on click outside
  useEffect(() => {
    if (!memberSearchOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-member-search]")) setMemberSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [memberSearchOpen]);

  // ── Invoice CRUD ──────────────────────────────────────
  async function handleCreateInv() {
    if (!selectedMember) { toast.warning("Please select a member"); return; }
    const items = lineItems.filter(l => l.description.trim());
    if (!items.length) { toast.warning("Add at least one line item"); return; }
    setInvSubmitting(true);
    try {
      await apiFetch(`${F}/invoices`, {
        method: "POST",
        body: JSON.stringify({
          member_id: selectedMember.id,
          line_items: items,
          due_days: parseInt(invForm.due_days) || 30,
          notes: invForm.notes,
        }),
      });
      toast.success("Invoice created");
      setShowCreateInv(false);
      setInvForm({ notes: "", due_days: "30" });
      setSelectedMember(null);
      setMemberSearchQuery("");
      setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
      loadInvoices();
    } catch (e: any) { console.error("Create invoice error:", e); toast.error(e.message || "Create failed"); }
    finally { setInvSubmitting(false); }
  }

  async function handleRecordPayment() {
    if (!payInv) return;
    const amt = parseFloat((document.getElementById("pay-amount") as HTMLInputElement)?.value || "0");
    const method = (document.getElementById("pay-method") as HTMLSelectElement)?.value || "bank_transfer";
    if (amt <= 0) { toast.warning("Amount must be > 0"); return; }
    try {
      await apiFetch(`${F}/payments`, {
        method: "POST",
        body: JSON.stringify({ invoice_id: payInv.id, amount: amt, payment_method: method }),
      });
      toast.success("Payment recorded");
      setPayInv(null);
      loadInvoices();
    } catch (e: any) { console.error("Record payment error:", e); toast.error(e.message || "Payment failed"); }
  }

  async function handleDeleteInv() {
    if (!delInv) return;
    try {
      await apiFetch(`${F}/invoices/${delInv.id}`, { method: "DELETE" });
      toast.success("Invoice deleted");
      setDelInv(null);
      loadInvoices();
    } catch (e: any) { console.error("Delete invoice error:", e); toast.error(e.message || "Delete failed"); }
  }

  async function handleSendInvoice(inv: Invoice) {
    try {
      await apiFetch(`${F}/invoices/${inv.id}/send`, { method: "POST" });
      toast.success("Invoice sent");
      loadInvoices();
    } catch (e: any) { toast.error(e.message || "Send failed"); }
  }

  async function handleStripeCheckout(inv: Invoice) {
    try {
      const r = await apiFetch<{ url: string }>(`${F}/invoices/${inv.id}/checkout`, { method: "POST" });
      if (r.url) window.open(r.url, "_blank");
      else toast.info("Checkout session created");
    } catch (e: any) { toast.error(e.message || "Checkout failed"); }
  }

  async function handleViewInv(inv: Invoice) {
    try {
      const detail = await apiFetch<Invoice>(`${F}/invoices/${inv.id}`);
      setViewInv(detail);
    } catch (e: any) { toast.error(e.message || "Failed to load invoice"); }
  }

  // ── Expense CRUD ──────────────────────────────────────
  async function handleCreateExp() {
    if (!expForm.title.trim() || !expForm.amount) { toast.warning("Title and amount required"); return; }
    try {
      await apiFetch(`${F}/expenses`, {
        method: "POST",
        body: JSON.stringify({ ...expForm, amount: parseFloat(expForm.amount), expense_date: expForm.expense_date || new Date().toISOString() }),
      });
      toast.success("Expense created");
      setShowCreateExp(false);
      setExpForm({ title: "", description: "", amount: "", category: "OTHER", notes: "", expense_date: new Date().toISOString() });
      loadExpenses();
    } catch (e: any) { toast.error(e.message || "Create failed"); }
  }

  async function handleExpenseAction(id: string, action: "approve" | "submit") {
    try {
      await apiFetch(`${F}/expenses/${id}/${action}`, { method: "POST" });
      toast.success(`Expense ${action}d`);
      loadExpenses();
    } catch (e: any) { toast.error(e.message || "Action failed"); }
  }

  // ── Budget CRUD ───────────────────────────────────────
  async function handleCreateBud() {
    if (!budForm.name || !budForm.planned_amount) { toast.warning("Name and amount required"); return; }
    try {
      await apiFetch(`${F}/budgets`, {
        method: "POST",
        body: JSON.stringify({ name: budForm.name, category: budForm.category, planned_amount: parseFloat(budForm.planned_amount), period: budForm.period, start_date: budForm.start_date ? new Date(budForm.start_date).toISOString() : new Date().toISOString(), end_date: budForm.end_date ? new Date(budForm.end_date).toISOString() : new Date(Date.now() + 365*24*60*60*1000).toISOString() }),
      });
      toast.success("Budget created");
      setShowCreateBud(false);
      setBudForm({ name: "", category: "OTHER", planned_amount: "", period: "MONTHLY", start_date: "", end_date: "" });
      loadBudgets();
    } catch (e: any) { toast.error(e.message || "Create failed"); }
  }

  // ── Dues CRUD ─────────────────────────────────────────
  async function handleCreateDues() {
    if (!duesForm.name || !duesForm.amount) { toast.warning("Name and amount required"); return; }
    try {
      await apiFetch(`${F}/dues/`, {
        method: "POST",
        body: JSON.stringify({ ...duesForm, amount: parseFloat(duesForm.amount) }),
      });
      toast.success("Dues structure created");
      setShowCreateDues(false);
      setDuesForm({ name: "", tier: "basic", amount: "", billing_cycle: "annual", description: "" });
      loadDues();
    } catch (e: any) { toast.error(e.message || "Create failed"); }
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="space-y-6 page-enter">
      <PageHeader title="Finances" description="Manage invoices, payments, expenses and budgets"
        actions={
          <button onClick={async () => {
            try {
              const r = await fetch(`${API_BASE}${F}/invoices/export/csv`, {
                headers: { Authorization: `Bearer ${getToken()}` },
              });
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "invoices.csv"; a.click();
              URL.revokeObjectURL(url);
              toast.success("Export downloaded");
            } catch { toast.error("Export failed"); }
          }} className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <Tabs
        tabs={[
          { key: "dashboard", label: "Overview" },
          { key: "invoices", label: "Invoices" },
          { key: "expenses", label: "Expenses" },
          { key: "budgets", label: "Budgets" },
          { key: "dues", label: "Dues" },
        ]}
        activeTab={tab} onChange={setTab}
      />

      {/* ── Dashboard ─────────────────────────────────── */}
      {tab === "dashboard" && (
        dashLoading ? <LoadingSpinner /> : dash ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={fmt$(dash.total_revenue || 0)} icon="💰" />
            <StatCard label="Outstanding Invoices" value={dash.outstanding_invoices || 0} icon="📄" />
            <StatCard label="Expenses" value={fmt$(dash.total_expenses || 0)} icon="🧾" />
            <StatCard label="Net Income" value={fmt$((dash.total_revenue || 0) - (dash.total_expenses || 0))} icon="🐷" />
          </div>
        ) : <EmptyState title="No data" />
      )}

      {/* ── Invoices ──────────────────────────────────── */}
      {tab === "invoices" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <SearchInput value={invSearch} onChange={() => {}} placeholder="Search invoices..." />
            <button onClick={() => setShowCreateInv(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <Plus className="h-4 w-4" /> New Invoice
            </button>
          </div>
          {invLoading ? <LoadingSpinner /> : invoices.length === 0 ? (
            <EmptyState title="No invoices" description="Create your first invoice" />
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left">Number</th>
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Due</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="p-3">{inv.member_name || inv.member_id?.slice(0, 8) + "..."}</td>
                        <td className="p-3 text-right font-medium">{fmt$(inv.total || inv.total_amount || inv.subtotal || 0)}</td>
                        <td className="p-3 text-right">{fmt$(inv.amount_paid || 0)}</td>
                        <td className="p-3"><StatusBadge status={inv.status || "pending"} /></td>
                        <td className="p-3 text-gray-500">{fmtDate(inv.due_at || inv.due_date)}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleViewInv(inv)} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="View Details"><Eye className="h-4 w-4" /></button>
                            <button onClick={async () => { try { const res = await fetch(`${API_BASE}${F}/invoices/${inv.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } }); if (!res.ok) throw new Error('Failed'); const blob = await res.blob(); const url = URL.createObjectURL(blob); window.open(url, '_blank'); } catch(e) { toast.error('Failed to download PDF'); } }} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Download PDF"><Download className="h-4 w-4" /></button>
                            {inv.status === "pending" && (
                              <>
                                <button onClick={() => handleSendInvoice(inv)} className="p-1 hover:bg-blue-50 rounded text-blue-600" title="Send"><Send className="h-4 w-4" /></button>
                                <button onClick={() => setPayInv(inv)} className="p-1 hover:bg-green-50 rounded text-green-600" title="Record Payment"><CheckCircle className="h-4 w-4" /></button>
                                <button onClick={() => handleStripeCheckout(inv)} className="p-1 hover:bg-purple-50 rounded text-purple-600" title="Stripe Checkout"><CreditCard className="h-4 w-4" /></button>
                              </>
                            )}
                            <button onClick={() => setDelInv(inv)} className="p-1 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={invPage} total={invTotal} perPage={20} onChange={setInvPage} />
            </>
          )}
        </div>
      )}

      {/* ── Expenses ──────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateExp(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <Plus className="h-4 w-4" /> New Expense
            </button>
          </div>
          {expLoading ? <LoadingSpinner /> : expenses.length === 0 ? (
            <EmptyState title="No expenses" />
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left">Title</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{exp.title || exp.description}</td>
                        <td className="p-3 text-gray-500">{exp.category}</td>
                        <td className="p-3 text-right font-medium">{fmt$(exp.amount)}</td>
                        <td className="p-3"><StatusBadge status={exp.status || "draft"} /></td>
                        <td className="p-3">
                          {exp.status === "draft" && (
                            <button onClick={() => handleExpenseAction(exp.id, "submit")} className="text-xs bg-teal-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-teal-600 transition-all">Submit</button>
                          )}
                          {(exp.status === "submitted" || exp.status === "pending_approval") && (
                            <button onClick={() => handleExpenseAction(exp.id, "approve")} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">Approve</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={expPage} total={expTotal} perPage={20} onChange={setExpPage} />
            </>
          )}
        </div>
      )}

      {/* ── Budgets ───────────────────────────────────── */}
      {tab === "budgets" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateBud(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <Plus className="h-4 w-4" /> New Budget
            </button>
          </div>
          {budLoading ? <LoadingSpinner /> : budgets.length === 0 ? (
            <EmptyState title="No budgets" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map((b) => (
                <div key={b.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">{b.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{b.category} · {b.period}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{fmt$(b.actual_amount || b.spent || 0)}</span>
                      <span>{fmt$(b.planned_amount || b.amount || 0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, b.utilization_pct || ((b.actual_amount || b.spent || 0) / ((b.planned_amount || b.amount || 1)) * 100))}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{fmtDate(b.start_date)} — {fmtDate(b.end_date)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Dues ──────────────────────────────────────── */}
      {tab === "dues" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCreateDues(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <Plus className="h-4 w-4" /> New Dues Structure
            </button>
          </div>
          {duesLoading ? <LoadingSpinner /> : dues.length === 0 ? (
            <EmptyState title="No dues structures" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
              {dues.map((d) => (
                <div key={d.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">{d.name}</h3>
                  <p className="text-2xl font-bold mt-2">{fmt$(d.amount)}<span className="text-sm font-normal text-gray-500">/{d.billing_cycle}</span></p>
                  <StatusBadge status={d.tier || "basic"} />
                  <p className="text-sm text-gray-500 mt-2">{d.description || "No description"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ────────────────────────────────────── */}
      <Modal open={showCreateInv} onOpenChange={() => setShowCreateInv(false)} title="Create Invoice">
        <div className="space-y-4">
          <FormField label="Member" required>
            {selectedMember ? (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-teal-200 bg-teal-50" data-member-search>
                <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-semibold">
                  {(selectedMember.first_name || "?")[0]}{(selectedMember.last_name || "?")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{selectedMember.first_name} {selectedMember.last_name}</p>
                  <p className="text-xs text-slate-500 truncate">{selectedMember.email}</p>
                </div>
                <button onClick={() => { setSelectedMember(null); setMemberSearchQuery(""); }} className="text-slate-400 hover:text-red-500 text-xs font-medium">✕</button>
              </div>
            ) : (
              <div className="relative" data-member-search>
                <Input value={memberSearchQuery} onChange={(e) => { setMemberSearchQuery(e.target.value); setMemberSearchOpen(true); }} placeholder="Search by name or email..." onFocus={() => setMemberSearchOpen(true)} />
                {memberSearchOpen && memberSearchResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                    {memberSearchResults.map((m) => (
                      <button key={m.id} onClick={() => { setSelectedMember(m); setMemberSearchOpen(false); setMemberSearchQuery(""); }} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left">
                        <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {(m.first_name || "?")[0]}{(m.last_name || "?")[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{m.first_name} {m.last_name}</p>
                          <p className="text-xs text-slate-500 truncate">{m.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {memberSearchOpen && memberSearchQuery.length >= 2 && memberSearchResults.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-sm text-slate-400">No members found</div>
                )}
              </div>
            )}
          </FormField>
          <FormField label="Due Days">
            <Input value={invForm.due_days} onChange={(e) => setInvForm({ ...invForm, due_days: e.target.value })} type="number" />
          </FormField>
          <div>
            <label className="text-sm font-medium mb-2 block">Line Items</label>
            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                <input className="col-span-2 border rounded px-2 py-1.5 text-sm" placeholder="Description" value={item.description}
                  onChange={(e) => { const n = [...lineItems]; n[idx].description = e.target.value; setLineItems(n); }} />
                <input className="border rounded px-2 py-1.5 text-sm" type="number" placeholder="Qty" value={item.quantity}
                  onChange={(e) => { const n = [...lineItems]; n[idx].quantity = parseInt(e.target.value) || 1; setLineItems(n); }} />
                <div className="flex gap-1">
                  <input className="flex-1 border rounded px-2 py-1.5 text-sm" type="number" placeholder="Price" value={item.unit_price || ""}
                    onChange={(e) => { const n = [...lineItems]; n[idx].unit_price = parseFloat(e.target.value) || 0; setLineItems(n); }} />
                  {lineItems.length > 1 && (
                    <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button onClick={() => setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }])} className="text-blue-600 text-sm hover:underline">
              + Add line item
            </button>
          </div>
          <FormField label="Notes"><Textarea value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateInv(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreateInv} disabled={invSubmitting} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              {invSubmitting ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!payInv} onOpenChange={() => setPayInv(null)} title={`Record Payment — ${payInv?.invoice_number || ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Total: {fmt$(payInv?.total || payInv?.total_amount || 0)} · Paid: {fmt$(payInv?.amount_paid || 0)}</p>
          <FormField label="Amount" required>
            <Input id="pay-amount" type="number" placeholder="0.00" defaultValue={String((payInv?.total || payInv?.total_amount || 0) - (payInv?.amount_paid || 0))} />
          </FormField>
          <FormField label="Method">
            <select id="pay-method" className="w-full border rounded px-3 py-2 text-sm">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit_card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="stripe">Stripe</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setPayInv(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleRecordPayment} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Record Payment</button>
          </div>
        </div>
      </Modal>

      {/* View Invoice Detail Modal */}
      <Modal open={!!viewInv} onOpenChange={() => setViewInv(null)} title={`Invoice ${viewInv?.invoice_number || ""}`}>
        {viewInv && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Status</span><div className="mt-1"><StatusBadge status={viewInv.status || "pending"} /></div></div>
              <div><span className="text-gray-500">Member</span><p className="mt-1 font-medium">{viewInv.member_name || viewInv.member_id}</p></div>
              <div><span className="text-gray-500">Issued</span><p className="mt-1">{fmtDate(viewInv.created_at || viewInv.issued_at)}</p></div>
              <div><span className="text-gray-500">Due Date</span><p className="mt-1">{fmtDate(viewInv.due_at)}</p></div>
              {viewInv.paid_at && <div><span className="text-gray-500">Paid</span><p className="mt-1">{fmtDate(viewInv.paid_at)}</p></div>}
            </div>

            {/* Line Items */}
            {viewInv.line_items && viewInv.line_items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Line Items</h4>
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50"><tr>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr></thead>
                  <tbody>
                    {viewInv.line_items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right">{fmt$(item.unit_price)}</td>
                        <td className="p-2 text-right font-medium">{fmt$(item.quantity * item.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt$(viewInv.subtotal || 0)}</span></div>
              {viewInv.tax_rate ? <div className="flex justify-between"><span className="text-gray-500">Tax ({viewInv.tax_rate}%)</span><span>{fmt$(viewInv.tax_amount || 0)}</span></div> : null}
              {viewInv.discount_amount ? <div className="flex justify-between"><span className="text-gray-500">Discount</span><span>-{fmt$(viewInv.discount_amount)}</span></div> : null}
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>{fmt$(viewInv.total || 0)}</span></div>
              <div className="flex justify-between text-green-600"><span>Paid</span><span>{fmt$(viewInv.amount_paid || 0)}</span></div>
              {viewInv.total && viewInv.amount_paid ? <div className="flex justify-between font-medium"><span>Balance Due</span><span>{fmt$((viewInv.total || 0) - (viewInv.amount_paid || 0))}</span></div> : null}
            </div>

            {viewInv.notes && (
              <div className="border-t pt-3">
                <span className="text-sm text-gray-500">Notes</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{viewInv.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => { setViewInv(null); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Close</button>
              <button onClick={async () => { try { const res = await fetch(`${API_BASE}${F}/invoices/${viewInv.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } }); if (!res.ok) throw new Error('Failed'); const blob = await res.blob(); const url = URL.createObjectURL(blob); window.open(url, '_blank'); } catch(e) { toast.error('Failed to download PDF'); } }} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)" }}><Download className="h-4 w-4 inline mr-1" /> PDF</button>
              {viewInv.status === "pending" && (
                <button onClick={() => { setViewInv(null); setPayInv(viewInv); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Record Payment</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showCreateExp} onOpenChange={() => setShowCreateExp(false)} title="New Expense">
        <div className="space-y-4">
          <FormField label="Title" required><Input value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} /></FormField>
          <FormField label="Amount" required><Input value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} type="number" placeholder="0.00" /></FormField>
          <FormField label="Category">
            <Select value={expForm.category} onChange={(v) => setExpForm({ ...expForm, category: v })} options={[
              { value: "OPERATIONS", label: "Operations" }, { value: "EVENTS", label: "Events" },
              { value: "MARKETING", label: "Marketing" }, { value: "TRAVEL", label: "Travel" },
              { value: "TECHNOLOGY", label: "Technology" }, { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
              { value: "FACILITIES", label: "Facilities" }, { value: "INSURANCE", label: "Insurance" },
              { value: "OTHER", label: "Other" },
            ]} />
          </FormField>
          <FormField label="Description"><Textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateExp(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreateExp} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Create</button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateBud} onOpenChange={() => setShowCreateBud(false)} title="New Budget">
        <div className="space-y-4">
          <FormField label="Name" required><Input value={budForm.name} onChange={(e) => setBudForm({ ...budForm, name: e.target.value })} /></FormField>
          <FormField label="Amount" required><Input value={budForm.planned_amount} onChange={(e) => setBudForm({ ...budForm, planned_amount: e.target.value })} type="number" /></FormField>
          <FormField label="Category">
            <Select value={budForm.category} onChange={(v) => setBudForm({ ...budForm, category: v })} options={[
              { value: "OPERATIONS", label: "Operations" }, { value: "EVENTS", label: "Events" },
              { value: "MARKETING", label: "Marketing" }, { value: "TRAVEL", label: "Travel" },
              { value: "TECHNOLOGY", label: "Technology" }, { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
              { value: "FACILITIES", label: "Facilities" }, { value: "INSURANCE", label: "Insurance" },
              { value: "OTHER", label: "Other" },
            ]} />
          </FormField>
          <FormField label="Period">
            <Select value={budForm.period} onChange={(v) => setBudForm({ ...budForm, period: v })} options={[
              { value: "MONTHLY", label: "Monthly" }, { value: "QUARTERLY", label: "Quarterly" },
              { value: "ANNUAL", label: "Annual" },
            ]} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Start Date"><Input value={budForm.start_date} onChange={(e) => setBudForm({ ...budForm, start_date: e.target.value })} type="date" /></FormField>
            <FormField label="End Date"><Input value={budForm.end_date} onChange={(e) => setBudForm({ ...budForm, end_date: e.target.value })} type="date" /></FormField>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateBud(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreateBud} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Create</button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateDues} onOpenChange={() => setShowCreateDues(false)} title="New Dues Structure">
        <div className="space-y-4">
          <FormField label="Name" required><Input value={duesForm.name} onChange={(e) => setDuesForm({ ...duesForm, name: e.target.value })} /></FormField>
          <FormField label="Amount" required><Input value={duesForm.amount} onChange={(e) => setDuesForm({ ...duesForm, amount: e.target.value })} type="number" /></FormField>
          <FormField label="Tier">
            <Select value={duesForm.tier} onChange={(v) => setDuesForm({ ...duesForm, tier: v })} options={[
              { value: "basic", label: "Basic" }, { value: "premium", label: "Premium" },
              { value: "professional", label: "Professional" }, { value: "executive", label: "Executive" },
            ]} />
          </FormField>
          <FormField label="Billing Cycle">
            <Select value={duesForm.billing_cycle} onChange={(v) => setDuesForm({ ...duesForm, billing_cycle: v })} options={[
              { value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" },
            ]} />
          </FormField>
          <FormField label="Description"><Textarea value={duesForm.description} onChange={(e) => setDuesForm({ ...duesForm, description: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateDues(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button onClick={handleCreateDues} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>Create</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!delInv} onOpenChange={(v) => { if (!v) setDelInv(null); }} onConfirm={handleDeleteInv}
        title="Delete Invoice" description={`Delete invoice ${delInv?.invoice_number}?`} />
    </div>
  );
}
