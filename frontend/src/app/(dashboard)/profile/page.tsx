"use client";

import { useState, useEffect } from "react";
import { apiFetch, API_BASE, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatusBadge, Textarea } from "@/components/ui/shared";
import {
  User, Calendar, FileText, CreditCard, RefreshCw, Save,
  TrendingUp, AlertTriangle, Clock, Shield, Lock,
  ExternalLink, MapPin, Globe, Heart, Bell, Mail, Smartphone,
  Building2, Briefcase
} from "lucide-react";
import Link from "next/link";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface MyProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  member_profile?: {
    phone?: string;
    organization?: string;
    job_title?: string;
    bio?: string;
    status: string;
    tier?: string;
    member_number?: string;
    joined_at?: string;
    expires_at?: string;
    renewal_date?: string;
    auto_renew?: boolean;
    avatar_url?: string;
    address?: Record<string, string>;
    social_links?: Record<string, string>;
    interests?: string[];
    email_opt_in?: boolean;
    sms_opt_in?: boolean;
    engagement_score?: number;
    groups?: string[];
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  amount_paid: number;
  status: string;
  due_date?: string;
  due_at?: string;
}

interface MyEvent {
  id: string;
  title: string;
  start_date?: string;
  location?: string;
  is_registered: boolean;
}

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ═══════════════════════════════════════════
   Tab Button
   ═══════════════════════════════════════════ */
function TabBtn({ active, onClick, icon: Icon, children }: {
  active: boolean; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-teal-100 text-teal-800 shadow-sm"
          : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════ */
export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [tab, setTab] = useState<"overview" | "edit" | "security">("overview");

  // Profile form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  // Extended fields
  const [avatarUrl, setAvatarUrl] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressCountry, setAddressCountry] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialFacebook, setSocialFacebook] = useState("");
  const [socialWebsite, setSocialWebsite] = useState("");
  const [interestsInput, setInterestsInput] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [prof, invRes, evts] = await Promise.allSettled([
        apiFetch<MyProfile>("/api/v1/members/me"),
        apiFetch<{ items: Invoice[]; total: number }>("/api/v1/finances/my/invoices?page=1&per_page=3"),
        apiFetch<MyEvent[]>("/api/v1/members/me/events"),
      ]);

      if (prof.status === "fulfilled") {
        const p = prof.value;
        setProfile(p);
        setFirstName(p.first_name || "");
        setLastName(p.last_name || "");
        const mp = p.member_profile;
        setPhone(mp?.phone || "");
        setOrganization(mp?.organization || "");
        setJobTitle(mp?.job_title || "");
        setBio(mp?.bio || "");
        setAvatarUrl(mp?.avatar_url || "");
        setEmailOptIn(mp?.email_opt_in !== false);
        setSmsOptIn(mp?.sms_opt_in === true);
        setAutoRenew(mp?.auto_renew === true);
        // Address
        const addr = mp?.address || {};
        setAddressLine1(addr.line1 || "");
        setAddressCity(addr.city || "");
        setAddressState(addr.state || "");
        setAddressZip(addr.zip || "");
        setAddressCountry(addr.country || "");
        // Social links
        const sl = mp?.social_links || {};
        setSocialTwitter(sl.twitter || "");
        setSocialLinkedin(sl.linkedin || "");
        setSocialFacebook(sl.facebook || "");
        setSocialWebsite(sl.website || "");
        // Interests
        if (mp?.interests?.length) setInterestsInput(mp.interests.join(", "));
      }
      if (invRes.status === "fulfilled") setInvoices(invRes.value.items || []);
      if (evts.status === "fulfilled") setEvents(Array.isArray(evts.value) ? evts.value : []);
    } catch (e) {
      toast("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  /* ─── Save Profile ─── */
  async function saveProfile() {
    setSaving(true);
    try {
      await apiFetch("/api/v1/members/me", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone, organization, job_title: jobTitle, bio,
          avatar_url: avatarUrl || null,
          address: {
            line1: addressLine1, city: addressCity,
            state: addressState, zip: addressZip, country: addressCountry,
          },
          social_links: {
            twitter: socialTwitter, linkedin: socialLinkedin,
            facebook: socialFacebook, website: socialWebsite,
          },
          interests: interestsInput.split(",").map(s => s.trim()).filter(Boolean),
          email_opt_in: emailOptIn,
          sms_opt_in: smsOptIn,
          auto_renew: autoRenew,
        }),
      });
      toast("success", "Profile updated successfully");
      await loadAll();
      setTab("overview");
    } catch (e: any) {
      toast("error", e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Change Password ─── */
  async function changePassword() {
    if (newPassword !== confirmPassword) { toast("error", "Passwords don't match"); return; }
    if (newPassword.length < 8) { toast("error", "Password must be at least 8 characters"); return; }
    setChangingPassword(true);
    try {
      await apiFetch("/api/v1/members/me/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      toast("success", "Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      toast("error", e.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  /* ═══════════════════════════════════════════
     Render
     ═══════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const mp = profile?.member_profile;
  const renewalDays = daysUntil(mp?.expires_at);
  const isExpiringSoon = renewalDays !== null && renewalDays <= 30 && renewalDays > 0;
  const isExpired = renewalDays !== null && renewalDays <= 0;
  const outstanding = invoices
    .filter(inv => inv.status === "pending" || inv.status === "overdue")
    .reduce((s, inv) => s + (inv.total || 0) - (inv.amount_paid || 0), 0);
  const registeredEvents = events.filter(e => e.is_registered);
  const upcomingEvents = registeredEvents.filter(e => !e.start_date || new Date(e.start_date) >= new Date());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="My Portal"
        description="Manage your membership, profile, and settings"
      />

      {/* ─── Tab Navigation ─── */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100/80 rounded-2xl">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={TrendingUp}>
          Overview
        </TabBtn>
        <TabBtn active={tab === "edit"} onClick={() => setTab("edit")} icon={User}>
          Edit Profile
        </TabBtn>
        <TabBtn active={tab === "security"} onClick={() => setTab("security")} icon={Lock}>
          Security
        </TabBtn>
      </div>

      {/* ═══════════════════════════════════════
         TAB: Overview
         ═══════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Membership Status */}
          <Card className="overflow-hidden border-teal-200">
            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #065f46, #0d9488, #14b8a6, #0d9488, #065f46)" }} />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-teal-100 shrink-0">
                    {mp?.avatar_url ? (
                      <img src={mp.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-teal-700" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {profile?.first_name} {profile?.last_name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      #{mp?.member_number || "—"} · <span className="capitalize">{mp?.tier || "Standard"} Member</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={mp?.status || "unknown"} />
                  {mp?.auto_renew && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                      <RefreshCw className="h-3 w-3" /> Auto-Renew
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <div className="text-center p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Joined</p>
                  <p className="font-semibold text-sm text-slate-900">{fmtDate(mp?.joined_at)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Expires</p>
                  <p className={`font-semibold text-sm ${isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-slate-900"}`}>
                    {fmtDate(mp?.expires_at)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Groups</p>
                  <p className="font-semibold text-sm text-slate-900">{mp?.groups?.length || 0}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500 mb-1">Engagement</p>
                  <p className="font-semibold text-sm text-teal-700">{mp?.engagement_score ?? "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── About ── */}
          {(profile?.first_name || mp?.bio || mp?.organization || mp?.job_title || mp?.interests?.length || mp?.address || mp?.social_links) && (
            <Card className="overflow-hidden">
              <div className="h-[3px] w-full bg-gradient-to-r from-teal-500 via-teal-300 to-teal-500" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-teal-600" /> About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Bio */}
                {mp?.bio ? (
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{mp.bio}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No bio added yet. <button onClick={() => setTab("edit")} className="text-teal-600 hover:underline">Edit your profile</button> to add one.</p>
                )}

                {/* Role & Organization */}
                {(mp?.job_title || mp?.organization) && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm">
                    {mp?.job_title && (
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Briefcase className="h-4 w-4 text-slate-400 shrink-0" /> {mp.job_title}
                      </span>
                    )}
                    {mp?.job_title && mp?.organization && <span className="hidden sm:inline text-slate-300">·</span>}
                    {mp?.organization && (
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" /> {mp.organization}
                      </span>
                    )}
                  </div>
                )}

                {/* Location */}
                {mp?.address && (mp.address.line1 || mp.address.city || mp.address.state) && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    {[mp.address.line1, mp.address.city, mp.address.state, mp.address.zip].filter(Boolean).join(", ")}
                    {mp.address.country && <span className="text-slate-400">({mp.address.country})</span>}
                  </div>
                )}

                {/* Social Links */}
                {mp?.social_links && Object.values(mp.social_links).some(v => v) && (
                  <div className="flex flex-wrap items-center gap-3">
                    {mp.social_links.twitter && (
                      <a href={mp.social_links.twitter.startsWith("http") ? mp.social_links.twitter : `https://twitter.com/${mp.social_links.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 transition-colors">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        Twitter
                      </a>
                    )}
                    {mp.social_links.linkedin && (
                      <a href={mp.social_links.linkedin.startsWith("http") ? mp.social_links.linkedin : `https://${mp.social_links.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 transition-colors">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                        LinkedIn
                      </a>
                    )}
                    {mp.social_links.facebook && (
                      <a href={mp.social_links.facebook.startsWith("http") ? mp.social_links.facebook : `https://facebook.com/${mp.social_links.facebook.replace("facebook.com/", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 transition-colors">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        Facebook
                      </a>
                    )}
                    {mp.social_links.website && (
                      <a href={mp.social_links.website.startsWith("http") ? mp.social_links.website : `https://${mp.social_links.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 transition-colors">
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                  </div>
                )}

                {/* Interests */}
                {mp?.interests && mp.interests.length > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mp.interests.map((tag: string) => (
                        <span key={tag} className="inline-flex items-center text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full">{tag.replace(/-/g, " ")}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Expiry Banner */}
          {isExpiringSoon && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">Membership expires in {renewalDays} day{renewalDays !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-amber-700">Renew now to keep your benefits.</p>
                </div>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0" onClick={() => setTab("edit")}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Renew
                </Button>
              </CardContent>
            </Card>
          )}
          {isExpired && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-800">Your membership has expired</p>
                  <p className="text-sm text-red-700">Please renew to access member benefits.</p>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shrink-0" onClick={() => setTab("edit")}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Renew
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/my-events" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-teal-700" />
                  </div>
                  <span className="font-medium text-sm text-slate-900">My Events</span>
                  <span className="text-xs text-slate-500">{registeredEvents.length} registered</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/my-invoices" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-amber-700" />
                  </div>
                  <span className="font-medium text-sm text-slate-900">Invoices</span>
                  <span className="text-xs text-slate-500">{invoices.length} total</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/my-invoices" className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-green-700" />
                  </div>
                  <span className="font-medium text-sm text-slate-900">Pay Dues</span>
                  <span className="text-xs text-slate-500">{outstanding > 0 ? `$${outstanding.toFixed(2)} due` : "All paid"}</span>
                </CardContent>
              </Card>
            </Link>
            <button onClick={() => setTab("edit")} className="block text-left">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-700" />
                  </div>
                  <span className="font-medium text-sm text-slate-900">Edit Profile</span>
                  <span className="text-xs text-slate-500">Personal info</span>
                </CardContent>
              </Card>
            </button>
          </div>

          {/* Recent Invoices */}
          {invoices.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" /> Recent Invoices
                </CardTitle>
                <Link href="/my-invoices" className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1">
                  View All <ExternalLink className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoices.map(inv => {
                    const bal = (inv.total || 0) - (inv.amount_paid || 0);
                    return (
                      <div key={inv.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-900">{inv.invoice_number}</span>
                            <StatusBadge status={inv.status} />
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Due: {inv.due_at ? fmtDate(inv.due_at) : inv.due_date ? fmtDate(inv.due_date) : "—"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">${(inv.total || 0).toFixed(2)}</p>
                          {bal > 0 && <p className="text-xs text-amber-600">${bal.toFixed(2)} due</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" /> My Upcoming Events
                </CardTitle>
                <Link href="/my-events" className="text-sm text-teal-600 hover:text-teal-800 flex items-center gap-1">
                  View All <ExternalLink className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 5).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                        <Calendar className="h-5 w-5 text-teal-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{evt.title}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          {evt.start_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(evt.start_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          )}
                          {evt.location && <span className="truncate">{evt.location}</span>}
                        </div>
                      </div>
                      <StatusBadge status="registered" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
         TAB: Edit Profile
         ═══════════════════════════════════════ */}
      {tab === "edit" && (
        <div className="space-y-6">
          {/* Avatar & Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="space-y-2">
                <Label>Profile Photo URL</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-16 h-16 object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <Input
                    value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-400">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" autoComplete="tel" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Input value={organization} onChange={e => setOrganization(e.target.value)} autoComplete="organization" />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} autoComplete="organization-title" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="123 Main Street" autoComplete="address-line1" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={addressCity} onChange={e => setAddressCity(e.target.value)} autoComplete="address-level2" />
                </div>
                <div className="space-y-2">
                  <Label>State / Province</Label>
                  <Input value={addressState} onChange={e => setAddressState(e.target.value)} autoComplete="address-level1" />
                </div>
                <div className="space-y-2">
                  <Label>Zip / Postal Code</Label>
                  <Input value={addressZip} onChange={e => setAddressZip(e.target.value)} autoComplete="postal-code" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={addressCountry} onChange={e => setAddressCountry(e.target.value)} autoComplete="country-name" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    Twitter / X
                  </Label>
                  <Input value={socialTwitter} onChange={e => setSocialTwitter(e.target.value)} placeholder="@username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                    LinkedIn
                  </Label>
                  <Input value={socialLinkedin} onChange={e => setSocialLinkedin(e.target.value)} placeholder="linkedin.com/in/username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    Facebook
                  </Label>
                  <Input value={socialFacebook} onChange={e => setSocialFacebook(e.target.value)} placeholder="facebook.com/username" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4" /> Website
                  </Label>
                  <Input value={socialWebsite} onChange={e => setSocialWebsite(e.target.value)} placeholder="https://yoursite.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" /> Interests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Topics & Interests</Label>
              <Input
                value={interestsInput} onChange={e => setInterestsInput(e.target.value)}
                placeholder="e.g. Community Service, Fundraising, Events (comma separated)"
              />
              <p className="text-xs text-slate-400">Separate interests with commas</p>
              {interestsInput && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {interestsInput.split(",").map(s => s.trim()).filter(Boolean).map((tag, i) => (
                    <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" /> Communication Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Email Notifications</p>
                    <p className="text-xs text-slate-500">Receive updates about events, invoices, and association news</p>
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox" checked={smsOptIn} onChange={e => setSmsOptIn(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">SMS Notifications</p>
                    <p className="text-xs text-slate-500">Get text reminders for upcoming events and due dates</p>
                  </div>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Auto-Renew */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" /> Membership Auto-Renewal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">Enable Auto-Renewal</p>
                  <p className="text-xs text-slate-500">Automatically renew your membership before it expires</p>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving} className="bg-teal-600 hover:bg-teal-700 px-6">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
         TAB: Security
         ═══════════════════════════════════════ */}
      {tab === "security" && (
        <div className="space-y-6">
          {/* Membership Info */}
          {mp && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" /> Membership Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Member Number</span>
                    <p className="font-medium">{mp.member_number || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Status</span>
                    <p><StatusBadge status={mp.status} /></p>
                  </div>
                  <div>
                    <span className="text-slate-500">Tier</span>
                    <p className="font-medium capitalize">{mp.tier || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Joined</span>
                    <p className="font-medium">{fmtDate(mp.joined_at)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Expires</span>
                    <p className="font-medium">{fmtDate(mp.expires_at)}</p>
                  </div>
                  {mp.groups && mp.groups.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Groups</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {mp.groups.map((g, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={changePassword} disabled={changingPassword} variant="outline">
                  <Lock className="h-4 w-4 mr-2" />
                  {changingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
