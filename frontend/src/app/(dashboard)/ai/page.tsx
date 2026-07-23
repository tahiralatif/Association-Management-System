"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  apiFetch, type AIModel, type AIInsight, type AIPrediction,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatusBadge, Modal, FormField, Input, Select, Textarea,
  Tabs, EmptyState, LoadingSpinner, ConfirmDialog,
} from "@/components/ui/shared";
import {
  Brain, HeartPulse, Search, MessageSquare, Cpu, TrendingDown,
  AlertTriangle, FileText, Plus, RefreshCw, Send, Trash2, Power, PowerOff,
  Sparkles, Copy, Check, BarChart3, Users, DollarSign, Calendar,
  Zap, Shield, ArrowRight, Clock, Bot, ChevronRight,
} from "lucide-react";

type TabKey = "chat" | "health" | "insights" | "search" | "models" | "predictions" | "generation";

/* ─────────────────── Colors ─────────────────── */
const C = {
  teal: "#0d9488", tealLight: "#14b8a6",
  emerald: "#059669", violet: "#7c3aed",
  amber: "#d97706", rose: "#e11d48",
  cyan: "#0891b2", indigo: "#4f46e5",
  orange: "#ea580c", gray: "#64748b",
};

/* ─────────────────── Simple Markdown → HTML ─────────────────── */
function md(text: string): string {
  let h = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  h = h.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;font-family:monospace">$1</code>');
  h = h.replace(/^- (.*)/gm, "<li>$1</li>");
  h = h.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul style="list-style:disc;padding-left:20px;margin:6px 0">${m}</ul>`);
  h = h.replace(/\n\n/g, "<br/><br/>");
  h = h.replace(/\n/g, "<br/>");
  return h;
}

/* ─────────────────── Quick Actions ─────────────────── */
const QUICK_ACTIONS = [
  { icon: BarChart3, label: "Show membership stats", color: C.teal, bg: "#f0fdfa" },
  { icon: DollarSign, label: "What's our total revenue?", color: C.amber, bg: "#fffbeb" },
  { icon: Calendar, label: "What events are coming up?", color: C.violet, bg: "#f5f3ff" },
  { icon: Users, label: "Find all suspended members", color: C.rose, bg: "#fff1f2" },
  { icon: FileText, label: "Generate a meeting minutes document", color: C.indigo, bg: "#eef2ff" },
  { icon: Zap, label: "How do I create an invoice?", color: C.emerald, bg: "#ecfdf5" },
  { icon: Shield, label: "Check election status", color: C.cyan, bg: "#ecfeff" },
  { icon: Brain, label: "Run churn prediction on all members", color: C.orange, bg: "#fff7ed" },
];

/* ─────────────────── Chat Bubble ─────────────────── */
function Bubble({ msg, onCopy }: { msg: { role: string; content: string }; onCopy: (t: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[78%]">
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-teal/10 flex items-center justify-center"><Sparkles size={11} className="text-teal" /></div>
            <span className="text-[10px] font-medium text-secondary">AI Assistant</span>
          </div>
        )}
        <div
          className={`px-4 py-3 text-[13px] leading-relaxed ${
            isUser ? "bg-teal text-white rounded-2xl rounded-br-md" : "bg-white border border-border rounded-2xl rounded-bl-md text-text"
          }`}
          dangerouslySetInnerHTML={{ __html: isUser ? msg.content : md(msg.content) }}
        />
        {!isUser && (
          <button onClick={() => onCopy(msg.content)} className="mt-1 ml-1 text-[10px] text-muted hover:text-secondary transition-colors flex items-center gap-1">
            <Copy size={10} /> Copy
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Typing Indicator ─────────────────── */
function TypingDots() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-border rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 bg-teal/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN ═══════════════════ */
export default function AIPage() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("chat");
  const [loading, setLoading] = useState(true);

  // Health
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Insights
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Models
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelForm, setModelForm] = useState({ name: "", version: "", model_type: "churn_prediction", description: "" });
  const [modelCreating, setModelCreating] = useState(false);
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null);
  const [deletingModel, setDeletingModel] = useState(false);

  // Chat
  const [msgs, setMsgs] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [sid, setSid] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);

  // Search
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ content_type: string; text_chunk: string; content_id: string; similarity: number }[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);

  // Churn
  const [churnId, setChurnId] = useState("");
  const [churnRes, setChurnRes] = useState<any>(null);
  const [churnBusy, setChurnBusy] = useState(false);

  // Anomaly
  const [anomalyInput, setAnomalyInput] = useState('[\n  { "amount": 15000, "date": "2025-01-15" },\n  { "amount": 200, "date": "2025-01-16" },\n  { "amount": 25000, "date": "2025-01-17" }\n]');
  const [anomalyRes, setAnomalyRes] = useState<any>(null);
  const [anomalyBusy, setAnomalyBusy] = useState(false);

  // Doc Gen
  const [genType, setGenType] = useState("meeting_minutes");
  const [genCtx, setGenCtx] = useState("{}");
  const [genResult, setGenResult] = useState<string | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);

  // ── Loaders ──
  const loadHealth = useCallback(() => {
    setHealthLoading(true);
    apiFetch<Record<string, any>>("/ai/health").then(setHealth).catch(() => {}).finally(() => { setHealthLoading(false); setLoading(false); });
  }, []);

  const loadInsights = useCallback(() => {
    setInsightsLoading(true);
    apiFetch("/ai/insights").then((d: any) => { setInsights(Array.isArray(d) ? d : d.items || []); }).catch(() => setInsights([])).finally(() => setInsightsLoading(false));
  }, []);

  const loadModels = useCallback(() => {
    setModelsLoading(true);
    apiFetch("/ai/models").then((d: any) => { setModels(Array.isArray(d) ? d : d.items || []); }).catch(() => setModels([])).finally(() => setModelsLoading(false));
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);
  useEffect(() => { if (tab === "insights") loadInsights(); if (tab === "models") loadModels(); }, [tab, loadInsights, loadModels]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, chatBusy]);

  // ── Chat ──
  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || chatBusy) return;
    setMsgs((p) => [...p, { role: "user", content: msg }]);
    setInput("");
    setChatBusy(true);
    try {
      const r = await apiFetch("/ai/chat", { method: "POST", body: JSON.stringify({ message: msg, session_id: sid || undefined, history: msgs.slice(-10) }) }) as any;
      if (r.session_id && !sid) setSid(r.session_id);
      setMsgs((p) => [...p, { role: "assistant", content: r.reply || r.response || r.message || "I couldn't process that. Please try again." }]);
    } catch (e: any) {
      const msg = e?.message || String(e);
      const text = msg.includes("Unauthorized") || msg.includes("401")
        ? "Your session has expired. Please log in again."
        : msg.includes("Failed to fetch") || msg.includes("NetworkError")
        ? "Network error — check your connection and try again."
        : "Sorry, the AI service is unavailable. Please try again.";
      setMsgs((p) => [...p, { role: "assistant", content: text }]);
    } finally { setChatBusy(false); }
  }

  function clearChat() { setMsgs([]); setSid(""); }
  function clip(t: string) { navigator.clipboard.writeText(t).then(() => toast.success("Copied!")); }

  // ── Search ──
  async function doSearch() {
    if (!q.trim()) return;
    setSearchBusy(true); setResults([]);
    try {
      const r = await apiFetch("/ai/embeddings/search", { method: "POST", body: JSON.stringify({ query: q.trim(), limit: 10 }) }) as any;
      setResults(r.results || []);
    } catch { toast.error("Search failed"); }
    finally { setSearchBusy(false); }
  }

  // ── Models CRUD ──
  async function createModel() {
    if (!modelForm.name.trim() || !modelForm.version.trim()) return;
    setModelCreating(true);
    try {
      await apiFetch("/ai/models", { method: "POST", body: JSON.stringify(modelForm) });
      toast.success("Model registered"); setShowModelModal(false);
      setModelForm({ name: "", version: "", model_type: "churn_prediction", description: "" }); loadModels();
    } catch (e: any) { toast.error(e.message); }
    finally { setModelCreating(false); }
  }

  async function toggleModel(m: AIModel) {
    try {
      await apiFetch(`/ai/models/${m.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !m.is_active }) });
      setModels((p) => p.map((x) => x.id === m.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(`Model ${m.is_active ? "deactivated" : "activated"}`);
    } catch (e: any) { toast.error(e.message); }
  }

  async function deleteModel() {
    if (!deleteModelId) return;
    setDeletingModel(true);
    try { await apiFetch(`/ai/models/${deleteModelId}`, { method: "DELETE" }); setModels((p) => p.filter((x) => x.id !== deleteModelId)); setDeleteModelId(null); toast.success("Deleted"); }
    catch (e: any) { toast.error(e.message); }
    finally { setDeletingModel(false); }
  }

  // ── Churn ──
  async function predictChurn() {
    if (!churnId.trim()) return;
    setChurnBusy(true); setChurnRes(null);
    try { const r = await apiFetch(`/ai/predict/churn/${churnId.trim()}`); setChurnRes(r); toast.success("Prediction complete"); }
    catch { toast.error("Failed"); }
    finally { setChurnBusy(false); }
  }

  // ── Anomaly ──
  async function detectAnomaly() {
    let tx;
    try { tx = JSON.parse(anomalyInput); if (!Array.isArray(tx)) throw new Error(); } catch { toast.warning("Invalid JSON"); return; }
    setAnomalyBusy(true); setAnomalyRes(null);
    try { const r = await apiFetch("/ai/predict/anomalies", { method: "POST", body: JSON.stringify({ transactions: tx }) }); setAnomalyRes(r); toast.success("Done"); }
    catch { toast.error("Failed"); }
    finally { setAnomalyBusy(false); }
  }

  // ── Doc Gen ──
  async function generateDoc() {
    let ctx;
    try { ctx = JSON.parse(genCtx); } catch { toast.warning("Invalid JSON"); return; }
    setGenBusy(true); setGenResult(null);
    try {
      const r = await apiFetch("/ai/generate/document", { method: "POST", body: JSON.stringify({ doc_type: genType, context: ctx }) }) as any;
      setGenResult(r.content || r.document || r.text || r.output || JSON.stringify(r, null, 2));
      toast.success("Generated!");
    } catch { toast.error("Failed"); }
    finally { setGenBusy(false); }
  }

  const ok = health?.status === "healthy" || health?.status === "ok";
  const feats = ((health?.features || {}) as Record<string, boolean>) || {};

  const tabs = [
    { key: "chat", label: "AI Chat" },
    { key: "health", label: "Health" },
    { key: "insights", label: "Insights", count: insights.length || undefined },
    { key: "search", label: "Semantic Search" },
    { key: "models", label: "Models", count: models.length || undefined },
    { key: "predictions", label: "Predictions" },
    { key: "generation", label: "Doc Generation" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask anything about your association — the AI knows your data"
        actions={<button onClick={() => { if (tab === "health") loadHealth(); else if (tab === "insights") loadInsights(); else if (tab === "models") loadModels(); }} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-secondary hover:bg-muted transition-colors"><RefreshCw size={14} /> Refresh</button>}
      />
      <Tabs tabs={tabs} activeTab={tab} onChange={(k) => setTab(k as TabKey)} />

      {/* ════════════════════════════ CHAT ════════════════════════════ */}
      {tab === "chat" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden" style={{ minHeight: "620px" }}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center"><Sparkles size={18} className="text-teal" /></div>
              <div>
                <h3 className="text-sm font-semibold text-text">AI Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-gray-400"}`} />
                  <span className="text-[10px] text-muted">{ok ? "Powered by Groq LLM" : "Demo mode"}</span>
                </div>
              </div>
            </div>
            {msgs.length > 0 && (
              <button onClick={clearChat} className="text-xs text-muted hover:text-secondary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted">Clear chat</button>
            )}
          </div>

          {/* Messages */}
          <div className="p-6 space-y-4 bg-surface/20" style={{ minHeight: "470px", maxHeight: "500px", overflowY: "auto" }}>
            {msgs.length === 0 ? (
              /* Welcome Screen */
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center mb-5">
                  <Sparkles size={32} className="text-teal" />
                </div>
                <h2 className="text-xl font-bold text-text mb-2">Hi! I'm your AssocHub AI</h2>
                <p className="text-sm text-secondary max-w-md mb-8">
                  I know everything about your association — members, finances, events, documents, elections, and more. Ask me anything, or try one of these:
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                  {QUICK_ACTIONS.map((a) => (
                    <button
                      key={a.label}
                      onClick={() => send(a.label)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-left hover:shadow-md transition-all group"
                      style={{ backgroundColor: a.bg }}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: a.color + "20" }}>
                        <a.icon size={16} style={{ color: a.color }} />
                      </div>
                      <span className="text-xs font-medium text-text group-hover:text-teal transition-colors">{a.label}</span>
                      <ArrowRight size={12} className="text-muted group-hover:text-teal ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m, i) => <Bubble key={i} msg={m} onCopy={clip} />)
            )}
            {chatBusy && <TypingDots />}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-border bg-white">
            <div className="flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask me anything about your association..."
                rows={1}
                className="flex-1 resize-none border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <button onClick={() => send()} disabled={chatBusy || !input.trim()} className="w-11 h-11 rounded-xl bg-teal text-white flex items-center justify-center hover:bg-teal-light disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════ HEALTH ════════════════════════════ */}
      {tab === "health" && (
        <div className="space-y-6">
          {healthLoading ? <LoadingSpinner /> : health ? (
            <>
              <div className={`rounded-xl border-2 p-6 ${ok ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ok ? "bg-emerald-100" : "bg-red-100"}`}>
                    {ok ? <HeartPulse size={24} className="text-emerald-600" /> : <AlertTriangle size={24} className="text-red-600" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${ok ? "text-emerald-800" : "text-red-800"}`}>{ok ? "All Systems Operational" : "Issues Detected"}</h3>
                    <p className={`text-sm ${ok ? "text-emerald-600" : "text-red-600"}`}>{ok ? "AI engine is running normally" : "Some features may not work"}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(feats).map(([k, v]) => (
                  <div key={k} className={`rounded-xl border p-4 ${v ? "border-emerald-200 bg-white" : "border-border bg-surface opacity-60"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {v ? <Check size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-red-500" />}
                      <span className="text-xs font-medium text-secondary capitalize">{k.replace(/_/g, " ")}</span>
                    </div>
                    <p className={`text-xs ${v ? "text-emerald-600" : "text-red-500"}`}>{v ? "Available" : "Unavailable"}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-border p-6">
                <h3 className="text-sm font-semibold text-text mb-3">System Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(health).filter(([k]) => k !== "status" && k !== "features").map(([k, v]) => (
                    <div key={k} className="bg-surface rounded-lg p-3">
                      <p className="text-[10px] text-muted uppercase tracking-wide">{k.replace(/_/g, " ")}</p>
                      <p className="text-sm font-medium text-text mt-0.5">{typeof v === "boolean" ? (v ? "✅ Yes" : "❌ No") : String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <EmptyState icon="💔" title="Health check unavailable" description="Could not retrieve AI engine status." />}
        </div>
      )}

      {/* ════════════════════════════ INSIGHTS ════════════════════════════ */}
      {tab === "insights" && (
        <div className="space-y-4">
          {insightsLoading ? <LoadingSpinner /> : insights.length === 0 ? (
            <EmptyState icon={"📈"} title="No AI insights yet" description="AI insights appear automatically as your data is analyzed." />
          ) : insights.map((ins) => (
            <div key={ins.id} className={`bg-white rounded-xl border p-5 ${!ins.is_read ? "border-l-4 border-l-indigo-500" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={ins.insight_type} />
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      ins.severity === "critical" ? "bg-red-100 text-red-700" :
                      ins.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>{ins.severity}</span>
                    {!ins.is_read && <span className="w-2 h-2 bg-indigo-500 rounded-full" />}
                  </div>
                  <h3 className="text-sm font-semibold text-text">{ins.title}</h3>
                  <p className="text-xs text-secondary mt-1">{ins.description}</p>
                  {ins.data && Object.keys(ins.data).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted cursor-pointer hover:text-secondary">View details</summary>
                      <pre className="text-xs bg-surface p-3 rounded-lg mt-1 overflow-x-auto">{JSON.stringify(ins.data, null, 2)}</pre>
                    </details>
                  )}
                </div>
                <span className="text-[10px] text-muted ml-4 shrink-0">{ins.created_at ? new Date(ins.created_at).toLocaleDateString() : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════ SEARCH ════════════════════════════ */}
      {tab === "search" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-2"><Search size={18} className="text-teal" /><h3 className="text-sm font-semibold text-text">Semantic Search</h3></div>
            <p className="text-xs text-secondary mb-4">AI-powered search across all your documents, members, events, and content.</p>
            <div className="flex gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Search across all content..." className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30" />
              <button onClick={doSearch} disabled={searchBusy} className="px-5 py-2.5 bg-teal text-white rounded-xl text-sm font-medium hover:bg-teal-light disabled:opacity-50 flex items-center gap-2">
                {searchBusy ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} Search
              </button>
            </div>
          </div>
          {searchBusy && <LoadingSpinner />}
          {!searchBusy && results.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-secondary">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
              {results.map((r, i) => (
                <div key={i} className="bg-white rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.content_type} />
                      <span className="text-[10px] text-muted font-mono">{r.content_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.similarity * 100}%`, backgroundColor: r.similarity > 0.8 ? C.emerald : r.similarity > 0.5 ? C.amber : C.rose }} />
                      </div>
                      <span className="text-[10px] font-medium text-secondary">{(r.similarity * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">{r.text_chunk}</p>
                </div>
              ))}
            </div>
          )}
          {!searchBusy && results.length === 0 && q && <EmptyState icon={"🔍"} title="No results" description="Try a different query." />}
        </div>
      )}

      {/* ════════════════════════════ MODELS ════════════════════════════ */}
      {tab === "models" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowModelModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-xl text-sm font-medium hover:bg-teal-light"><Plus size={16} /> Register Model</button>
          </div>
          {modelsLoading ? <LoadingSpinner /> : models.length === 0 ? (
            <EmptyState icon={"🤖"} title="No models registered" description="Register AI models to track versions and deployment." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div><h3 className="text-sm font-semibold text-text">{m.name}</h3><p className="text-[10px] text-muted font-mono">v{m.version}</p></div>
                    <button onClick={() => toggleModel(m)} className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${m.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {m.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>
                  <StatusBadge status={m.model_type?.replace(/_/g, " ") || "unknown"} />
                  {m.description && <p className="text-xs text-secondary mt-2 line-clamp-2">{m.description}</p>}
                  <button onClick={() => setDeleteModelId(m.id)} className="mt-3 text-[10px] text-muted hover:text-rose flex items-center gap-1"><Trash2 size={10} /> Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════ PREDICTIONS ════════════════════════════ */}
      {tab === "predictions" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Churn */}
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><TrendingDown size={20} className="text-rose-600" /></div>
              <div><h3 className="text-sm font-semibold text-text">Churn Prediction</h3><p className="text-[10px] text-secondary">Predict if a member is at risk of leaving</p></div>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={churnId} onChange={(e) => setChurnId(e.target.value)} placeholder="Enter member ID..." className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose/30" />
              <button onClick={predictChurn} disabled={churnBusy || !churnId.trim()} className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50">{churnBusy ? "Analyzing..." : "Predict"}</button>
            </div>
            {churnRes && (
              <div className="bg-surface rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-secondary">Risk Score</span>
                  <span className={`text-lg font-bold ${(churnRes.risk_score || 0) > 0.6 ? "text-rose-600" : (churnRes.risk_score > 0.3 ? "text-amber-600" : "text-emerald-600")}`}>
                    {((churnRes.risk_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${(churnRes.risk_score || 0) * 100}%`, backgroundColor: (churnRes.risk_score || 0) > 0.6 ? C.rose : (churnRes.risk_score > 0.3 ? C.amber : C.emerald) }} />
                </div>
                {churnRes.reasons?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-secondary mb-1">Risk Factors:</p>
                    {churnRes.reasons.map((r: string, i: number) => (
                      <p key={i} className="text-xs text-text flex items-start gap-1.5 mb-1"><AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" /> {r}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Anomaly */}
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
              <div><h3 className="text-sm font-semibold text-text">Anomaly Detection</h3><p className="text-[10px] text-secondary">Detect unusual patterns in transactions</p></div>
            </div>
            <textarea value={anomalyInput} onChange={(e) => setAnomalyInput(e.target.value)} rows={4} className="w-full border border-border rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber/30 mb-3" />
            <button onClick={detectAnomaly} disabled={anomalyBusy} className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 disabled:opacity-50 w-full">
              {anomalyBusy ? "Analyzing..." : "Detect Anomalies"}
            </button>
            {anomalyRes && <div className="mt-4 bg-surface rounded-xl p-4"><pre className="text-xs text-text whitespace-pre-wrap">{JSON.stringify(anomalyRes, null, 2)}</pre></div>}
          </div>
        </div>
      )}

      {/* ════════════════════════════ DOC GENERATION ════════════════════════════ */}
      {tab === "generation" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold text-text mb-4">Choose Document Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: "meeting_minutes", label: "Meeting Minutes", icon: FileText, color: C.teal },
                { type: "bylaws", label: "Bylaws", icon: Shield, color: C.indigo },
                { type: "membership_letter", label: "Membership Letter", icon: Users, color: C.emerald },
                { type: "annual_report", label: "Annual Report", icon: BarChart3, color: C.violet },
                { type: "newsletter", label: "Newsletter", icon: Zap, color: C.amber },
                { type: "event_invitation", label: "Event Invitation", icon: Calendar, color: C.cyan },
                { type: "welcome_letter", label: "Welcome Letter", icon: HeartPulse, color: C.rose },
                { type: "policy_document", label: "Policy Document", icon: Shield, color: C.orange },
              ].map((d) => (
                <button key={d.type} onClick={() => setGenType(d.type)} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${genType === d.type ? "border-teal bg-teal/5 shadow-sm" : "border-border hover:border-muted"}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: d.color + "15" }}><d.icon size={20} style={{ color: d.color }} /></div>
                  <span className="text-[11px] font-medium text-text">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold text-text mb-4">Context</h3>
            <textarea value={genCtx} onChange={(e) => setGenCtx(e.target.value)} rows={4} className="w-full border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal/30 mb-4" placeholder='{"title": "Q2 Board Meeting", "attendees": ["John", "Sarah"], "date": "2025-06-15"}' />
            <button onClick={generateDoc} disabled={genBusy} className="px-6 py-3 bg-teal text-white rounded-xl text-sm font-medium hover:bg-teal-light disabled:opacity-50 flex items-center gap-2">
              {genBusy ? <><RefreshCw size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Document</>}
            </button>
          </div>

          {genResult && (
            <div className="bg-white rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text">Generated Document</h3>
                <button onClick={() => { navigator.clipboard.writeText(genResult); setCopiedResult(true); toast.success("Copied!"); setTimeout(() => setCopiedResult(false), 2000); }} className="text-xs text-teal hover:text-teal-light flex items-center gap-1">
                  {copiedResult ? <Check size={12} /> : <Copy size={12} />} {copiedResult ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="bg-surface rounded-xl p-5"><pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-text">{genResult}</pre></div>
            </div>
          )}
        </div>
      )}

      {/* ──── Modals ──── */}
      <Modal open={showModelModal} onOpenChange={setShowModelModal} title="Register AI Model">
        <div className="space-y-4">
          <FormField label="Name" required><Input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} placeholder="e.g. Churn Predictor v2" /></FormField>
          <FormField label="Version" required><Input value={modelForm.version} onChange={(e) => setModelForm({ ...modelForm, version: e.target.value })} placeholder="e.g. 2.1.0" /></FormField>
          <FormField label="Type"><Select value={modelForm.model_type} onChange={(v) => setModelForm({ ...modelForm, model_type: v })} options={[{ value: "churn_prediction", label: "Churn Prediction" }, { value: "anomaly_detection", label: "Anomaly Detection" }, { value: "document_generation", label: "Document Generation" }, { value: "embedding", label: "Embedding" }]} /></FormField>
          <FormField label="Description"><Textarea value={modelForm.description} onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })} rows={3} placeholder="Optional description" /></FormField>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowModelModal(false)} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">Cancel</button>
            <button onClick={createModel} disabled={modelCreating} className="px-4 py-2 bg-teal text-white rounded-xl text-sm font-medium hover:bg-teal-light disabled:opacity-50">{modelCreating ? "Creating..." : "Register"}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteModelId} onOpenChange={(v) => { if (!v) setDeleteModelId(null); }} title="Delete AI Model" description="This will permanently remove the model registration." confirmText="Delete" variant="destructive" loading={deletingModel} onConfirm={deleteModel} />
    </div>
  );
}
