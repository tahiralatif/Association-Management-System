"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyOrgEmail, API_BASE } from "@/lib/api";

function VerifyOrgEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [message, setMessage] = useState("");
  const [orgName, setOrgName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check the link in your email.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/org-requests/verify-email/${token}`);
        const data = await res.json();

        if (res.ok) {
          setOrgName(data.org_name || "");
          if (data.already_verified) {
            setStatus("already");
            setMessage(data.message || "Email already verified.");
          } else {
            setStatus("success");
            setMessage(data.message || "Email verified successfully!");
          }
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #020c1b 0%, #0a192f 30%, #064e3b 70%, #0d9488 100%)" }}>
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full" style={{ top: "-10%", right: "-5%", background: "radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <div className="rounded-3xl p-10 text-center" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px) saturate(180%)", boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)" }}>

          {/* Loading */}
          {status === "loading" && (
            <>
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 8px 24px rgba(13,148,136,0.35)" }}>
                <div className="h-8 w-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Verifying Your Email</h1>
              <p className="text-slate-400 text-sm">Please wait while we confirm your email address...</p>
            </>
          )}

          {/* Success */}
          {(status === "success" || status === "already") && (
            <>
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #059669, #065f46)", boxShadow: "0 8px 24px rgba(5,150,105,0.35)" }}>
                <span className="text-white text-4xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                {status === "already" ? "Email Already Verified" : "Email Verified!"}
              </h1>
              {orgName && (
                <p className="text-slate-600 text-sm mb-2">
                  <span className="font-semibold">{orgName}</span> has been submitted for review.
                </p>
              )}
              <p className="text-slate-400 text-xs mb-8">
                {status === "already"
                  ? "This email was previously verified. Your request is in the review queue."
                  : "Your registration request is now pending review. We'll notify you by email once a decision is made."
                }
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 16px rgba(13,148,136,0.35)" }}
              >
                Back to Home
              </Link>
            </>
          )}

          {/* Error */}
          {status === "error" && (
            <>
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #e11d48, #be123c)", boxShadow: "0 8px 24px rgba(225,29,72,0.35)" }}>
                <span className="text-white text-4xl">✕</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Verification Failed</h1>
              <p className="text-slate-400 text-sm mb-8">{message}</p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/register-association"
                  className="inline-block px-8 py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 16px rgba(13,148,136,0.35)" }}
                >
                  Register Again
                </Link>
                <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyOrgEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #020c1b, #064e3b)" }}>
        <div className="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full" />
      </div>
    }>
      <VerifyOrgEmailContent />
    </Suspense>
  );
}
