"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, MeshWobbleMaterial, Sphere, Torus, Icosahedron } from "@react-three/drei";
import { motion, useScroll, useSpring } from "framer-motion";
import Link from "next/link";
import * as THREE from "three";
import Logo from "@/components/logo";

/* ═══════════════════════════════════════════════════════════
   COLORS
   white bg · teal primary · dark green accent · charcoal text
   ═══════════════════════════════════════════════════════════ */

const C = {
  bg: "#ffffff",
  surface: "#f8fafb",
  border: "#e2e8f0",
  borderHover: "#cbd5e1",
  teal: "#0d9488",
  tealLight: "#14b8a6",
  tealPale: "#ccfbf1",
  tealPalest: "#f0fdfa",
  green: "#065f46",
  greenDark: "#064e3b",
  greenLight: "#047857",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
};

/* ═══════════════════════════════════════════════════════════
   3D Scene
   ═══════════════════════════════════════════════════════════ */

function FloatingShape({
  position, color, speed = 1, distort = 0.3, scale = 1, shape = "sphere",
}: {
  position: [number, number, number]; color: string; speed?: number;
  distort?: number; scale?: number; shape?: "sphere" | "torus" | "icosahedron";
}) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed;
    ref.current.rotation.x = t * 0.2;
    ref.current.rotation.y = t * 0.12;
    ref.current.position.y = position[1] + Math.sin(t * 0.35) * 0.2;
  });
  const geo = useMemo(() => {
    switch (shape) {
      case "torus": return <torusGeometry args={[1, 0.35, 48, 80]} />;
      case "icosahedron": return <icosahedronGeometry args={[1, 1]} />;
      default: return <sphereGeometry args={[1, 64, 64]} />;
    }
  }, [shape]);
  return (
    <Float speed={speed * 0.35} rotationIntensity={0.2} floatIntensity={0.6}>
      <mesh ref={ref} position={position} scale={scale}>
        {geo}
        <MeshDistortMaterial color={color} roughness={0.15} metalness={0.7} distort={distort} speed={speed} transparent opacity={0.18} />
      </mesh>
    </Float>
  );
}

function Particles({ count = 120 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const pos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      p[i] = (Math.random() - 0.5) * 24;
      p[i + 1] = (Math.random() - 0.5) * 18;
      p[i + 2] = (Math.random() - 0.5) * 12;
    }
    return p;
  }, [count]);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.015} color={C.teal} transparent opacity={0.25} sizeAttenuation />
    </points>
  );
}

function HeroScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} color={C.tealLight} />
      <pointLight position={[-5, -3, -5]} intensity={0.25} color={C.green} />
      <FloatingShape position={[-3, 0.5, -2]} color={C.teal} speed={0.8} distort={0.3} scale={1.3} shape="sphere" />
      <FloatingShape position={[3.5, -0.2, -1.5]} color={C.tealLight} speed={0.6} distort={0.2} scale={0.85} shape="torus" />
      <FloatingShape position={[-1.5, -1, -3]} color={C.green} speed={1.0} distort={0.35} scale={0.65} shape="icosahedron" />
      <FloatingShape position={[2, 1.5, -4]} color={C.greenLight} speed={1.2} distort={0.15} scale={1.0} shape="sphere" />
      <FloatingShape position={[-4, -0.5, -4.5]} color={C.tealPale} speed={0.5} distort={0.4} scale={0.55} shape="icosahedron" />
      <Particles count={150} />
    </>
  );
}

function CtaScene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 3]} intensity={0.4} color={C.teal} />
      <Sphere args={[1.6, 64, 64]}>
        <MeshWobbleMaterial color={C.greenDark} factor={0.2} speed={0.6} wireframe transparent opacity={0.12} />
      </Sphere>
      <Particles count={60} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   Animations
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
      <div className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: C.greenDark }}>{prefix}{count.toLocaleString()}{suffix}</div>
      <div className="text-xs uppercase tracking-[0.18em] font-medium mt-2" style={{ color: C.teal }}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Navbar
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
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
        boxShadow: scrolled ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: C.text }}>AssocHub</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Platform", "Modules"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-[13px] font-medium transition-colors duration-300" style={{ color: C.textSecondary }}>
              {item}
            </a>
          ))}
          <a
            href="https://tahiralatif.github.io/Association-Management-System/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium transition-colors duration-300"
            style={{ color: C.teal }}
          >
            📖 Docs
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-medium px-4 py-2 transition-colors duration-300" style={{ color: C.textSecondary }}>
            Sign In
          </Link>
          <Link
            href="/register"
            className="text-[13px] font-semibold px-5 py-2 rounded-lg transition-all duration-300"
            style={{ backgroundColor: C.teal, color: "#fff", boxShadow: "0 2px 8px rgba(13,148,136,0.25)" }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

/* ═══════════════════════════════════════════════════════════
   Scroll progress
   ═══════════════════════════════════════════════════════════ */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      style={{ scaleX, background: `linear-gradient(90deg, ${C.green}, ${C.teal}, ${C.tealLight})` }}
      className="fixed top-0 left-0 right-0 h-[2px] origin-left z-[60]"
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   Feature Card
   ═══════════════════════════════════════════════════════════ */

function FeatureCard({ icon, title, description, delay }: { icon: string; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: "0 8px 30px rgba(13,148,136,0.1)" }}
      className="rounded-2xl p-7 transition-all duration-300 cursor-default"
      style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-5"
        style={{ backgroundColor: C.tealPalest, border: `1px solid ${C.tealPale}` }}
      >
        {icon}
      </div>
      <h3 className="text-[17px] font-semibold mb-2" style={{ color: C.text }}>{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: C.textSecondary }}>{description}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: C.bg, color: C.text }}>
      <ScrollProgress />
      <Navbar />

      {/* ─── Hero ───────────────────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0" style={{ opacity: 0.4 }}>
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
            <HeroScene />
          </Canvas>
        </div>

        {/* Soft gradient overlays on white */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/30 to-white" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(13,148,136,0.04) 0%, transparent 65%)" }} />

        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8"
              style={{ backgroundColor: C.tealPalest, border: `1px solid ${C.tealPale}` }}
            >
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: C.teal }} />
              <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: C.teal }}>AI-Powered Platform</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-[80px] font-bold leading-[1.05] tracking-tight mb-7"
          >
            <span style={{ color: C.text }}>Manage</span>{" "}
            <span style={{ color: C.teal }}>Smarter</span>
            <br />
            <span style={{ color: C.text }}>Grow</span>{" "}
            <span style={{ color: C.green }}>Faster</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.75 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ color: C.textSecondary }}
          >
            One platform to manage members, finances, events, and communications.
            <br className="hidden md:block" />
            AI insights built in. Zero complexity.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="font-semibold px-8 py-3.5 rounded-xl text-[15px] transition-all duration-300 hover:-translate-y-0.5"
              style={{ backgroundColor: C.teal, color: "#fff", boxShadow: "0 4px 14px rgba(13,148,136,0.3)" }}
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="font-medium px-6 py-3.5 rounded-xl text-[15px] transition-all duration-300 hover:-translate-y-0.5"
              style={{ color: C.textSecondary, border: `1px solid ${C.border}`, backgroundColor: C.bg }}
            >
              Demo Login →
            </Link>
            <a
              href="https://tahiralatif.github.io/Association-Management-System/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium px-6 py-3.5 rounded-xl text-[15px] transition-all duration-300 hover:-translate-y-0.5"
              style={{ color: C.teal, border: `1px solid ${C.tealPale}`, backgroundColor: C.tealPalest }}
            >
              📖 Read the Docs
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }} className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full flex justify-center pt-1.5"
            style={{ border: `1.5px solid ${C.borderHover}` }}
          >
            <motion.div
              animate={{ height: [4, 10, 4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-[2px] rounded-full"
              style={{ backgroundColor: C.teal }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Features ──────────────────────────────────── */}
      <section id="features" className="relative py-32 px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>Capabilities</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: C.text }}>Everything You Need</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.textMuted }}>A complete suite built to replace your entire software stack</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon="👥" title="Member Management" description="Full lifecycle from registration to renewal. Profiles, dues, groups, tags, and engagement scoring." delay={0} />
            <FeatureCard icon="💰" title="Financial Operations" description="Invoicing, Stripe payments, budgets, expense tracking. Real-time dashboards and CSV exports." delay={0.08} />
            <FeatureCard icon="📅" title="Events & Scheduling" description="Create events, manage registrations, handle check-ins, sessions, speakers, and feedback." delay={0.16} />
            <FeatureCard icon="📧" title="Communications" description="Email campaigns with provider abstraction, announcements, surveys. Track opens and engagement." delay={0.24} />
            <FeatureCard icon="🤖" title="AI Intelligence" description="Chat with your data, churn prediction, anomaly detection, document generation, LLM insights." delay={0.32} />
            <FeatureCard icon="🔄" title="Workflow Automation" description="Visual workflow builder with triggers, conditions, delays, and automated actions across modules." delay={0.40} />
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────── */}
      <section id="stats" className="relative py-24 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl p-10 md:p-14"
            style={{ backgroundColor: C.greenDark, boxShadow: "0 20px 60px rgba(6,78,59,0.15)" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <Counter end={57} label="Active Members" suffix="+" />
              <Counter end={15} label="Events Hosted" />
              <Counter end={200} label="API Endpoints" />
              <Counter end={14} label="Modules" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Modules ───────────────────────────────────── */}
      <section id="modules" className="relative py-32 px-6" style={{ backgroundColor: C.surface }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-3 block" style={{ color: C.teal }}>Architecture</span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ color: C.text }}>12 Integrated Modules</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: C.textMuted }}>Each module is powerful alone. Together, they transform your operations.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { name: "Dashboard", icon: "📊", desc: "Real-time overview" },
              { name: "Members", icon: "👥", desc: "57 active members" },
              { name: "Finances", icon: "💰", desc: "Invoices & budgets" },
              { name: "Events", icon: "📅", desc: "15 events hosted" },
              { name: "Analytics", icon: "📈", desc: "Deep insights" },
              { name: "Communications", icon: "📧", desc: "Email campaigns" },
              { name: "Documents", icon: "📁", desc: "7 managed docs" },
              { name: "Elections", icon: "🗳️", desc: "Voting & nominations" },
              { name: "Workflows", icon: "⚙️", desc: "Automation engine" },
              { name: "AI Engine", icon: "🤖", desc: "LLM-powered" },
              { name: "Integrations", icon: "🔗", desc: "Webhooks & APIs" },
              { name: "Health", icon: "💓", desc: "System monitoring" },
            ].map((mod, i) => (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                whileHover={{ y: -3, boxShadow: "0 6px 20px rgba(13,148,136,0.08)" }}
                className="rounded-xl p-5 text-center cursor-default transition-all duration-300"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}
              >
                <div className="text-2xl mb-2.5">{mod.icon}</div>
                <div className="font-medium text-[13px]" style={{ color: C.text }}>{mod.name}</div>
                <div className="text-[11px] mt-1" style={{ color: C.textMuted }}>{mod.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ────────────────────────────────── */}
      <section className="py-16 px-6" style={{ backgroundColor: C.bg }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase mb-6 block" style={{ color: C.textMuted }}>Built With</span>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {["FastAPI", "Next.js 16", "React 19", "PostgreSQL", "Groq AI", "Tailwind CSS", "SQLAlchemy", "Redis"].map((tech, i) => (
                <motion.span
                  key={tech}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="text-sm font-medium cursor-default transition-colors duration-300"
                  style={{ color: C.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.teal)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────── */}
      <section className="relative py-32 px-6">
        <div className="absolute inset-0" style={{ opacity: 0.3 }}>
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
            <CtaScene />
          </Canvas>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-white" />

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <span style={{ color: C.text }}>Ready to </span>
              <span style={{ color: C.teal }}>Get Started?</span>
            </h2>
            <p className="text-lg mb-10 max-w-lg mx-auto" style={{ color: C.textSecondary }}>
              Modern associations are already managing smarter with AI-powered AssocHub.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="font-semibold px-10 py-3.5 rounded-xl text-[15px] transition-all duration-300 hover:-translate-y-0.5"
                style={{ backgroundColor: C.green, color: "#fff", boxShadow: "0 4px 14px rgba(6,95,70,0.25)" }}
              >
                Start Free Trial
              </Link>
              <Link
                href="/login"
                className="font-medium px-8 py-3.5 rounded-xl text-[15px] transition-all duration-300"
                style={{ color: C.textSecondary, border: `1px solid ${C.border}`, backgroundColor: C.bg }}
              >
                Demo Login →
              </Link>
              <a
                href="https://tahiralatif.github.io/Association-Management-System/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium px-8 py-3.5 rounded-xl text-[15px] transition-all duration-300"
                style={{ color: C.teal, border: `1px solid ${C.tealPale}`, backgroundColor: C.tealPalest }}
              >
                📖 Read the Docs
              </a>
            </div>
            <p className="text-xs mt-6" style={{ color: C.textMuted }}>No credit card required · Free tier available</p>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────── */}
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
