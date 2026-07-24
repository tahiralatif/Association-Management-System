"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";
import { motion, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import * as THREE from "three";
import Logo from "@/components/logo";
import { useAuth } from "@/lib/auth-context";

const C = {
  bg: "#ffffff", surface: "#f8fafb", border: "#e2e8f0", borderHover: "#cbd5e1",
  teal: "#0d9488", tealLight: "#14b8a6", tealPale: "#ccfbf1", tealPalest: "#f0fdfa",
  green: "#065f46", greenDark: "#064e3b", greenLight: "#047857",
  text: "#0f172a", textSecondary: "#475569", textMuted: "#94a3b8",
  red: "#dc2626", redBg: "#fef2f2", redBorder: "#fecaca",
  amber: "#d97706", amberBg: "#fffbeb",
};

/* ─── 3D Background ─── */
function BgScene() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.05;
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.3} color={C.tealLight} />
      <Float speed={0.5} rotationIntensity={0.15} floatIntensity={0.3}>
        <mesh ref={ref} position={[3, 0, -5]} scale={2.5}>
          <icosahedronGeometry args={[1, 2]} />
          <MeshDistortMaterial color={C.teal} roughness={0.2} metalness={0.6} distort={0.15} speed={0.5} transparent opacity={0.06} />
        </mesh>
      </Float>
      <Float speed={0.3} floatIntensity={0.2}>
        <mesh position={[-4, 1, -6]} scale={1.8}>
          <sphereGeometry args={[1, 64, 64]} />
          <MeshDistortMaterial color={C.green} roughness={0.3} metalness={0.5} distort={0.1} speed={0.3} transparent opacity={0.04} />
        </mesh>
      </Float>
    </>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  const { isAuthenticated } = useAuth();
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
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: C.text }}>AssocHub</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-[13px] font-medium transition-colors" style={{ color: C.textSecondary }}>Home</Link>
          <Link href="/why" className="text-[13px] font-medium transition-colors" style={{ color: C.teal }}>Why AssocHub</Link>
          <a href="https://tahiralatif.github.io/Association-Management-System/" target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium transition-colors" style={{ color: C.teal }}>📖 Docs</a>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/dashboard" className="text-[13px] font-semibold px-5 py-2 rounded-lg transition-all" style={{ backgroundColor: C.teal, color: "#fff" }}>Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium px-4 py-2" style={{ color: C.textSecondary }}>Sign In</Link>
              <Link href="/register" className="text-[13px] font-semibold px-5 py-2 rounded-lg" style={{ backgroundColor: C.teal, color: "#fff" }}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* ─── Scroll Progress ─── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return <motion.div style={{ scaleX, background: `linear-gradient(90deg, ${C.green}, ${C.teal}, ${C.tealLight})` }} className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60]" />;
}

/* ─── Comparison Data ─── */
const FEATURES = [
  { name: "AI Assistant (built-in)", assoc: true, wild: false, member: false, civi: false },
  { name: "Workflow Automation", assoc: true, wild: "basic", member: "basic", civi: false },
  { name: "Open Source", assoc: true, wild: false, member: false, civi: true },
  { name: "Self-Hosted Option", assoc: true, wild: false, member: false, civi: true },
  { name: "Multi-Tenant", assoc: true, wild: false, member: false, civi: false },
  { name: "Elections / Voting", assoc: true, wild: false, member: false, civi: "plugin" },
  { name: "Ranked Choice Voting", assoc: true, wild: false, member: false, civi: false },
  { name: "Anomaly Detection", assoc: true, wild: false, member: false, civi: false },
  { name: "Churn Prediction", assoc: true, wild: false, member: false, civi: false },
  { name: "Semantic Search (AI)", assoc: true, wild: false, member: false, civi: false },
  { name: "Custom Webhooks", assoc: true, wild: "zapier", member: false, civi: "partial" },
  { name: "Stripe Payments", assoc: true, wild: true, member: true, civi: "ext" },
  { name: "Custom Dashboards", assoc: true, wild: "limited", member: "limited", civi: false },
  { name: "CSV/JSON Export", assoc: true, wild: "partial", member: "partial", civi: "partial" },
  { name: "Full Audit Trail", assoc: true, wild: false, member: false, civi: "partial" },
  { name: "AI Chat Assistant", assoc: true, wild: false, member: false, civi: false },
  { name: "Document Versioning", assoc: true, wild: "partial", member: "partial", civi: false },
  { name: "BG Worker Queue", assoc: true, wild: false, member: false, civi: false },
  { name: "REST API", assoc: "199+", wild: true, member: true, civi: true },
  { name: "Event Management", assoc: true, wild: true, member: true, civi: "partial" },
];

const PRICING = [
  { platform: "AssocHub", price: "Free / ~$29/mo", model: "Flat rate", free: true, highlight: true },
  { platform: "Wild Apricot", price: "$60–$350/mo", model: "Per-contact", free: false },
  { platform: "MemberClicks", price: "$80–$400/mo", model: "Per-contact", free: false },
  { platform: "CiviCRM", price: "Free", model: "Self-hosted", free: true },
  { platform: "GrowthZone", price: "$100–$500/mo", model: "Per-contact", free: false },
];

const WHY_REASONS = [
  {
    num: "01", title: "AI as a Core Engine",
    subtitle: "Not a chatbot widget. A brain.",
    desc: "Every module is AI-enhanced. Churn prediction from member activity. Anomaly detection in finances. Semantic search through documents. AI-generated reports. A chat assistant that actually knows your data.",
    icon: "🧠",
  },
  {
    num: "02", title: "No Per-Contact Pricing",
    subtitle: "Scale without penalty.",
    desc: "Wild Apricot charges $240/mo for 5,000 contacts. AssocHub is free to self-host or ~$29/mo managed — regardless of how many members you have. Your costs don't balloon as you grow.",
    icon: "💰",
  },
  {
    num: "03", title: "Workflows That Actually Work",
    subtitle: "Not just 'email on renewal'.",
    desc: "Visual workflow builder with 12+ action types, conditional branching, delayed execution, signed webhooks, and full run history. Closer to Zapier than an email scheduler.",
    icon: "⚡",
  },
  {
    num: "04", title: "Built-in Elections Module",
    subtitle: "Nobody else has this.",
    desc: "Full election lifecycle — nominations, ranked choice voting, secret ballots, quorum tracking, real-time results. Critical for professional associations and governance bodies.",
    icon: "🗳️",
  },
  {
    num: "05", title: "Open Source & Self-Hosted",
    subtitle: "You own your data.",
    desc: "Modern Python + TypeScript stack. Docker-deployed. pgvector for AI embeddings. Not a 15-year-old PHP codebase. Your data, your infrastructure, your future.",
    icon: "🔓",
  },
  {
    num: "06", title: "Multi-Tenant Architecture",
    subtitle: "One install, unlimited orgs.",
    desc: "Each tenant gets isolated data, separate branding, and independent configurations. Perfect for management companies, umbrella organizations, or SaaS deployments.",
    icon: "🏢",
  },
];

function FeatureIcon({ value }: { value: boolean | string }) {
  if (value === true) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: C.tealPalest, color: C.teal }}>✓</span>;
  if (value === false) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ backgroundColor: C.redBg, color: C.red }}>✕</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-medium" style={{ backgroundColor: C.amberBg, color: C.amber }}>⚠</span>;
}

/* ═══════════════════════════════════════════════════════════ */
export default function WhyPage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: C.bg, color: C.text }}>
      <ScrollProgress />
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="absolute inset-0" style={{ opacity: 0.3 }}>
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
            <BgScene />
          </Canvas>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-white" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(13,148,136,0.04) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8" style={{ backgroundColor: C.tealPalest, border: `1px solid ${C.tealPale}` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.teal }} />
              <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: C.teal }}>Open Source · AI-Powered</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
          >
            Why <span style={{ color: C.teal }}>AssocHub</span>?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            style={{ color: C.textSecondary }}
          >
            We compared every major Association Management Software.
            Here&apos;s why AssocHub is different — and better.
          </motion.p>
        </div>
      </section>

      {/* ─── Key Reasons ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>Advantages</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">6 Reasons to Choose AssocHub</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.textMuted }}>Not marketing fluff. Real, verifiable differences.</p>
          </motion.div>

          <div className="space-y-6">
            {WHY_REASONS.map((r, i) => (
              <motion.div
                key={r.num}
                initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
                className="rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-start gap-6"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-3xl">{r.icon}</span>
                  <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: C.teal }}>{r.num}</span>
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-1" style={{ color: C.text }}>{r.title}</h3>
                  <p className="text-sm font-medium mb-3" style={{ color: C.teal }}>{r.subtitle}</p>
                  <p className="text-[15px] leading-relaxed" style={{ color: C.textSecondary }}>{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Feature Comparison Table ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>Comparison</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Feature-by-Feature</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.textMuted }}>20 critical features compared across 4 platforms</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${C.border}`, boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}
          >
            {/* Table header */}
            <div className="grid grid-cols-4 text-[12px] font-bold uppercase tracking-[0.1em] py-4 px-6" style={{ backgroundColor: C.greenDark, color: "#fff" }}>
              <div>Feature</div>
              <div className="text-center">AssocHub</div>
              <div className="text-center">Wild Apricot</div>
              <div className="text-center">CiviCRM</div>
            </div>

            {/* Table rows */}
            {FEATURES.map((f, i) => (
              <div
                key={f.name}
                className="grid grid-cols-4 items-center py-3.5 px-6 text-[13px] transition-colors duration-200"
                style={{
                  backgroundColor: i % 2 === 0 ? C.bg : C.surface,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div className="font-medium" style={{ color: C.text }}>{f.name}</div>
                <div className="flex justify-center"><FeatureIcon value={f.assoc} /></div>
                <div className="flex justify-center"><FeatureIcon value={f.wild} /></div>
                <div className="flex justify-center"><FeatureIcon value={f.civi} /></div>
              </div>
            ))}
          </motion.div>

          <div className="flex items-center justify-center gap-6 mt-6 text-[12px]" style={{ color: C.textMuted }}>
            <span className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]" style={{ backgroundColor: C.tealPalest, color: C.teal }}>✓</span> Full support</span>
            <span className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]" style={{ backgroundColor: C.amberBg, color: C.amber }}>⚠</span> Limited</span>
            <span className="flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]" style={{ backgroundColor: C.redBg, color: C.red }}>✕</span> Not available</span>
          </div>
        </div>
      </section>

      {/* ─── Pricing Comparison ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>Pricing</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Transparent Pricing</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.textMuted }}>No per-contact surprises. No hidden fees.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {PRICING.map((p, i) => (
              <motion.div
                key={p.platform}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl p-7 relative overflow-hidden"
                style={{
                  backgroundColor: C.bg,
                  border: p.highlight ? `2px solid ${C.teal}` : `1px solid ${C.border}`,
                  boxShadow: p.highlight ? `0 8px 30px rgba(13,148,136,0.12)` : "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                {p.highlight && (
                  <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg" style={{ backgroundColor: C.teal, color: "#fff" }}>
                    Best Value
                  </div>
                )}
                <h3 className="text-lg font-bold mb-2" style={{ color: p.highlight ? C.teal : C.text }}>{p.platform}</h3>
                <div className="text-2xl font-bold mb-1" style={{ color: C.text }}>{p.price}</div>
                <div className="text-[13px] mb-3" style={{ color: C.textMuted }}>{p.model}</div>
                <div className="flex items-center gap-2">
                  {p.free ? (
                    <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: C.tealPalest, color: C.teal }}>Free tier</span>
                  ) : (
                    <span className="text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: C.redBg, color: C.red }}>No free tier</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pricing callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 rounded-2xl p-8 text-center"
            style={{ backgroundColor: C.greenDark, color: "#fff", boxShadow: "0 12px 40px rgba(6,78,59,0.15)" }}
          >
            <h3 className="text-2xl font-bold mb-3">AssocHub: Free to Start, Scales Without Limits</h3>
            <p className="text-[15px] opacity-80 max-w-2xl mx-auto leading-relaxed">
              Wild Apricot charges $240/mo for 5,000 contacts. AssocHub is free to self-host
              or ~$29/mo managed — regardless of how many members you have.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── AI Deep Dive ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>AI Capabilities</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">AI That Knows Your Data</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.textMuted }}>6 AI features no other AMS offers</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "💬", title: "Chat Assistant", desc: "Ask questions in natural language. 'How many members renewed this month?' — instant answer." },
              { icon: "📊", title: "AI Insights", desc: "Cross-module intelligence. Spots trends across members, finances, and events simultaneously." },
              { icon: "🔍", title: "Semantic Search", desc: "Find documents by meaning, not keywords. Vector embeddings power concept-based retrieval." },
              { icon: "📉", title: "Churn Prediction", desc: "RFM-based scoring identifies at-risk members before they leave. Take action proactively." },
              { icon: "⚠️", title: "Anomaly Detection", desc: "Z-score and IQR analysis catches unusual financial transactions and attendance patterns." },
              { icon: "📝", title: "Document Generation", desc: "AI-polished reports, minutes, and letters. Structured output from your association data." },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(13,148,136,0.1)" }}
                className="rounded-2xl p-7 transition-all duration-300"
                style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
              >
                <span className="text-2xl mb-4 block">{f.icon}</span>
                <h3 className="text-[17px] font-semibold mb-2" style={{ color: C.text }}>{f.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: C.textSecondary }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who Should Use ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-16">
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>Recommendation</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Which AMS is Right for You?</h2>
          </motion.div>

          <div className="space-y-4">
            {[
              { need: "Quick setup, no code, basic membership", pick: "Wild Apricot", color: C.textSecondary },
              { need: "Full control, AI-powered, modern tech stack", pick: "AssocHub", color: C.teal },
              { need: "Free & open source, basic CRM only", pick: "CiviCRM", color: C.textSecondary },
              { need: "Enterprise features, unlimited budget", pick: "MemberClicks / GrowthZone", color: C.textSecondary },
              { need: "Scale without per-contact pricing", pick: "AssocHub", color: C.teal },
            ].map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl p-5"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
              >
                <span className="text-[14px]" style={{ color: C.textSecondary }}>If you need: <strong style={{ color: C.text }}>{r.need}</strong></span>
                <span className="text-[13px] font-semibold px-3 py-1 rounded-lg shrink-0" style={{ backgroundColor: r.pick === "AssocHub" ? C.tealPalest : C.surface, color: r.color, border: r.pick === "AssocHub" ? `1px solid ${C.tealPale}` : `1px solid ${C.border}` }}>
                  → {r.pick}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              <span>Ready to </span>
              <span style={{ color: C.teal }}>Switch?</span>
            </h2>
            <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: C.textSecondary }}>
              Start with a free demo. No credit card required. Full access to every feature.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="font-semibold px-10 py-3.5 rounded-xl text-[15px] transition-all hover:-translate-y-0.5" style={{ backgroundColor: C.teal, color: "#fff", boxShadow: "0 4px 14px rgba(13,148,136,0.3)" }}>
                Start Free Trial
              </Link>
              <Link href="/login" className="font-medium px-8 py-3.5 rounded-xl text-[15px] transition-all" style={{ color: C.textSecondary, border: `1px solid ${C.border}`, backgroundColor: C.bg }}>
                Demo Login →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 px-6" style={{ borderTop: `1px solid ${C.border}` }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="text-[13px]" style={{ color: C.textSecondary }}>AssocHub</span>
            <span className="text-[13px]" style={{ color: C.textMuted }}>·</span>
            <span className="text-[13px]" style={{ color: C.textMuted }}>AI-Powered Association Management</span>
          </div>
          <div className="text-[12px]" style={{ color: C.textMuted }}>FastAPI · Next.js · Groq AI</div>
        </div>
      </footer>
    </div>
  );
}
