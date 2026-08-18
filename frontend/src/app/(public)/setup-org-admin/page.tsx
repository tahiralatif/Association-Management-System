"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SetupForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [orgInfo, setOrgInfo] = useState<{ org_name: string; contact_person: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loginUrl, setLoginUrl] = useState("");

  useEffect(() => {
    if (!token) { setFetching(false); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"}/api/v1/org-requests/setup/${token}`)
      .then(r => { if (!r.ok) throw r; return r.json(); })
      .then(data => { setOrgInfo(data); setFetching(false); })
      .catch(async (e) => {
        try {
          const body = await e.json?.();
          setError(body?.detail || "Invalid or expired setup link");
        } catch { setError("Invalid or expired setup link"); }
        setFetching(false);
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"}/api/v1/org-requests/setup/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password }),
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.detail || "Failed"); }
      const data = await res.json();
      setLoginUrl(data.login_url);
      setDone(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#f87171", fontFamily: "Inter, sans-serif" }}>
          <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>Invalid Link</h1>
          <p style={{ color: "#94a3b8" }}>No setup token provided.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: "480px", width: "100%", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "48px 40px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #0d9488, #065f46)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "28px" }}>
            🎉
          </div>
          <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, marginBottom: "12px", fontFamily: "Inter, sans-serif" }}>You&apos;re All Set!</h1>
          <p style={{ color: "#94a3b8", fontSize: "15px", lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
            Your admin account has been created. You can now log in and start managing your association.
          </p>
          <a href={loginUrl || "/login"} style={{ display: "inline-block", marginTop: "28px", padding: "14px 32px", background: "linear-gradient(135deg, #0d9488, #065f46)", color: "#fff", borderRadius: "12px", textDecoration: "none", fontWeight: 600, fontSize: "15px", fontFamily: "Inter, sans-serif" }}>
            Sign In to AssocHub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a, #1e293b, #0f172a)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "15%", left: "25%", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.12) 0%, transparent 70%)", animation: "float1 8s ease-in-out infinite" }} />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: "440px", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #0d9488, #065f46)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🏛️</div>
              <span style={{ color: "#fff", fontSize: "22px", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>AssocHub</span>
            </div>
            <h1 style={{ color: "#fff", fontSize: "24px", fontWeight: 700, marginBottom: "8px", fontFamily: "Inter, sans-serif" }}>Set Up Your Admin Account</h1>
            {orgInfo && (
              <p style={{ color: "#94a3b8", fontSize: "14px", fontFamily: "Inter, sans-serif" }}>
                Welcome, {orgInfo.contact_person}! Set a password for <strong style={{ color: "#0d9488" }}>{orgInfo.org_name}</strong>.
              </p>
            )}
            {fetching && <p style={{ color: "#64748b", fontSize: "14px" }}>Loading...</p>}
          </div>

          {error && !fetching && (
            <div style={{ maxWidth: "440px", margin: "0 auto 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "12px 16px", color: "#fca5a5", fontSize: "14px", fontFamily: "Inter, sans-serif", textAlign: "center" }}>
              {error}
            </div>
          )}

          {!fetching && orgInfo && (
            <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "36px 32px" }}>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", color: "#cbd5e1", fontSize: "13px", fontWeight: 600, marginBottom: "6px", fontFamily: "Inter, sans-serif" }}>Password *</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={{ display: "block", color: "#cbd5e1", fontSize: "13px", fontWeight: 600, marginBottom: "6px", fontFamily: "Inter, sans-serif" }}>Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%", padding: "14px",
                    background: loading ? "#0d948899" : "linear-gradient(135deg, #0d9488, #065f46)",
                    color: "#fff", borderRadius: "12px", border: "none", fontSize: "15px", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(13,148,136,0.3)", fontFamily: "Inter, sans-serif",
                  }}
                >
                  {loading ? "Setting up..." : "Create Admin Account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        @keyframes float1 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
      `}</style>
    </div>
  );
}

export default function SetupOrgAdminPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>Loading...</div>}>
      <SetupForm />
    </Suspense>
  );
}
