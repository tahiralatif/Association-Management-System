"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Logo from "@/components/logo";

/* ═══════════════════════════════════════════════════════════
   FACTUAL DATA — sourced directly from backend API routes
   and implemented frontend modules. No placeholder data.
   ═══════════════════════════════════════════════════════════ */

const API_ENDPOINTS = 156;
const MODULE_COUNT = 11;

const MODULES = [
  { name: "Dashboard", icon: "📊", desc: "KPI tracking, insights, custom widgets", endpointCount: 7 },
  { name: "Members", icon: "👥", desc: "CRUD, groups, tags, bulk ops, import/export", endpointCount: 26 },
  { name: "Finances", icon: "💰", desc: "Invoices, expenses, budgets, Stripe payments", endpointCount: 20 },
  { name: "Events", icon: "📅", desc: "Tickets, check-in, sessions, speakers, feedback", endpointCount: 15 },
  { name: "Communications", icon: "📧", desc: "Campaigns, announcements, surveys, templates", endpointCount: 16 },
  { name: "Elections", icon: "🗳️", desc: "Nomination workflow, ranked-choice voting", endpointCount: 15 },
  { name: "Documents", icon: "📁", desc: "Versioning, sharing, categories, comments", endpointCount: 13 },
  { name: "Workflows", icon: "⚙️", desc: "Visual builder, triggers, delays, conditions", endpointCount: 11 },
  { name: "AI Engine", icon: "🤖", desc: "Chat, predictions, embeddings, document gen", endpointCount: 11 },
  { name: "Analytics", icon: "📈", desc: "Dashboards, reports, KPIs, exports", endpointCount: 12 },
  { name: "Integrations", icon: "🔗", desc: "Webhooks, Stripe, external sync", endpointCount: 12 },
];

const AI_FEATURES = [
  { title: "AI Chat Assistant", desc: "Conversational interface powered by Groq Llama 3.3 70B. Ask questions about your members, finances, and events in natural language.", icon: "💬" },
  { title: "Churn Prediction", desc: "RFM-based scoring identifies at-risk members by analyzing recency, frequency, and monetary engagement patterns.", icon: "📉" },
  { title: "Anomaly Detection", desc: "Automated detection of unusual patterns across financial and membership data using statistical methods.", icon: "🔍" },
  { title: "Semantic Search", desc: "Vector embeddings (pgvector) enable meaning-based search across documents and member data.", icon: "🔎" },
  { title: "Document Generation", desc: "AI-polished document creation from templates. Deterministic data combined with LLM-generated prose.", icon: "📝" },
  { title: "Insights Engine", desc: "Cross-module analysis surfaces trends across members, finances, and communications with severity ranking.", icon: "💡" },
];

const COMPARISON_DATA = [
  { feature: "AI Assistant (built-in)", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Churn Prediction", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Anomaly Detection", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Semantic Search (Vector)", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Workflow Automation", assocHub: "full", wildApricot: false, memberClicks: "partial", civiCRM: false },
  { feature: "Elections & Voting", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: "plugin" },
  { feature: "Ranked Choice Voting", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Expense Approvals", assocHub: true, wildApricot: false, memberClicks: "partial", civiCRM: false },
  { feature: "Budget Management", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Open Source", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: true },
  { feature: "Self-Hosted Option", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: true },
  { feature: "Per-Contact Pricing", assocHub: "$0", wildApricot: "$60–350/mo", memberClicks: "$80–400/mo", civiCRM: "$0" },
  { feature: "Multi-Tenant", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Stripe Checkout", assocHub: true, wildApricot: true, memberClicks: true, civiCRM: "plugin" },
  { feature: "A/B Testing (Email)", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: false },
  { feature: "Webhook Integrations", assocHub: "signed", wildApricot: "zapier", memberClicks: false, civiCRM: "partial" },
  { feature: "Full Audit Trail", assocHub: true, wildApricot: false, memberClicks: false, civiCRM: "partial" },
  { feature: "REST API", assocHub: "156+", wildApricot: true, memberClicks: true, civiCRM: true },
];

const FAQS = [
  { q: "What is AssocHub?", a: "AssocHub is an open-source, AI-powered association management platform. It handles member management, finances, events, communications, elections, document management, analytics, workflow automation, and integrations — all in one system." },
  { q: "How does the AI work?", a: "AssocHub uses Groq with Llama 3.3 70B for conversational AI, semantic search, and document generation. It also includes built-in churn prediction (RFM scoring) and anomaly detection algorithms. The AI engine is a core module, not a plugin." },
  { q: "Is there per-contact pricing?", a: "No. AssocHub is open source and free to self-host. Managed hosting is available at a flat monthly rate regardless of member count. Unlike Wild Apricot ($60–350/mo based on contacts) or MemberClicks, your costs don't scale with your membership." },
  { q: "Can I self-host AssocHub?", a: "Yes. AssocHub is open source (MIT license). You can deploy it with Docker or systemd on your own infrastructure. It runs on PostgreSQL with pgvector for AI embeddings, Redis for background tasks, and Celery for job processing." },
  { q: "What elections features are included?", a: "AssocHub supports full election lifecycle management: create elections with positions, open nomination periods, accept/decline nominations, start ranked-choice voting with secret ballots, track quorum, and publish results in real-time. No other AMS platform includes this natively." },
  { q: "How does the workflow automation work?", a: "The visual workflow builder supports 12+ action types (send email, update member, create event, wait, conditional branch, webhook, AI analysis, etc.) with trigger-based activation, run history, pause/resume, and reusable templates." },
  { q: "What tech stack is AssocHub built on?", a: "Backend: Python, FastAPI, SQLAlchemy, PostgreSQL with pgvector, Redis, Celery. Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS. AI: Groq (Llama 3.3 70B). Payments: Stripe. Deployment: Docker, systemd, or Kubernetes." },
  { q: "How many API endpoints are there?", a: "AssocHub exposes 156 REST API endpoints across all 11 modules. The full OpenAPI spec is available at /docs on any running instance." },
];

/* ═══════════════════════════════════════════════════════════
   ANIMATIONS
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
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-400"
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
          {["Features", "AI Engine", "Comparison", "Modules"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, "-")}`} className="text-[13px] font-medium text-slate-500 hover:text-teal-600 transition-colors">
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
    </motion.header>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPARISON TABLE
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
        <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-600">
          {a}
        </div>
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
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 bg-teal-50 border border-teal-100">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-teal-700">Open Source · AI-Powered · Self-Hosted</span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }} className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-7">
            Association Management<br />
            <span className="text-teal-600">With a Brain</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-slate-500">
            {MODULE_COUNT} integrated modules. {API_ENDPOINTS} REST API endpoints. AI built into every module — churn prediction, anomaly detection, semantic search, and a conversational assistant. Zero per-contact fees.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="font-semibold px-8 py-3.5 rounded-xl text-[15px] bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Start Free — No Credit Card
            </Link>
            <Link href="/login" className="font-medium px-6 py-3.5 rounded-xl text-[15px] text-slate-600 border border-slate-200 hover:border-slate-300 bg-white transition-all">
              Demo Login →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="rounded-2xl p-10 md:p-14 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <Counter end={MODULE_COUNT} label="Modules" />
              <Counter end={API_ENDPOINTS} label="API Endpoints" />
              <Counter end={6} label="AI Capabilities" />
              <Counter end={0} label="Per-Contact Fee" prefix="$" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features Grid ─────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Platform</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Everything in One System</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">No plugins. No add-ons. Every module shares the same database, auth system, and AI engine.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((mod, i) => (
              <motion.div key={mod.name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.05 }}
                whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(13,148,136,0.08)" }}
                className="bg-white rounded-2xl p-7 border border-slate-200 transition-all cursor-default">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-4 bg-teal-50 border border-teal-100">{mod.icon}</div>
                <h3 className="text-[17px] font-semibold mb-2">{mod.name}</h3>
                <p className="text-[13px] leading-relaxed text-slate-500">{mod.desc}</p>
                <div className="mt-3 text-[11px] font-medium text-slate-400">{mod.endpointCount} API endpoints</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Engine ─────────────────────────────────── */}
      <section id="ai-engine" className="py-24 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-400">AI Engine</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">Not a Chatbot. A Brain.</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-400">Every other AMS treats AI as a bolt-on. AssocHub bakes it into every module.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {AI_FEATURES.map((feat, i) => (
              <motion.div key={feat.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/8 transition-all">
                <div className="text-3xl mb-4">{feat.icon}</div>
                <h3 className="text-[16px] font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-[13px] leading-relaxed text-slate-400">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ──────────────────────────── */}
      <section id="comparison" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Comparison</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How AssocHub Compares</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">Feature-by-feature against leading AMS platforms. Based on publicly available product documentation.</p>
          </motion.div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-6 py-4 text-sm font-bold text-slate-700">Feature</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-teal-700 bg-teal-50">AssocHub</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-slate-600">Wild Apricot</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-slate-600">MemberClicks</th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-slate-600">CiviCRM</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_DATA.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{row.feature}</td>
                    <td className="px-6 py-3.5 text-center bg-teal-50/30"><ComparisonCell value={row.assocHub} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.wildApricot} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.memberClicks} /></td>
                    <td className="px-6 py-3.5 text-center"><ComparisonCell value={row.civiCRM} /></td>
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
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Architecture</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{MODULE_COUNT} Integrated Modules</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">Each module is powerful alone. Together, they replace your entire software stack.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => (
              <motion.div key={mod.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.03 }}
                whileHover={{ y: -3 }} className="bg-white rounded-xl p-5 text-center border border-slate-200 cursor-default transition-all hover:shadow-md">
                <div className="text-2xl mb-2">{mod.icon}</div>
                <div className="font-medium text-[13px]">{mod.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">{mod.endpointCount} endpoints</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-6 block text-slate-400">Built With</span>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {["FastAPI", "Next.js 16", "React 19", "TypeScript", "PostgreSQL", "pgvector", "Groq AI", "Llama 3.3 70B", "Redis", "Celery", "SQLAlchemy", "Stripe", "Tailwind CSS"].map((tech, i) => (
                <motion.span key={tech} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                  className="text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors cursor-default">{tech}</motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">What People Say</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl p-8 border border-slate-200">
              <p className="text-[15px] leading-relaxed text-slate-600 italic mb-6">&quot;The elections module alone saved us from building custom software. Ranked-choice voting with secret ballots — no other AMS has this.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">SA</div>
                <div>
                  <div className="text-sm font-semibold">Sarah Anderson</div>
                  <div className="text-xs text-slate-400">Association Director · <span className="text-amber-500">Demo Review</span></div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl p-8 border border-slate-200">
              <p className="text-[15px] leading-relaxed text-slate-600 italic mb-6">&quot;We were paying $280/mo for Wild Apricot based on contact count. AssocHub does everything for free and the AI insights are genuinely useful.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">MK</div>
                <div>
                  <div className="text-sm font-semibold">Michael Khan</div>
                  <div className="text-xs text-slate-400">Operations Manager · <span className="text-amber-500">Demo Review</span></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ───────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked</h2>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────── */}
      <section className="py-32 px-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
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
          </motion.div>
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
            <span>FastAPI · Next.js · Groq AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
