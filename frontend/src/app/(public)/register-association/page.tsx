"use client";

import { useState } from "react";
import Link from "next/link";
import { submitOrgRequest } from "@/lib/api";

interface FormData {
  org_name: string;
  contact_person: string;
  contact_email: string;
  phone: string;
  description: string;
  website: string;
  expected_members: string;
}

export default function RegisterAssociationPage() {
  const [form, setForm] = useState<FormData>({
    org_name: "",
    contact_person: "",
    contact_email: "",
    phone: "",
    description: "",
    website: "",
    expected_members: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await submitOrgRequest({
        org_name: form.org_name,
        contact_person: form.contact_person,
        contact_email: form.contact_email,
        phone: form.phone || undefined,
        description: form.description || undefined,
        website: form.website || undefined,
        expected_members: form.expected_members || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #020c1b 0%, #0a192f 30%, #064e3b 70%, #0d9488 100%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] rounded-full" style={{ top: "-10%", right: "-5%", background: "radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
        </div>
        <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />
        <div className="w-full max-w-lg relative z-10">
          <div className="rounded-3xl p-10 text-center" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px) saturate(180%)", boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)" }}>
            <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 8px 24px rgba(13,148,136,0.35)" }}>
              <span className="text-white text-4xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Request Submitted</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-2">
              Thank you for your interest in AssocHub. Your organization registration request has been submitted and is pending review.
            </p>
            <p className="text-slate-400 text-xs mb-8">
              We&apos;ll review your request and send you an email with next steps within 24–48 hours.
            </p>
            <Link
              href="/"
              className="inline-block px-8 py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 16px rgba(13,148,136,0.35)" }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #020c1b 0%, #0a192f 30%, #064e3b 70%, #0d9488 100%)" }}>
      {/* Animated orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full orb-1" style={{ top: "-10%", right: "-5%", background: "radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full orb-2" style={{ bottom: "-15%", left: "-10%", background: "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute w-[300px] h-[300px] rounded-full orb-3" style={{ top: "40%", left: "50%", background: "radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Card */}
      <div className="w-full max-w-xl relative z-10 scale-in">
        <div className="rounded-3xl p-8 sm:p-10" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px) saturate(180%)", boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)" }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 8px 24px rgba(13,148,136,0.35)" }}>
              <span className="text-white text-3xl font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Register Your Association</h1>
            <p className="text-slate-500 mt-1 text-sm">Create an account for your organization on AssocHub</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm border border-red-200">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Organization Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={form.org_name}
                onChange={(e) => update("org_name", e.target.value)}
                placeholder="e.g. Karachi Sports Club"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-400">This will be your organization&apos;s display name across AssocHub.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Contact Person <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={form.contact_person}
                  onChange={(e) => update("contact_person", e.target.value)}
                  placeholder="Full name"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  required
                  value={form.contact_email}
                  onChange={(e) => update("contact_email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Expected Members</label>
                <input
                  type="text"
                  value={form.expected_members}
                  onChange={(e) => update("expected_members", e.target.value)}
                  placeholder="e.g. 50–100"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                placeholder="https://yourassociation.org"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Tell us about your association — what it does, who it serves..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white text-slate-900 placeholder:text-slate-400 resize-none"
              />
              <p className="text-xs text-slate-400">Optional but helps us understand your needs better.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:translate-y-0"
              style={{ background: "linear-gradient(135deg, #0d9488, #065f46)", boxShadow: "0 4px 16px rgba(13,148,136,0.35)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : "Submit Registration Request"}
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
