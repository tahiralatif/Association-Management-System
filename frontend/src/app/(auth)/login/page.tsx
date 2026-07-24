"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";
import { login as apiLogin, API_BASE } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { login: ctxLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("demo-association");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const doLogin = async (loginEmail: string, loginPassword: string, loginTenant: string) => {
    setError("");
    setNeedsVerification(false);
    setResendSent(false);
    setLoading(true);
    try {
      const data = await apiLogin(loginEmail, loginPassword, loginTenant);
      const storedUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
      ctxLogin(storedUser, data.access_token);
      window.location.href = "/dashboard";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password, tenantId);
  };

  const handleDemoLogin = async () => {
    setEmail("daniel.harris@example.com");
    setPassword("Demo1234!");
    setTenantId("demo-association");
    setError("");
    await doLogin("daniel.harris@example.com", "Demo1234!", "demo-association");
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tenant_id: tenantId }),
      });
      if (res.ok) {
        setResendSent(true);
      }
    } catch {
      // ignore
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30 px-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200/80">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3"><Logo size="lg" /></div>
          <CardTitle className="text-2xl font-bold text-slate-900">Welcome Back</CardTitle>
          <CardDescription className="text-slate-500">Sign in to your AssocHub account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* ONE-CLICK DEMO BUTTON — most prominent element */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full mb-6 py-4 rounded-xl font-semibold text-base text-white transition-all duration-200 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-3 group"
            style={{
              background: "linear-gradient(135deg, #0d9488 0%, #065f46 100%)",
              boxShadow: "0 4px 14px rgba(13,148,136,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Signing in...
              </>
            ) : (
              <>
                <span className="text-xl">🚀</span>
                Try Demo — Instant Login
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or sign in manually</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
                {needsVerification && !resendSent && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                      className="text-cyan-700 font-medium hover:underline disabled:opacity-50"
                    >
                      {resendLoading ? "Sending..." : "→ Resend verification email"}
                    </button>
                  </div>
                )}
                {resendSent && (
                  <div className="mt-2 text-green-700 font-medium">
                    ✅ Verification email sent! Check your inbox.
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="tenant_id" className="text-slate-600 text-sm">Tenant ID</Label>
              <Input
                id="tenant_id"
                placeholder="demo-association"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-600 text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-600 text-sm">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                required
              />
            </div>
            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-teal-600 font-medium hover:underline">
                Create one
              </Link>
            </p>
          </form>

          {/* Compact demo info */}
          <div className="mt-5 p-3 bg-teal-50/60 border border-teal-100 rounded-lg">
            <p className="text-xs text-teal-700 text-center">
              <strong>Demo:</strong> daniel.harris@example.com / Demo1234! / demo-association
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
