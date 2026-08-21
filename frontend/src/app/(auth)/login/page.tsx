"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/logo";
import { login as apiLogin, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Org {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

function LoginForm() {
  const { login: ctxLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get("org") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState(preselectedSlug);
  const [orgSearch, setOrgSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [orgResults, setOrgResults] = useState<Org[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (preselectedSlug) {
      fetch(`/api/v1/organizations/by-slug/${preselectedSlug}`)
        .then((r) => r.ok ? r.json() : null)
        .then((org: Org | null) => {
          if (org) {
            setSelectedOrg(org);
            setOrgSlug(org.slug);
            setOrgSearch(org.name);
          }
        })
        .catch(() => {});
    }
  }, [preselectedSlug]);

  const searchOrgs = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setOrgResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/organizations?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setOrgResults(data);
      }
    } catch {
      setOrgResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchOrgs(orgSearch), 300);
    return () => clearTimeout(timer);
  }, [orgSearch, searchOrgs]);

  const handleOrgSelect = (org: Org) => {
    setSelectedOrg(org);
    setOrgSlug(org.slug);
    setOrgSearch(org.name);
    setShowDropdown(false);
    setOrgResults([]);
  };

  const handleOrgSearchChange = (value: string) => {
    setOrgSearch(value);
    setSelectedOrg(null);
    setOrgSlug("");
    setShowDropdown(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setResendSent(false);

    if (!selectedOrg && !orgSlug) {
      // Allow empty org — backend super_admin fallback handles platform admins
    }

    setLoading(true);
    try {
      const data = await apiLogin(email, password, orgSlug || undefined);
      const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
      ctxLogin(storedUser, data.access_token);
      const roles = storedUser.roles || [];
      const isStaff = roles.includes("super_admin") || roles.includes("tenant_admin") || roles.includes("staff");
      router.push(isStaff ? "/dashboard" : "/profile");
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
        body: JSON.stringify({ email, org_slug: orgSlug }),
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
            {/* Organization Search */}
            <div className="space-y-1.5 relative">
              <label className="text-sm font-semibold text-slate-700">Your Association</label>
              <div className="relative">
                <input
                  id="org_search"
                  placeholder="Search by name..."
                  value={orgSearch}
                  onChange={(e) => handleOrgSearchChange(e.target.value)}
                  onFocus={() => orgResults.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                  required={false}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    searching...
                  </div>
                )}
              </div>

              {showDropdown && orgResults.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {orgResults.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      onClick={() => handleOrgSelect(org)}
                    >
                      <div className="font-medium text-slate-900">{org.name}</div>
                      <div className="text-xs text-slate-500 truncate">{org.slug}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedOrg && (
                <div className="flex items-center gap-2 p-2 bg-teal-50 border border-teal-200 rounded-xl">
                  <span className="text-teal-600">✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-teal-900">{selectedOrg.name}</div>
                    {selectedOrg.description && (
                      <div className="text-xs text-teal-700 truncate">{selectedOrg.description}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedOrg(null); setOrgSlug(""); setOrgSearch(""); }}
                    className="text-teal-400 hover:text-teal-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}

              {showDropdown && !searching && orgResults.length === 0 && orgSearch.length >= 2 && (
                <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 p-4 text-center">
                  <p className="text-slate-500 text-sm">No associations found for &quot;{orgSearch}&quot;</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900" />
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
          <p className="text-center text-xs text-slate-400 mt-2">
            <Link href="/register-association" className="hover:text-[#0d9488] hover:underline">Register your association</Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-xl border border-teal-100" style={{ background: 'linear-gradient(135deg, #f0fdfa, #ecfdf5)' }}>
            <p className="text-xs text-teal-800 text-center font-bold mb-2">🔑 Demo Credentials</p>
            <div className="space-y-1.5 text-xs text-teal-700">
              <p className="text-center"><strong>Super Admin:</strong> daniel.harris@example.com / Demo1234!</p>
              <p className="text-center opacity-70">(leave association blank)</p>
              <p className="text-center"><strong>Member:</strong> demo@gmail.com / Demo1234!</p>
              <p className="text-center font-medium opacity-70">Search: &quot;Demo Association&quot;</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="text-slate-400">Loading...</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
