"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/logo";
import { login as apiLogin, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login: ctxLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("demo-association");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendSent(false);
    setLoading(true);
    try {
      const data = await apiLogin(email, password, tenantId);
      const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
      ctxLogin(storedUser, data.access_token);
      const roles = storedUser.roles || [];
      const isStaff = roles.includes("super_admin") || roles.includes("tenant_admin") || roles.includes("staff");
      window.location.href = isStaff ? "/dashboard" : "/profile";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.toLowerCase().includes("verify")) {
        setNeedsVerification(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tenant_id: tenantId }),
      });
      if (res.ok) setResendSent(true);
    } catch { /* ignore */ }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020c1b 0%, #0a192f 30%, #064e3b 70%, #0d9488 100%)' }}>
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full orb-1" style={{ top: '-10%', right: '-5%', background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full orb-2" style={{ bottom: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute w-[300px] h-[300px] rounded-full orb-3" style={{ top: '40%', left: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10 scale-in">
        <div className="rounded-3xl p-8 sm:p-10" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 8px 24px rgba(13,148,136,0.35)' }}>
              <span className="text-white text-3xl font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-1 text-sm">Sign in to your AssocHub account</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
              {needsVerification && !resendSent && (
                <div className="mt-2">
                  <button type="button" onClick={handleResendVerification} disabled={resendLoading} className="text-teal-700 font-semibold hover:underline disabled:opacity-50">
                    {resendLoading ? "Sending..." : "→ Resend verification email"}
                  </button>
                </div>
              )}
              {resendSent && <div className="mt-2 text-emerald-600 font-semibold">✅ Verification email sent! Check your inbox.</div>}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tenant ID</label>
              <input id="tenant_id" placeholder="demo-association" value={tenantId} onChange={(e) => setTenantId(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input id="email" type="email" placeholder="demo@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 4px 16px rgba(13,148,136,0.35)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#0d9488] font-semibold hover:underline">Create one</Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-xl border border-teal-100" style={{ background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)' }}>
            <p className="text-xs text-teal-800 text-center font-bold mb-2">🔑 Demo Credentials</p>
            <div className="space-y-1.5 text-xs text-teal-700">
              <p className="text-center"><strong>Admin:</strong> daniel.harris@example.com / Demo1234!</p>
              <p className="text-center"><strong>User:</strong> demo@gmail.com / Demo1234!</p>
              <p className="text-center font-medium opacity-70">Tenant: demo-association</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
