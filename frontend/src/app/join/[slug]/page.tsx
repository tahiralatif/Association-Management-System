"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Users, ArrowRight } from "lucide-react";
import { getToken, getUser } from "@/lib/api";

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  tagline: string | null;
  website: string | null;
  contact_email: string | null;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<OrgInfo | null>(null);

  useEffect(() => {
    if (!slug) {
      setError("No organization specified");
      setLoading(false);
      return;
    }

    // Check if already logged in — if so, redirect to their dashboard
    const token = getToken();
    const user = getUser();
    if (token && user) {
      const isAdmin = user.roles?.some((r) =>
        ["super_admin", "tenant_admin", "staff"].includes(r)
      );
      router.replace(isAdmin ? "/dashboard" : "/profile");
      return;
    }

    // Not logged in — fetch org info for the welcome page
    fetch(`/api/v1/organizations/by-slug/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setOrg(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Organization not found. Check the link and try again.");
        setLoading(false);
      });
  }, [slug, router]);

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #020c1b 0%, #0a192f 50%, #064e3b 100%)",
        }}
      >
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-teal-400 animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !org) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: "linear-gradient(135deg, #020c1b 0%, #0a192f 50%, #064e3b 100%)",
        }}
      >
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Link Not Found</h1>
          <p className="text-slate-400 mb-6">{error || "Organization not found."}</p>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-all"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  // Welcome page
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #020c1b 0%, #0a192f 50%, #064e3b 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
          {/* Logo / Avatar */}
          <div className="mb-6">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="w-20 h-20 rounded-2xl object-cover mx-auto border-2 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto">
                <Users className="h-10 w-10 text-white" />
              </div>
            )}
          </div>

          {/* Org name */}
          <h1 className="text-2xl font-bold text-white mb-2">{org.name}</h1>

          {/* Tagline */}
          {org.tagline && (
            <p className="text-teal-300 text-sm mb-2">{org.tagline}</p>
          )}

          {/* Description */}
          {org.description && (
            <p className="text-slate-300 text-sm mb-6 leading-relaxed line-clamp-3">
              {org.description}
            </p>
          )}

          {!org.description && <div className="mb-6" />}

          {/* Join button */}
          <Link
            href={`/register?org=${slug}`}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-teal-600 text-white font-bold text-lg hover:bg-teal-500 transition-all shadow-lg shadow-teal-600/25 hover:shadow-teal-500/40 w-full justify-center group"
          >
            Join {org.name}
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Already a member? */}
          <p className="text-slate-400 text-sm mt-5">
            Already a member?{" "}
            <Link href="/login" className="text-teal-400 hover:text-teal-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Powered by */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Powered by <span className="font-semibold text-slate-400">AssocHub</span>
        </p>
      </div>
    </div>
  );
}
