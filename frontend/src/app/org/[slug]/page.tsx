"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrgProfile, type OrgProfile } from "@/lib/api";
import {
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Loader2,
  AlertCircle,
  AtSign,
  Share2,
  Camera,
  Link2,
} from "lucide-react";

const SOCIAL_ICONS: Record<string, any> = {
  twitter: AtSign,
  facebook: Share2,
  instagram: Camera,
  linkedin: Link2,
};

export default function OrgProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [profile, setProfile] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrgProfile(slug);
        setProfile(data);
      } catch (err: any) {
        setError(err.message || "Organization not found");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #020c1b 0%, #0a192f 50%, #064e3b 100%)" }}>
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-teal-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #020c1b 0%, #0a192f 50%, #064e3b 100%)" }}>
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Organization Not Found</h1>
          <p className="text-slate-400 mb-6">{error || "This organization doesn't exist or isn't active."}</p>
          <Link href="/" className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const hasSocialLinks = profile.social_links && Object.values(profile.social_links).some(Boolean);
  const hasContact = profile.contact_email || profile.phone || profile.address;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: profile.hero_image
            ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.6)), url(${profile.hero_image}) center/cover`
            : "linear-gradient(135deg, #020c1b 0%, #0a192f 40%, #064e3b 100%)",
        }}
      >
        {/* Decorative blurs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 rounded-full -top-20 -right-20 bg-teal-500/10 blur-3xl" />
          <div className="absolute w-80 h-80 rounded-full -bottom-20 -left-20 bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-32">
          {/* Logo */}
          {profile.logo_url && (
            <div className="mb-8">
              <img
                src={profile.logo_url}
                alt={`${profile.name} logo`}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
              />
            </div>
          )}

          {/* Name + Tagline */}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4">
            {profile.name}
          </h1>
          {profile.tagline && (
            <p className="text-lg md:text-xl text-teal-300 font-medium mb-6">
              {profile.tagline}
            </p>
          )}
          {profile.description && (
            <p className="text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed mb-8">
              {profile.description}
            </p>
          )}

          {/* CTA Button */}
          <div className="flex flex-wrap gap-4">
            <Link
              href={profile.join_cta_url || `/register?org=${slug}`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-500 text-white font-bold text-[15px] hover:bg-teal-400 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {profile.join_cta_text || "Join Us"}
            </Link>
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/20 text-white font-medium text-[15px] hover:bg-white/10 transition-all"
              >
                <Globe className="h-4 w-4" />
                Visit Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── About Section ─────────────────────────────────────── */}
      {profile.about_html && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-8">About Us</h2>
            <div
              className="prose prose-lg max-w-none text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: profile.about_html }}
            />
          </div>
        </section>
      )}

      {/* ── Contact + Social Row ─────────────────────────────── */}
      {(hasContact || hasSocialLinks) && (
        <section className="py-16 px-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact */}
            {hasContact && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
                <div className="space-y-4">
                  {profile.contact_email && (
                    <a href={`mailto:${profile.contact_email}`} className="flex items-center gap-3 text-gray-600 hover:text-teal-600 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-teal-600" />
                      </div>
                      <span className="text-sm">{profile.contact_email}</span>
                    </a>
                  )}
                  {profile.phone && (
                    <a href={`tel:${profile.phone}`} className="flex items-center gap-3 text-gray-600 hover:text-teal-600 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                        <Phone className="h-5 w-5 text-teal-600" />
                      </div>
                      <span className="text-sm">{profile.phone}</span>
                    </a>
                  )}
                  {profile.address && (
                    <div className="flex items-start gap-3 text-gray-600">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                        <MapPin className="h-5 w-5 text-teal-600" />
                      </div>
                      <span className="text-sm mt-2">{profile.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Connect With Us</h3>
                <div className="space-y-3">
                  {Object.entries(profile.social_links).map(([platform, url]) => {
                    if (!url) return null;
                    const Icon = SOCIAL_ICONS[platform] || Globe;
                    return (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-600 hover:text-teal-600 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-teal-600" />
                        </div>
                        <span className="text-sm capitalize">{platform}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-400 ml-auto" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-slate-100">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            Powered by <Link href="/" className="text-teal-500 font-semibold hover:underline">AssocHub</Link>
          </p>
          <Link href="/" className="text-xs text-gray-400 hover:text-teal-500 transition-colors">
            Association Management Platform
          </Link>
        </div>
      </footer>
    </div>
  );
}
