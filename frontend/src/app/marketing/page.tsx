"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/logo";

/* ═══════════════════════════════════════════════════════════
   Factual data — sourced from backend API routes and PLAN.md
   ═══════════════════════════════════════════════════════════ */

const API_ENDPOINTS = 231;
const MODULE_COUNT = 11;
const TASKS_COMPLETE = 24;

const MODULES = [
  { name: "Dashboard", icon: "📊", desc: "KPIs, recent activity, AI insights, financial summary", endpoints: 15 },
  { name: "Members", icon: "👥", desc: "CRUD, groups, tags, bulk ops, CSV export, status management", endpoints: 37 },
  { name: "Finances", icon: "💰", desc: "Invoices, expenses, budgets, dues, Stripe checkout", endpoints: 37 },
  { name: "Events", icon: "📅", desc: "Registration, speakers, sessions, check-in, feedback", endpoints: 21 },
  { name: "Communications", icon: "📧", desc: "Campaigns, announcements, surveys, drip sequences", endpoints: 36 },
  { name: "Elections", icon: "🗳️", desc: "Positions, nominations, ranked-choice voting, results", endpoints: 18 },
  { name: "Documents", icon: "📁", desc: "Upload, versioning, comments, sharing, categories", endpoints: 21 },
  { name: "Workflows", icon: "⚙️", desc: "Visual builder, triggers, delays, conditions, history", endpoints: 16 },
  { name: "AI Engine", icon: "🤖", desc: "Chat, churn, engagement, segmentation, semantic search", endpoints: 12 },
  { name: "Analytics", icon: "📈", desc: "Dashboards, reports, KPIs, interactive charts, exports", endpoints: 15 },
  { name: "Integrations", icon: "🔗", desc: "Webhooks, third-party connections, event logs", endpoints: 17 },
];

const AI_FEATURES = [
  {
    title: "ML Churn Prediction",
    desc: "GradientBoosting classifier trained on 10 features — login recency, event attendance, payment history, tenure, engagement score. 96% cross-validation accuracy. Weekly retraining via Celery.",
    icon: "📉",
    badge: "Scikit-learn",
  },
  {
    title: "Engagement Scoring",
    desc: "5-factor weighted system: event attendance (25%), payment timeliness (25%), email engagement (20%), login frequency (15%), group participation (15%). Updated weekly.",
    icon: "📊",
    badge: "Multi-factor",
  },
  {
    title: "Smart Segmentation",
    desc: "6 auto-segments: Champions, Loyal, At Risk, New, Dormant, High Value. Priority-based assignment from churn predictions and engagement scores.",
    icon: "🎯",
    badge: "AI-driven",
  },
  {
    title: "AI Chat Assistant",
    desc: "Conversational interface powered by OpenRouter LLMs. Ask questions about members, finances, and events in natural language.",
    icon: "💬",
    badge: "OpenRouter",
  },
  {
    title: "Anomaly Detection",
    desc: "Z-score and IQR analysis for financial and attendance anomalies. Automated flagging of unusual patterns.",
    icon: "🔍",
    badge: "Statistical",
  },
  {
    title: "Semantic Search",
    desc: "pgvector embeddings for meaning-based document search. Find related content across your entire knowledge base.",
    icon: "🔎",
    badge: "pgvector",
  },
  {
    title: "Document Generation",
    desc: "AI-polished document creation from templates. Deterministic data combined with LLM-generated prose.",
    icon: "📝",
    badge: "LLM-assisted",
  },
  {
    title: "Insights Engine",
    desc: "Cross-module analysis surfaces trends across members, finances, and communications with severity ranking.",
    icon: "💡",
    badge: "Cross-module",
  },
];

const COMPARISON_DATA = [
  { feature: "ML Churn Prediction (scikit-learn)", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Engagement Scoring (5-factor)", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Smart Segmentation (6 segments)", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "AI Chat Assistant (built-in)", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Anomaly Detection", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Semantic Search (Vector)", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Workflow Automation", assocHub: "full", wildApricot: false, memberClicks: "partial", wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Elections & Voting", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Ranked Choice Voting", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Budget Management", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Multi-Tenant Architecture", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "2FA / TOTP", assocHub: true, wildApricot: true, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Drip Campaigns", assocHub: true, wildApricot: true, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Stripe Checkout", assocHub: true, wildApricot: true, memberClicks: true, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Open Source", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Self-Hosted Option", assocHub: true, wildApricot: false, memberClicks: false, wildApricotUrl: "", memberClicksUrl: "" },
  { feature: "Per-Contact Pricing", assocHub: "$0", wildApricot: "$60–350/mo", memberClicks: "$80–400/mo", wildApricotUrl: "https://wildapricot.com/pricing", memberClicksUrl: "" },
  { feature: "REST API Endpoints", assocHub: "231", wildApricot: "Yes", memberClicks: "Yes", wildApricotUrl: "", memberClicksUrl: "" },
];

const FAQS = [
  {
    q: "What is AssocHub?",
    a: "AssocHub is an open-source, AI-powered association management platform. It handles member management, finances, events, communications, elections, documents, analytics, workflow automation, and integrations — all in one system with 231 API endpoints across 11 modules.",
  },
  {
    q: "How does the AI/ML work?",
    a: "AssocHub includes three ML systems built with scikit-learn: Churn Prediction (GradientBoosting classifier with 96% accuracy), Engagement Scoring (5-factor weighted system), and Smart Segmentation (6 auto-segments). It also uses OpenRouter LLMs for chat, anomaly detection, semantic search, and document generation. All ML models retrain weekly via Celery.",
  },
  {
    q: "What's the churn prediction accuracy?",
    a: "The GradientBoosting classifier achieves 96% cross-validation accuracy across 10 features: login recency, event attendance, payment history, membership tenure, engagement score, and more. It identifies at-risk members before they lapse, giving you time to re-engage them.",
  },
  {
    q: "How does engagement scoring work?",
    a: "Each member receives a 0–1 score based on 5 weighted factors: event attendance (25%), payment timeliness (25%), email engagement (20%), login frequency (15%), and group participation (15%). Scores update weekly and feed into churn predictions and segmentation.",
  },
  {
    q: "Is there per-contact pricing?",
    a: "No. AssocHub is open source and free to self-host. Managed hosting is available at a flat monthly rate regardless of member count. Unlike Wild Apricot ($60–350/mo based on contacts) or MemberClicks ($80–400/mo), your costs don't scale with your membership.",
  },
  {
    q: "Can I self-host AssocHub?",
    a: "Yes. AssocHub is MIT-licensed. Deploy with Docker or systemd on your own infrastructure. It runs on PostgreSQL 16 (with pgvector for AI embeddings), Redis for background tasks, and Celery for job processing.",
  },
  {
    q: "What elections features are included?",
    a: "Full election lifecycle: create elections with positions, open nomination periods, accept/decline nominations, ranked-choice voting with secret ballots, quorum tracking, and real-time results. No other AMS platform includes this natively.",
  },
  {
    q: "How many API endpoints are there?",
    a: "231 REST API endpoints across all 11 modules. Full OpenAPI/Swagger documentation available at /docs on any running instance.",
  },
];

/* ═══════════════════════════════════════════════════════════
   COUNTER COMPONENT (no framer-motion)
   ═══════════════════════════════════════════════════════════ */

function Counter({ end, label, prefix = "", suffix = "" }: { end: number; label: string; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const dur = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 4)) * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end]);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold tracking-tight text-white">{prefix}{count.toLocaleString()}{suffix}</div>
      <div className="text-xs uppercase tracking-[0.18em] font-medium mt-2 text-teal-300">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return window.removeEventListener("scroll", fn);
  }, []);
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-400 animate-fade-in"
      style={{
        backgroundColor: scrolled ? "rgba(255,255,255,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "none",
        borderBottom: scrolled ? "1px solid #e2e8f0" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-semibold text-[15px] tracking-tight text-slate-900">AssocHub</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "AI & ML", "Comparison", "Modules"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/[&\s]+/g, "-")}`} className="text-[13px] font-medium text-slate-500 hover:text-teal-600 transition-colors">
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-medium px-4 py-2 text-slate-500 hover:text-slate-700 transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="text-[13px] font-semibold px-5 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPARISON CELL
   ═══════════════════════════════════════════════════════════ */

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="text-emerald-500 font-bold">✓</span>;
  if (value === false) return <span className="text-slate-300">✗</span>;
  return <span className="text-amber-600 text-xs font-medium">{String(value)}</span>;
}

/* ═══════════════════════════════════════════════════════════
   FAQ ACCORDION
   ═══════════════════════════════════════════════════════════ */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left">
        <span className="font-semibold text-slate-900 text-[15px]">{q}</span>
        <span className={`text-slate-400 transition-transform duration-200 text-lg ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-600">{a}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Navbar />

      {/* ─── Hero ──────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-50 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-40" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 bg-teal-50 border border-teal-100">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-teal-700">Open Source · AI-Powered · Self-Hosted</span>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-7 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Association Management<br />
            <span className="text-teal-600">With a Brain</span>
          </h1>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-slate-500 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            {MODULE_COUNT} integrated modules. {API_ENDPOINTS} API endpoints. ML-powered churn prediction, engagement scoring, and smart segmentation. Zero per-contact fees.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
            <Link href="/register" className="font-semibold px-8 py-3.5 rounded-xl text-[15px] bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Start Free — No Credit Card
            </Link>
            <Link href="/login" className="font-medium px-6 py-3.5 rounded-xl text-[15px] text-slate-600 border border-slate-200 hover:border-slate-300 bg-white transition-all">
              Demo Login →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl p-10 md:p-14 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl animate-fade-in-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <Counter end={API_ENDPOINTS} label="API Endpoints" />
              <Counter end={MODULE_COUNT} label="Modules" />
              <Counter end={8} label="AI Features" />
              <Counter end={0} label="Per-Contact Fee" prefix="$" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Platform</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Everything in One System</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">No plugins. No add-ons. Every module shares the same database, auth system, and AI engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((mod, i) => (
              <div
                key={mod.name}
                className="bg-white rounded-2xl p-7 border border-slate-200 transition-all cursor-default hover:-translate-y-1 hover:shadow-lg hover:shadow-teal-500/5 animate-fade-in-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4 bg-teal-50 border border-teal-100">{mod.icon}</div>
                <h3 className="text-[17px] font-semibold mb-2">{mod.name}</h3>
                <p className="text-[13px] leading-relaxed text-slate-500">{mod.desc}</p>
                <div className="mt-3 text-[11px] font-medium text-slate-400">{mod.endpoints} API endpoints</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI & ML Engine ────────────────────────────── */}
      <section id="ai--ml" className="py-24 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-400">AI & Machine Learning</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">Not a Chatbot. A Brain.</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-400">8 AI features built into the platform — not bolted on as plugins.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {AI_FEATURES.map((feat, i) => (
              <div
                key={feat.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/8 transition-all animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-3xl">{feat.icon}</div>
                  <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full">{feat.badge}</span>
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-400">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ML Pipeline Visual ────────────────────────── */}
      <section className="py-16 px-6 bg-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 animate-fade-in-up">
            <h3 className="text-lg font-semibold text-white mb-6 text-center">How the ML Pipeline Works</h3>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-xl mx-auto mb-2">📊</div>
                <div className="text-sm font-medium text-white">Data Collection</div>
                <div className="text-[11px] text-slate-500 mt-1">Members, payments, logins, events</div>
              </div>
              <div className="text-teal-500 text-2xl hidden md:block">→</div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-xl mx-auto mb-2">⚙️</div>
                <div className="text-sm font-medium text-white">Feature Extraction</div>
                <div className="text-[11px] text-slate-500 mt-1">10 engineered features per member</div>
              </div>
              <div className="text-teal-500 text-2xl hidden md:block">→</div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-xl mx-auto mb-2">🤖</div>
                <div className="text-sm font-medium text-white">Model Training</div>
                <div className="text-[11px] text-slate-500 mt-1">GradientBoosting, 96% accuracy</div>
              </div>
              <div className="text-teal-500 text-2xl hidden md:block">→</div>
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-xl mx-auto mb-2">🎯</div>
                <div className="text-sm font-medium text-white">Actionable Insights</div>
                <div className="text-[11px] text-slate-500 mt-1">Churn risk, segments, engagement</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ──────────────────────────── */}
      <section id="comparison" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Comparison</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How AssocHub Compares</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">Feature-by-feature against leading AMS platforms. Based on publicly available product documentation.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-lg animate-fade-in-up">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-6 py-4 text-sm font-bold text-slate-700">Feature</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-teal-700 bg-teal-50">AssocHub</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-slate-600">Wild Apricot</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-slate-600">MemberClicks</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center bg-teal-50/30"><ComparisonCell value={row.assocHub} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.wildApricot} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.memberClicks} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Modules Overview ──────────────────────────── */}
      <section id="modules" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Architecture</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{MODULE_COUNT} Integrated Modules</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">Each module is powerful alone. Together, they replace your entire software stack.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => (
              <div
                key={mod.name}
                className="bg-white rounded-xl p-5 text-center border border-slate-200 cursor-default transition-all hover:-translate-y-1 hover:shadow-md animate-fade-in-up"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className="text-2xl mb-2">{mod.icon}</div>
                <div className="font-medium text-[13px]">{mod.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{mod.endpoints} endpoints</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-6 block text-slate-400">Built With</span>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {["Python 3.12", "FastAPI", "SQLAlchemy", "PostgreSQL 16", "pgvector", "Next.js 16", "React 19", "TypeScript", "Tailwind CSS", "Scikit-learn", "OpenRouter", "Redis", "Celery", "Stripe", "Resend"].map((tech) => (
              <span key={tech} className="text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors cursor-default">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Open Source ──────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Open Source</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Built in the Open</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">MIT-licensed and publicly auditable. Every line of code is on GitHub.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Open Source</div>
                  <div className="text-xs text-slate-400">MIT License · GitHub</div>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600">View the full source code, report issues, and contribute. Every feature is auditable and verifiable.</p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold">Self-Hosted</div>
                  <div className="text-xs text-slate-400">Your data, your server</div>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-slate-600">Deploy on your own infrastructure with Docker or systemd. No vendor lock-in, no data sharing, no surprise pricing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────── */}
      <section className="py-32 px-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="relative max-w-3xl mx-auto text-center animate-fade-in-up">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white">
            Ready to Manage<br />Smarter?
          </h2>
          <p className="text-lg mb-10 max-w-lg mx-auto text-slate-400">
            Open source. Free to self-host. AI built into every module. Start in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="font-semibold px-10 py-3.5 rounded-xl text-[15px] bg-teal-500 text-white hover:bg-teal-400 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Create Free Account
            </Link>
            <Link href="/login" className="font-medium px-8 py-3.5 rounded-xl text-[15px] text-slate-400 border border-slate-600 hover:border-slate-500 bg-transparent transition-all">
              Demo Login →
            </Link>
          </div>
          <p className="text-xs mt-6 text-slate-500">No credit card required · Open source (MIT License) · Self-hosted</p>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-[13px] text-slate-500">AssocHub</span>
            <span className="text-[13px] text-slate-300">·</span>
            <span className="text-[13px] text-slate-400">Open Source AI-Powered Association Management</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-slate-400">
            <a href="https://github.com/tahiralatif/Association-Management-System" className="hover:text-teal-600 transition-colors">GitHub</a>
            <Link href="/login" className="hover:text-teal-600 transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-teal-600 transition-colors">Register</Link>
            <span>FastAPI · Next.js · Scikit-learn</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
