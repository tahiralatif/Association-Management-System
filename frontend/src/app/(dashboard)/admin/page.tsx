"use client";

import { useEffect, useState } from "react";
import { apiFetch, getPlatformStats, type PlatformStats } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, StatCard, LoadingSpinner } from "@/components/ui/shared";
import {
  Building, Users, ClipboardList, Shield, CheckCircle,
  Clock, XCircle, ArrowRight, TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const toast = useToast();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const s = await getPlatformStats();
        setStats(s);
      } catch {
        toast.error("Failed to load platform stats");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const s = stats!;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Platform Overview"
        description="Manage all associations and platform-wide settings"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
        <StatCard
          label="Total Organizations"
          value={s.total_organizations}
          accent="teal"
          iconElement={<Building className="h-5 w-5 text-teal-600" />}
          trend={`${s.active_organizations} active`}
          trendUp={true}
        />
        <StatCard
          label="Total Users"
          value={s.total_users}
          accent="blue"
          iconElement={<Users className="h-5 w-5 text-blue-600" />}
          trend={`${s.total_admins} admins, ${s.total_members} members`}
          trendUp={true}
        />
        <StatCard
          label="Pending Requests"
          value={s.pending_requests}
          accent="yellow"
          iconElement={<Clock className="h-5 w-5 text-amber-600" />}
          trend={`${s.total_requests} total requests`}
        />
        <StatCard
          label="Approved"
          value={s.approved_requests}
          accent="green"
          iconElement={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          trend={`${s.rejected_requests} rejected`}
          trendUp={true}
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
        <Link
          href="/admin/organizations"
          className="group bg-white rounded-2xl border border-black/5 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-400 text-white" style={{ boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }}>
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Organizations</h3>
              <p className="text-xs text-slate-400">{s.total_organizations} total</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">View and manage all registered associations on the platform.</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0d9488] group-hover:gap-2 transition-all">
            View all <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <Link
          href="/admin/org-requests"
          className="group bg-white rounded-2xl border border-black/5 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 text-white" style={{ boxShadow: '0 2px 8px rgba(245,158,11,0.3)' }}>
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Org Requests</h3>
              <p className="text-xs text-slate-400">{s.pending_requests} pending</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Review and approve new association registration requests.</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0d9488] group-hover:gap-2 transition-all">
            Review requests <ArrowRight className="h-3 w-3" />
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="group bg-white rounded-2xl border border-black/5 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-400 text-white" style={{ boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Users</h3>
              <p className="text-xs text-slate-400">{s.total_users} total</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">View all platform users across all organizations.</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#0d9488] group-hover:gap-2 transition-all">
            View users <ArrowRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Request Breakdown */}
      <div className="bg-white rounded-2xl border border-black/5 p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Request Breakdown</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: s.pending_requests, color: "text-amber-600", bg: "from-amber-50 to-amber-50/50", icon: Clock },
            { label: "Approved", value: s.approved_requests, color: "text-emerald-600", bg: "from-emerald-50 to-emerald-50/50", icon: CheckCircle },
            { label: "Rejected", value: s.rejected_requests, color: "text-red-500", bg: "from-red-50 to-red-50/50", icon: XCircle },
          ].map((item) => (
            <div key={item.label} className={`text-center p-5 rounded-2xl border border-slate-100 bg-gradient-to-br ${item.bg}`}>
              <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
