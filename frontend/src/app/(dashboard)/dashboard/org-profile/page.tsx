"use client";

import { useState, useEffect, useCallback } from "react";
import { getMyOrgProfile, updateMyOrgProfile, type OrgProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Globe, Link, Save, ExternalLink, Loader2, Copy, Check, Share2 } from "lucide-react";

export default function OrgProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getMyOrgProfile();
        setProfile(data);
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function updateField(field: keyof OrgProfile, value: string) {
    setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
    setSaved(false);
  }

  function updateSocialLink(platform: string, value: string) {
    setProfile((prev) => prev ? {
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
    } : prev);
    setSaved(false);
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      await updateMyOrgProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-72 bg-gray-100 rounded" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Org Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit your organization&apos;s public page at{" "}
            <a
              href={`/org/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline inline-flex items-center gap-1"
            >
              /org/{profile.slug}
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium animate-pulse">Saved ✓</span>
          )}
          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700 transition-all disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Shareable Join Link */}
      {profile && (
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-bold text-gray-900">Shareable Join Link</h2>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Share this link with potential members. It takes them directly to the registration form with your association pre-selected.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white border border-teal-200 rounded-xl font-mono text-sm text-teal-800 truncate">
                  <span className="truncate">
                    {typeof window !== "undefined" ? window.location.origin : ""}/join/{profile.slug}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/join/${profile.slug}`;
                    navigator.clipboard.writeText(url).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    });
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-all shrink-0"
                >
                  {copied ? (
                    <><Check className="h-4 w-4" /> Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copy</>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Your public page: <a href={`/org/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">/org/{profile.slug}</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <Section title="Basic Information" icon="📋">
        <Field label="Organization Name" value={profile.name} disabled />
        <Field label="Slug" value={profile.slug} disabled hint="This is your public URL identifier" />
        <Field
          label="Tagline"
          value={profile.tagline || ""}
          onChange={(v) => updateField("tagline", v)}
          placeholder="e.g. Building community since 2010"
          hint="A short one-liner shown under your name on the public page"
        />
        <Field
          label="Description"
          value={profile.description || ""}
          onChange={(v) => updateField("description", v)}
          placeholder="What your association is about..."
          multiline
        />
      </Section>

      {/* Public Page Content */}
      <Section title="Public Page Content" icon="🌐">
        <Field
          label="About Us (HTML)"
          value={profile.about_html || ""}
          onChange={(v) => updateField("about_html", v)}
          placeholder="<p>Tell your story here...</p>"
          multiline
          hint="Rich HTML content for the About section on your public page"
        />
        <Field
          label="Logo URL"
          value={profile.logo_url || ""}
          onChange={(v) => updateField("logo_url", v)}
          placeholder="https://example.com/logo.png"
          hint="Direct URL to your organization's logo image"
        />
        <Field
          label="Hero Image URL"
          value={profile.hero_image || ""}
          onChange={(v) => updateField("hero_image", v)}
          placeholder="https://example.com/hero.jpg"
          hint="Banner image shown at the top of your public page"
        />
      </Section>

      {/* Contact Info */}
      <Section title="Contact Information" icon="📞">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Contact Email"
            value={profile.contact_email || ""}
            onChange={(v) => updateField("contact_email", v)}
            placeholder="hello@association.org"
          />
          <Field
            label="Phone"
            value={profile.phone || ""}
            onChange={(v) => updateField("phone", v)}
            placeholder="+92 300 1234567"
          />
        </div>
        <Field
          label="Address"
          value={profile.address || ""}
          onChange={(v) => updateField("address", v)}
          placeholder="123 Main St, Karachi, Pakistan"
        />
        <Field
          label="Website"
          value={profile.website || ""}
          onChange={(v) => updateField("website", v)}
          placeholder="https://yourassociation.org"
        />
      </Section>

      {/* Social Links */}
      <Section title="Social Links" icon="🔗">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["twitter", "facebook", "instagram", "linkedin"].map((platform) => (
            <Field
              key={platform}
              label={platform.charAt(0).toUpperCase() + platform.slice(1)}
              value={profile.social_links?.[platform] || ""}
              onChange={(v) => updateSocialLink(platform, v)}
              placeholder={`https://${platform}.com/yourpage`}
            />
          ))}
        </div>
      </Section>

      {/* Join CTA */}
      <Section title="Join Us Button" icon="🎯">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Button Text"
            value={profile.join_cta_text || "Join Us"}
            onChange={(v) => updateField("join_cta_text", v)}
            placeholder="Join Us"
            hint="The text on the call-to-action button"
          />
          <Field
            label="Button URL"
            value={profile.join_cta_url || ""}
            onChange={(v) => updateField("join_cta_url", v)}
            placeholder={`/register?org=${profile.slug}`}
            hint={`Default: /register?org=${profile.slug}`}
          />
        </div>
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-xs text-slate-500">
            💡 <strong>Tip:</strong> Set the URL to <code className="bg-slate-100 px-1 rounded">/register?org={profile.slug}</code> to pre-select your organization when visitors sign up.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <span className="text-lg">{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  disabled,
  multiline,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white text-gray-900 placeholder:text-gray-400 resize-none disabled:bg-gray-50 disabled:text-gray-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-white text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
        />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
