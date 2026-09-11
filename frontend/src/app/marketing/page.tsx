"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Logo from "@/components/logo";

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const API_ENDPOINTS = 231;
const MODULE_COUNT = 11;

const MODULES = [
  { name: "Dashboard", icon: "📊", desc: "KPIs, activity feed, AI insights, financial summary", endpoints: 15, color: "#0d9488" },
  { name: "Members", icon: "👥", desc: "Groups, tags, bulk ops, CSV export, status mgmt", endpoints: 37, color: "#0891b2" },
  { name: "Finances", icon: "💰", desc: "Invoices, expenses, budgets, dues, Stripe checkout", endpoints: 37, color: "#059669" },
  { name: "Events", icon: "📅", desc: "Registration, speakers, sessions, check-in, feedback", endpoints: 21, color: "#7c3aed" },
  { name: "Communications", icon: "📧", desc: "Campaigns, announcements, surveys, drip sequences", endpoints: 36, color: "#2563eb" },
  { name: "Elections", icon: "🗳️", desc: "Positions, nominations, ranked-choice voting, results", endpoints: 18, color: "#dc2626" },
  { name: "Documents", icon: "📁", desc: "Upload, versioning, comments, sharing, categories", endpoints: 21, color: "#ca8a04" },
  { name: "Workflows", icon: "⚙️", desc: "Visual builder, triggers, delays, conditions, history", endpoints: 16, color: "#ea580c" },
  { name: "AI Engine", icon: "🤖", desc: "Chat, churn prediction, segmentation, semantic search", endpoints: 12, color: "#0d9488" },
  { name: "Analytics", icon: "📈", desc: "Dashboards, reports, KPIs, interactive charts, exports", endpoints: 15, color: "#6366f1" },
  { name: "Integrations", icon: "🔗", desc: "Webhooks, third-party connections, event logs", endpoints: 17, color: "#8b5cf6" },
];

const AI_FEATURES = [
  { title: "Churn Prediction", desc: "GradientBoosting classifier, 10 features, 96% CV accuracy. Weekly retraining via Celery.", icon: "📉", badge: "Scikit-learn" },
  { title: "Engagement Scoring", desc: "5-factor weighted: events, payments, email, logins, group participation.", icon: "📊", badge: "Multi-factor" },
  { title: "Smart Segmentation", desc: "6 auto-segments: Champions, Loyal, At Risk, New, Dormant, High Value.", icon: "🎯", badge: "AI-driven" },
  { title: "AI Chat Assistant", desc: "Natural language queries about members, finances, events.", icon: "💬", badge: "OpenRouter" },
  { title: "Anomaly Detection", desc: "Z-score and IQR analysis. Automated flagging of unusual patterns.", icon: "🔍", badge: "Statistical" },
  { title: "Semantic Search", desc: "pgvector embeddings for meaning-based document search.", icon: "🔎", badge: "pgvector" },
  { title: "Document Generation", desc: "AI-polished document creation from templates with LLM prose.", icon: "📝", badge: "LLM-assisted" },
  { title: "Insights Engine", desc: "Cross-module trend analysis with severity ranking.", icon: "💡", badge: "Cross-module" },
];

const COMPARISON = [
  { feature: "ML Churn Prediction", hub: true, wa: false, mc: false },
  { feature: "Engagement Scoring", hub: true, wa: false, mc: false },
  { feature: "Smart Segmentation", hub: true, wa: false, mc: false },
  { feature: "AI Chat (built-in)", hub: true, wa: false, mc: false },
  { feature: "Anomaly Detection", hub: true, wa: false, mc: false },
  { feature: "Semantic Search", hub: true, wa: false, mc: false },
  { feature: "Workflow Automation", hub: "full", wa: false, mc: "partial" },
  { feature: "Elections & Voting", hub: true, wa: false, mc: false },
  { feature: "Ranked Choice Voting", hub: true, wa: false, mc: false },
  { feature: "Budget Management", hub: true, wa: false, mc: false },
  { feature: "Multi-Tenant", hub: true, wa: false, mc: false },
  { feature: "2FA / TOTP", hub: true, wa: true, mc: false },
  { feature: "Drip Campaigns", hub: true, wa: true, mc: false },
  { feature: "Stripe Checkout", hub: true, wa: true, mc: true },
  { feature: "Open Source (MIT)", hub: true, wa: false, mc: false },
  { feature: "Self-Hosted", hub: true, wa: false, mc: false },
  { feature: "Per-Contact Pricing", hub: "$0", wa: "$60–350/mo", mc: "$80–400/mo" },
  { feature: "API Endpoints", hub: "231", wa: "Limited", mc: "Limited" },
];

const FAQS = [
  { q: "What is AssocHub?", a: "An open-source, AI-powered association management platform with 11 integrated modules and 231 API endpoints. Handles members, finances, events, communications, elections, documents, analytics, workflows, and integrations — all in one system." },
  { q: "How does the ML work?", a: "Three scikit-learn systems: Churn Prediction (GradientBoosting, 96% accuracy), Engagement Scoring (5-factor weighted), and Smart Segmentation (6 auto-segments). Plus OpenRouter LLMs for chat, anomaly detection, semantic search, and document generation. All models retrain weekly via Celery." },
  { q: "What's the churn prediction accuracy?", a: "96% cross-validation accuracy across 10 features: login recency, event attendance, payment history, membership tenure, engagement score, and more. Identifies at-risk members before they lapse." },
  { q: "How does engagement scoring work?", a: "Each member gets a 0–1 score from 5 weighted factors: event attendance (25%), payment timeliness (25%), email engagement (20%), login frequency (15%), group participation (15%). Scores update weekly." },
  { q: "Is there per-contact pricing?", a: "No. AssocHub is open source and free to self-host. Managed hosting at a flat rate regardless of member count. Unlike Wild Apricot ($60–350/mo) or MemberClicks ($80–400/mo), your costs don't scale with membership." },
  { q: "Can I self-host?", a: "Yes. MIT-licensed. Deploy with Docker or systemd. Runs on PostgreSQL 16 (with pgvector for AI), Redis for background tasks, and Celery for job processing." },
  { q: "What elections features?", a: "Full election lifecycle: create elections, open nominations, accept/decline, ranked-choice voting with secret ballots, quorum tracking, and real-time results. No other AMS platform includes this natively." },
  { q: "How many API endpoints?", a: "231 REST endpoints across 11 modules. Full OpenAPI/Swagger docs at /docs on any running instance." },
];

const TECH_STACK = [
  { name: "Python 3.12", icon: "🐍" },
  { name: "FastAPI", icon: "⚡" },
  { name: "PostgreSQL 16", icon: "🐘" },
  { name: "pgvector", icon: "🔮" },
  { name: "Next.js 16", icon: "▲" },
  { name: "React 19", icon: "⚛️" },
  { name: "TypeScript", icon: "📘" },
  { name: "Tailwind CSS", icon: "🎨" },
  { name: "Scikit-learn", icon: "🤖" },
  { name: "OpenRouter", icon: "🧠" },
  { name: "Redis", icon: "🔴" },
  { name: "Celery", icon: "🌿" },
  { name: "Stripe", icon: "💳" },
  { name: "Resend", icon: "✉️" },
  { name: "SQLAlchemy", icon: "🔗" },
];

/* ═══════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════ */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useCounter(end: number, duration = 2000, trigger = true) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 4)) * end));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, trigger]);
  return count;
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════ */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["Features", "AI & ML", "Comparison", "Modules"];
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(255,255,255,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
        boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.04)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo size="sm" />
          <span className="font-semibold text-[15px] tracking-tight text-slate-900">AssocHub</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {links.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/[&\s]+/g, "-")}`} className="text-[13px] font-medium text-slate-500 hover:text-teal-600 px-3 py-1.5 rounded-lg hover:bg-teal-50/60 transition-all">
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-[13px] font-medium px-3.5 py-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-all">
            Sign In
          </Link>
          <Link href="/register" className="text-[13px] font-semibold px-5 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-sm hover:shadow-md">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED SECTION WRAPPER
   ═══════════════════════════════════════════════════════════ */

function Section({ children, className = "", id = "" }: { children: React.ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div ref={ref} id={id} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function MarketingPage() {
  const { ref: heroRef, visible: heroVis } = useInView(0.05);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <Navbar />

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-teal-50/80 via-emerald-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-cyan-50/40 rounded-full blur-3xl" />
          <div className="absolute top-60 left-0 w-[300px] h-[300px] bg-teal-50/30 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 grid-pattern opacity-40" />
        </div>

        <div ref={heroRef} className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border transition-all duration-700 ${heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ backgroundColor: "rgba(13,148,136,0.06)", borderColor: "rgba(13,148,136,0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-[0.15em] uppercase text-teal-700">Open Source · AI-Powered · Self-Hosted</span>
          </div>

          {/* Headline */}
          <h1 className={`text-5xl md:text-7xl lg:text-[5.5rem] font-bold leading-[1.03] tracking-tight mb-8 transition-all duration-700 delay-100 ${heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span className="block">Association Management</span>
            <span className="block mt-2" style={{
              background: "linear-gradient(135deg, #0d9488, #14b8a6, #06b6d4, #0d9488)",
              backgroundSize: "300% 300%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradientShift 6s ease infinite",
            }}>With a Brain</span>
          </h1>

          {/* Sub */}
          <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed text-slate-500 transition-all duration-700 delay-200 ${heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            {MODULE_COUNT} integrated modules. {API_ENDPOINTS} API endpoints. ML-powered churn prediction, engagement scoring, and smart segmentation. <span className="text-teal-600 font-medium">Zero per-contact fees.</span>
          </p>

          {/* CTAs */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${heroVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <Link href="/register" className="group relative font-semibold px-8 py-3.5 rounded-xl text-[15px] bg-teal-600 text-white hover:bg-teal-700 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 overflow-hidden">
              <span className="relative z-10">Start Free — No Credit Card</span>
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link href="/login" className="font-medium px-6 py-3.5 rounded-xl text-[15px] text-slate-600 border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 bg-white transition-all hover:shadow-sm">
              Demo Login →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <Section className="py-6 px-6 -mt-4">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl p-8 md:p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl relative overflow-hidden">
            {/* Shimmer accent */}
            <div className="absolute inset-0 shimmer-effect opacity-30" />
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem end={API_ENDPOINTS} label="API Endpoints" />
              <StatItem end={MODULE_COUNT} label="Modules" />
              <StatItem end={8} label="AI Features" />
              <StatItem end={0} label="Per-Contact Fee" prefix="$" />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════ FEATURES ═══════════ */}
      <Section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Platform</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Everything in One System</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">No plugins. No add-ons. Every module shares the same database, auth, and AI engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULES.map((mod, i) => (
              <StaggerCard key={mod.name} index={i}>
                <div className="group bg-white rounded-2xl p-7 border border-slate-200 transition-all duration-300 cursor-default hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 h-full">
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${mod.color}10`, border: `1px solid ${mod.color}20` }}
                    >
                      {mod.icon}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">{mod.endpoints} endpoints</span>
                  </div>
                  <h3 className="text-[17px] font-semibold mb-2 group-hover:text-teal-600 transition-colors">{mod.name}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500">{mod.desc}</p>
                </div>
              </StaggerCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════ AI & ML ═══════════ */}
      <section id="ai--ml" className="py-24 px-6 relative overflow-hidden">
        {/* Dark background with gradient orbs */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 dot-pattern opacity-20" />

        <div className="relative max-w-7xl mx-auto">
          <Section className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-400">AI & Machine Learning</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">Not a Chatbot.<br />A Brain.</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-400">8 AI features built into the platform — not bolted on as plugins.</p>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {AI_FEATURES.map((feat, i) => (
              <StaggerCard key={feat.title} index={i}>
                <div className="group bg-white/[0.04] border border-white/[0.08] rounded-2xl p-7 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 h-full">
                  <div className="flex items-start justify-between mb-5">
                    <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{feat.icon}</div>
                    <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-teal-400 bg-teal-400/10 px-2.5 py-1 rounded-full border border-teal-400/20">{feat.badge}</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-400">{feat.desc}</p>
                </div>
              </StaggerCard>
            ))}
          </div>

          {/* Pipeline visual */}
          <Section className="mt-12">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute inset-0 shimmer-effect opacity-20" />
              <h3 className="text-lg font-semibold text-white mb-8 text-center relative">How the ML Pipeline Works</h3>
              <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
                {[
                  { icon: "📊", title: "Collect", sub: "Members, payments, logins, events" },
                  { icon: "⚙️", title: "Extract", sub: "10 engineered features" },
                  { icon: "🤖", title: "Train", sub: "GradientBoosting, 96% accuracy" },
                  { icon: "🎯", title: "Predict", sub: "Churn risk, segments, engagement" },
                ].map((step, i) => (
                  <div key={i} className="text-center relative">
                    <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-105 transition-transform">{step.icon}</div>
                    <div className="text-sm font-semibold text-white mb-1">{step.title}</div>
                    <div className="text-[11px] text-slate-500 leading-relaxed">{step.sub}</div>
                    {i < 3 && <div className="hidden md:block absolute top-7 -right-4 text-teal-500/40 text-xl">→</div>}
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ═══════════ COMPARISON ═══════════ */}
      <Section id="comparison" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Comparison</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">How AssocHub Compares</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">Feature-by-feature against leading AMS platforms.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-bold text-slate-600 bg-slate-50 border-b border-slate-200">Feature</th>
                  <th className="text-center px-5 py-4 text-sm font-bold text-teal-700 bg-teal-50 border-b border-teal-100 min-w-[120px]">
                    <span className="inline-flex items-center gap-1.5">✦ AssocHub</span>
                  </th>
                  <th className="text-center px-5 py-4 text-sm font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 min-w-[100px]">Wild Apricot</th>
                  <th className="text-center px-5 py-4 text-sm font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 min-w-[100px]">MemberClicks</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{row.feature}</td>
                    <td className="px-5 py-3 text-center bg-teal-50/30"><Cell value={row.hub} /></td>
                    <td className="px-5 py-3 text-center"><Cell value={row.wa} /></td>
                    <td className="px-5 py-3 text-center"><Cell value={row.mc} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* ═══════════ MODULES GRID ═══════════ */}
      <Section id="modules" className="py-24 px-6 bg-slate-50/80">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Architecture</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{MODULE_COUNT} Integrated Modules</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">Each module is powerful alone. Together, they replace your entire stack.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MODULES.map((mod, i) => (
              <StaggerCard key={mod.name} index={i}>
                <div className="bg-white rounded-xl p-5 text-center border border-slate-200 cursor-default transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300 h-full">
                  <div className="text-3xl mb-3">{mod.icon}</div>
                  <div className="font-semibold text-[13px] mb-1">{mod.name}</div>
                  <div className="text-[11px] text-slate-400">{mod.endpoints} endpoints</div>
                </div>
              </StaggerCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════ TECH STACK ═══════════ */}
      <Section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-8 block text-slate-400">Built With</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {TECH_STACK.map((tech) => (
              <span key={tech.name} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-600 px-4 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-100 hover:border-teal-100 transition-all cursor-default">
                <span className="text-base">{tech.icon}</span>
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════ OPEN SOURCE ═══════════ */}
      <Section className="py-24 px-6 bg-slate-50/80">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">Open Source</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Built in the Open</h2>
            <p className="text-lg max-w-xl mx-auto text-slate-500">MIT-licensed and publicly auditable. Every line of code is on GitHub.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Open Source</h3>
              <p className="text-[14px] leading-relaxed text-slate-500">MIT-licensed. View the full source code, report issues, and contribute. Every feature is auditable and verifiable.</p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 hover:-translate-y-0.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Self-Hosted</h3>
              <p className="text-[14px] leading-relaxed text-slate-500">Deploy on your own infrastructure with Docker or systemd. No vendor lock-in, no data sharing, no surprise pricing.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════ FAQ ═══════════ */}
      <Section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block text-teal-600">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════ CTA ═══════════ */}
      <Section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 dot-pattern opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[120px]" />

        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-white">
            Ready to Manage<br />
            <span style={{
              background: "linear-gradient(135deg, #2dd4bf, #14b8a6, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Smarter?</span>
          </h2>
          <p className="text-lg mb-10 max-w-lg mx-auto text-slate-400">
            Open source. Free to self-host. AI built into every module.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="group font-semibold px-10 py-3.5 rounded-xl text-[15px] bg-teal-500 text-white hover:bg-teal-400 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Create Free Account
            </Link>
            <Link href="/login" className="font-medium px-8 py-3.5 rounded-xl text-[15px] text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white bg-transparent transition-all">
              Demo Login →
            </Link>
          </div>
          <p className="text-xs mt-6 text-slate-500">No credit card required · MIT License · Self-hosted</p>
        </div>
      </Section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="py-10 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-[13px] font-medium text-slate-600">AssocHub</span>
            <span className="text-[13px] text-slate-300">·</span>
            <span className="text-[13px] text-slate-400">AI-Powered Association Management</span>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-slate-400">
            <a href="https://github.com/tahiralatif/Association-Management-System" className="hover:text-teal-600 transition-colors">GitHub</a>
            <Link href="/login" className="hover:text-teal-600 transition-colors">Sign In</Link>
            <Link href="/register" className="hover:text-teal-600 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function StatItem({ end, label, prefix = "" }: { end: number; label: string; prefix?: string }) {
  const { ref, visible } = useInView(0.3);
  const count = useCounter(end, 2000, visible);
  return (
    <div ref={ref} className="text-center relative">
      <div className="text-4xl md:text-5xl font-bold tracking-tight text-white">{prefix}{count.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-[0.18em] font-medium mt-2 text-teal-300">{label}</div>
    </div>
  );
}

function StaggerCard({ children, index }: { children: React.ReactNode; index: number }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={`transition-all duration-600 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      style={{ transitionDelay: `${Math.min(index * 60, 300)}ms` }}
    >
      {children}
    </div>
  );
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>;
  if (value === false) return <span className="text-slate-300 text-sm">—</span>;
  return <span className="text-amber-600 text-xs font-semibold bg-amber-50 px-2 py-0.5 rounded-full">{String(value)}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${open ? "border-teal-200 bg-teal-50/30 shadow-sm" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-5 text-left gap-4">
        <span className={`font-semibold text-[15px] transition-colors ${open ? "text-teal-700" : "text-slate-900"}`}>{q}</span>
        <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${open ? "bg-teal-100 text-teal-600 rotate-45" : "bg-slate-100 text-slate-400"}`}>+</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-out ${open ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-6 pb-5 text-[14px] leading-relaxed text-slate-600">{a}</div>
      </div>
    </div>
  );
}
