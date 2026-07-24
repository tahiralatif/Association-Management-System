"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/logo";
import { API_BASE } from "@/lib/api";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendTenant, setResendTenant] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check the link in your email.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.detail || "Verification failed");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    }

    verify();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail || !resendTenant) return;
    setResendLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail, tenant_id: resendTenant }),
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">AssocHub</h1>

        {status === "loading" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">
            <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-slate-600">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✅
            </div>
            <h2 className="text-xl font-semibold text-green-700">Email Verified!</h2>
            <p className="text-slate-600">{message}</p>
            <Link
              href="/login"
              className="inline-block w-full py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              ❌
            </div>
            <h2 className="text-xl font-semibold text-red-700">Verification Failed</h2>
            <p className="text-slate-600 text-sm">{message}</p>

            {!resendSent ? (
              <form onSubmit={handleResend} className="space-y-3 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Resend verification email:</p>
                <input
                  type="email"
                  placeholder="Your email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Tenant ID (e.g. demo-association)"
                  value={resendTenant}
                  onChange={(e) => setResendTenant(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2 px-4 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </button>
              </form>
            ) : (
              <div className="pt-4 border-t border-slate-100">
                <p className="text-green-600 text-sm font-medium">✅ Verification email sent! Check your inbox.</p>
              </div>
            )}

            <Link
              href="/login"
              className="inline-block w-full py-3 px-6 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors mt-4"
            >
              Go to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
