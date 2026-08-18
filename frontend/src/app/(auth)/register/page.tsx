"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { register as apiRegister } from "@/lib/api";

interface Org {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get("org") || "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgSlug, setOrgSlug] = useState(preselectedSlug);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgResults, setOrgResults] = useState<Org[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // If ?org= is provided, fetch that org on mount
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

  // Debounced org search
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

    if (!selectedOrg || !orgSlug) {
      setError("Please select your association from the list");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await apiRegister(email, password, firstName, lastName, orgSlug);
      setRegisteredEmail(email);
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900";

  // ── Post-registration: "Check your email" screen ──
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020c1b 0%, #0a192f 30%, #064e3b 70%, #0d9488 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full orb-1" style={{ top: '-10%', right: '-5%', background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute w-[400px] h-[400px] rounded-full orb-2" style={{ bottom: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute w-[300px] h-[300px] rounded-full orb-3" style={{ top: '40%', left: '50%', background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        </div>
        <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

        <div className="w-full max-w-md relative z-10 scale-in">
          <div className="rounded-3xl p-8 sm:p-10" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 8px 24px rgba(13,148,136,0.35)' }}>
                <span className="text-white text-3xl font-bold">A</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AssocHub</h1>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                ✉️
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Check Your Email</h2>
              <p className="text-slate-600 text-sm">
                We&apos;ve sent a verification link to<br />
                <strong className="text-slate-900">{registeredEmail}</strong>
              </p>
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-sm text-cyan-800">
                <p className="font-medium mb-1">📝 Next steps:</p>
                <ol className="text-left list-decimal list-inside space-y-1">
                  <li>Open your email inbox</li>
                  <li>Click the <strong>Verify My Email</strong> button</li>
                  <li>Then come back and sign in</li>
                </ol>
              </div>
              <p className="text-xs text-slate-400">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <Link href="/login" className="text-[#0d9488] hover:underline">try logging in</Link> to resend.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 px-6 text-white font-bold text-sm rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 4px 16px rgba(13,148,136,0.35)' }}
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──
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

      {/* Register Card */}
      <div className="w-full max-w-md relative z-10 scale-in">
        <div className="rounded-3xl p-8 sm:p-10" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px) saturate(180%)', boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 8px 24px rgba(13,148,136,0.35)' }}>
              <span className="text-white text-3xl font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-slate-500 mt-1 text-sm">Join your association on AssocHub</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
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
                  required
                  className={inputClass}
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

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">First Name</label>
                <input
                  id="first_name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Last Name</label>
                <input
                  id="last_name"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                style={{ WebkitTextFillColor: password ? undefined : 'transparent' } as React.CSSProperties}
              />
              <p className="text-xs text-slate-400">
                Min 8 chars. Must include uppercase, lowercase, digit, and special character (e.g. Demo1234!)
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                style={{ WebkitTextFillColor: confirmPassword ? undefined : 'transparent' } as React.CSSProperties}
              />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)', boxShadow: '0 4px 16px rgba(13,148,136,0.35)' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-[#0d9488] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #020c1b 0%, #0a192f 30%, #064e3b 70%, #0d9488 100%)' }}><span className="text-white/60">Loading...</span></div>}>
      <RegisterForm />
    </Suspense>
  );
}
