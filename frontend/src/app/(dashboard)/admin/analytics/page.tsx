"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  getPlatformAnalytics, getPlatformStats,
  type PlatformAnalytics, type PlatformStats,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, LoadingSpinner, StatCard } from "@/components/ui/shared";
import {
  BarChart3, Users, Building, ClipboardList, TrendingUp,
  TrendingDown, Activity, Shield, Zap, Globe, ArrowUpRight,
  ArrowDownRight, Minus, Layers, PieChart as PieIcon, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar,
} from "recharts";

/* ── Color Palette ─────────────────────────────────────────────── */
const C = {
  teal: "#0d9488", tealLight: "#14b8a6", tealDark: "#0f766e",
  emerald: "#059669", emeraldLight: "#34d399",
  violet: "#7c3aed", violetLight: "#a78bfa",
  amber: "#d97706", amberLight: "#fbbf24",
  rose: "#e11d48", roseLight: "#fb7185",
  cyan: "#0891b2", cyanLight: "#22d3ee",
  indigo: "#4f46e5", indigoLight: "#818cf8",
  orange: "#ea580c", orangeLight: "#fb923c",
  sky: "#0284c7", skyLight: "#38bdf8",
  slate: "#64748b", slateLight: "#94a3b8",
};

const PIE_COLORS = [C.teal, C.amber, C.rose, C.indigo, C.violet, C.cyan, C.orange, C.emerald];

/* ── Reusable Chart Card ──────────────────────────────────────── */
function ChartCard({
  title, subtitle, icon, children, className = "",
  gradient,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-black/5 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${className}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div
        className="px-5 py-4 border-b border-slate-100"
        style={gradient ? { background: gradient } : { background: "linear-gradient(135deg, #f8fafc, #f1f5f9)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/80" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ── Custom Tooltip ────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <p className="text-xs font-bold text-slate-700 mb-2 pb-1.5 border-b border-slate-100">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[11px] text-slate-500 flex-1">{p.name}</span>
          <span className="text-[11px] font-bold text-slate-800">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Delta Badge ─────────────────────────────────────────────── */
function DeltaBadge({ current, previous, label }: { current: number; previous: number; label?: string }) {
  const diff = previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  const isFlat = diff === 0;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      isUp ? "bg-emerald-50 text-emerald-600" : isDown ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"
    }`}>
      {isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : isDown ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
      {isFlat ? "0" : `${Math.abs(diff)}%`}
      {label && <span className="text-slate-400 font-normal ml-0.5">{label}</span>}
    </span>
  );
}

/* ── Gauge Ring ─────────────────────────────────────────────── */
function GaugeRing({ value, max, label, color, size = 100 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-black text-slate-800">{value}</span>
        <span className="text-[9px] text-slate-400 font-medium">{label}</span>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [a, s] = await Promise.all([getPlatformAnalytics(months), getPlatformStats()]);
        setAnalytics(a);
        setStats(s);
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [months]);

  if (loading) return <LoadingSpinner />;
  if (!analytics || !stats) return null;

  const { time_series, requests_by_status, users_by_role, top_organizations, org_size_distribution, monthly_summary } = analytics;

  // Pie data
  const requestPie = Object.entries(requests_by_status).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), value: v,
  }));
  const rolePie = Object.entries(users_by_role).filter(([, v]) => v > 0).map(([k, v]) => ({
    name: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), value: v,
  }));

  // Approval rate
  const totalReqs = stats.pending_requests + stats.approved_requests + stats.rejected_requests;
  const approvalRate = totalReqs > 0 ? Math.round((stats.approved_requests / totalReqs) * 100) : 0;

  // Role distribution for radial bar
  const roleRadial = rolePie.map((d, i) => ({
    ...d, fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)", boxShadow: "0 2px 10px rgba(13,148,136,0.3)" }}>
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Platform Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-[46px]">Detailed metrics and growth trends across the entire platform</p>
        </div>
        <div className="flex items-center gap-2 ml-[46px] sm:ml-0">
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-300"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
          <button
            onClick={() => { setLoading(true); Promise.all([getPlatformAnalytics(months), getPlatformStats()]).then(([a, s]) => { setAnalytics(a); setStats(s); }).catch(() => toast.error("Refresh failed")).finally(() => setLoading(false)); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 border border-slate-200 rounded-xl px-3 py-2 hover:bg-teal-50 transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── Hero KPI Strip ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        <div className="relative bg-white rounded-2xl border border-black/5 p-5 overflow-hidden group hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-teal-400" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50">
              <Building className="h-5 w-5 text-teal-600" />
            </div>
            <DeltaBadge current={stats.active_organizations} previous={stats.total_organizations} />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_organizations}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Total Organizations</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-1">{stats.active_organizations} active</p>
        </div>

        <div className="relative bg-white rounded-2xl border border-black/5 p-5 overflow-hidden group hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-400" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <DeltaBadge current={monthly_summary.new_users_this_month} previous={monthly_summary.new_users_last_month} label="vs last mo" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_users}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Total Users</p>
          <div className="flex gap-3 mt-1.5">
            <span className="text-[10px] text-emerald-500 font-bold">{stats.active_users} active</span>
            <span className="text-[10px] text-slate-400 font-bold">{stats.inactive_users} inactive</span>
          </div>
        </div>

        <div className="relative bg-white rounded-2xl border border-black/5 p-5 overflow-hidden group hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-400" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50">
              <ClipboardList className="h-5 w-5 text-amber-600" />
            </div>
            <DeltaBadge current={monthly_summary.approved_this_month} previous={monthly_summary.approved_last_month} label="approved" />
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.pending_requests}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Pending Requests</p>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{stats.total_requests} total</p>
        </div>

        <div className="relative bg-white rounded-2xl border border-black/5 p-5 overflow-hidden group hover:-translate-y-1 transition-all duration-300" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-violet-400" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50">
              <Activity className="h-5 w-5 text-violet-600" />
            </div>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">AVG</span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.avg_members_per_org}</p>
          <p className="text-xs text-slate-400 font-medium mt-1">Avg Members / Org</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-1">{approvalRate}% approval rate</p>
        </div>
      </div>

      {/* ── Row 1: Cumulative Growth + Active Users Trend ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 stagger-children">
        <div className="lg:col-span-3">
          <ChartCard
            title="Cumulative Growth"
            subtitle="Users & organizations over time"
            icon={<TrendingUp className="h-4 w-4 text-teal-600" />}
            gradient="linear-gradient(135deg, rgba(13,148,136,0.06), rgba(20,184,166,0.02))"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={time_series} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="gradCumUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.teal} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={C.teal} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradCumOrgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.violet} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.violet} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Area type="monotone" dataKey="cum_users" stroke={C.teal} fill="url(#gradCumUsers)" strokeWidth={2.5} name="Total Users" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                <Area type="monotone" dataKey="cum_organizations" stroke={C.violet} fill="url(#gradCumOrgs)" strokeWidth={2.5} name="Total Orgs" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard
            title="Active Users Trend"
            subtitle="Currently active user count"
            icon={<Activity className="h-4 w-4 text-emerald-600" />}
            gradient="linear-gradient(135deg, rgba(5,150,105,0.06), rgba(52,211,153,0.02))"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={time_series} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.emerald} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.emerald} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="active_users" stroke={C.emerald} fill="url(#gradActive)" strokeWidth={2.5} name="Active Users" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 2: Request Pipeline (Stacked Bar) + Request Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 stagger-children">
        <div className="lg:col-span-2">
          <ChartCard
            title="Request Pipeline"
            subtitle="Monthly request status breakdown"
            icon={<ClipboardList className="h-4 w-4 text-amber-600" />}
            gradient="linear-gradient(135deg, rgba(217,119,6,0.06), rgba(251,191,36,0.02))"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={time_series} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="approved" stackId="a" fill={C.emerald} radius={[0, 0, 0, 0]} name="Approved" />
                <Bar dataKey="pending" stackId="a" fill={C.amber} name="Pending" />
                <Bar dataKey="rejected" stackId="a" fill={C.rose} radius={[4, 4, 0, 0]} name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div>
          <ChartCard
            title="Request Funnel"
            subtitle="Conversion pipeline"
            icon={<Zap className="h-4 w-4 text-amber-600" />}
            gradient="linear-gradient(135deg, rgba(217,119,6,0.06), rgba(251,191,36,0.02))"
          >
            <div className="space-y-3 py-2">
              {/* Funnel visualization */}
              {[
                { label: "Total Requests", value: totalReqs, color: C.slate, width: "100%" },
                { label: "Approved", value: stats.approved_requests, color: C.emerald, width: `${totalReqs > 0 ? (stats.approved_requests / totalReqs) * 100 : 0}%` },
                { label: "Pending", value: stats.pending_requests, color: C.amber, width: `${totalReqs > 0 ? (stats.pending_requests / totalReqs) * 100 : 0}%` },
                { label: "Rejected", value: stats.rejected_requests, color: C.rose, width: `${totalReqs > 0 ? (stats.rejected_requests / totalReqs) * 100 : 0}%` },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                    <span className="text-xs font-black text-slate-800">{item.value}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: item.width, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Approval Rate Gauge */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-2">Approval Rate</p>
              <div className="relative inline-block">
                <GaugeRing value={approvalRate} max={100} label="%" color={C.teal} size={90} />
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 3: User Roles (Radial) + Org Size Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-children">
        <ChartCard
          title="User Role Distribution"
          subtitle="Platform-wide role breakdown"
          icon={<Shield className="h-4 w-4 text-indigo-600" />}
          gradient="linear-gradient(135deg, rgba(79,70,229,0.06), rgba(129,140,248,0.02))"
        >
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie
                  data={rolePie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {rolePie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2.5">
              {rolePie.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-md flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-slate-600 flex-1">{d.name}</span>
                  <span className="text-xs font-black text-slate-800">{d.value}</span>
                  <span className="text-[10px] text-slate-400 font-medium w-10 text-right">
                    {stats.total_users > 0 ? Math.round((d.value / stats.total_users) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Organization Size Distribution"
          subtitle="Users per organization"
          icon={<Layers className="h-4 w-4 text-cyan-600" />}
          gradient="linear-gradient(135deg, rgba(8,145,178,0.06), rgba(34,211,238,0.02))"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={org_size_distribution} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Organizations" radius={[6, 6, 0, 0]}>
                {org_size_distribution.map((_, i) => (
                  <Cell key={i} fill={[C.teal, C.violet, C.amber, C.indigo][i % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {org_size_distribution.map((d, i) => (
              <div key={d.range} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: [C.teal, C.violet, C.amber, C.indigo][i % 4] }} />
                <span className="text-[10px] text-slate-500">{d.range} members</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 4: Request Status Donut + Top Organizations ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 stagger-children">
        <ChartCard
          title="Request Status"
          subtitle="Overall distribution"
          icon={<PieIcon className="h-4 w-4 text-rose-500" />}
          gradient="linear-gradient(135deg, rgba(225,29,72,0.06), rgba(251,113,133,0.02))"
        >
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={requestPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {requestPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1">
              {requestPie.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] text-slate-500 font-medium">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard
            title="Top Organizations"
            subtitle="Ranked by member count"
            icon={<Globe className="h-4 w-4 text-teal-600" />}
            gradient="linear-gradient(135deg, rgba(13,148,136,0.06), rgba(20,184,166,0.02))"
          >
            {top_organizations.length > 0 ? (
              <div className="space-y-2.5">
                {top_organizations.map((org, i) => {
                  const maxUsers = top_organizations[0]?.users || 1;
                  const pct = (org.users / maxUsers) * 100;
                  return (
                    <div key={org.slug} className="flex items-center gap-3 group">
                      <span className="w-5 text-[10px] font-black text-slate-300 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700 group-hover:text-teal-600 transition-colors">{org.name}</span>
                          <span className="text-xs font-black text-slate-800">{org.users}</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: i === 0 ? `linear-gradient(90deg, ${C.teal}, ${C.tealLight})` :
                                i === 1 ? `linear-gradient(90deg, ${C.violet}, ${C.violetLight})` :
                                `linear-gradient(90deg, ${C.cyan}, ${C.cyanLight})`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No organizations yet</div>
            )}
          </ChartCard>
        </div>
      </div>

      {/* ── Row 5: Monthly New Users + New Org Growth ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-children">
        <ChartCard
          title="Monthly New Users"
          subtitle="User acquisition by month"
          icon={<Users className="h-4 w-4 text-blue-600" />}
          gradient="linear-gradient(135deg, rgba(59,130,246,0.06), rgba(96,165,250,0.02))"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={time_series} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="gradNewUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.sky} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={C.sky} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Area type="monotone" dataKey="users" stroke="none" fill="url(#gradNewUsers)" name="New Users" />
              <Line type="monotone" dataKey="users" stroke={C.sky} strokeWidth={2.5} dot={{ r: 4, fill: C.sky, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }} name="New Users" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Organization Growth"
          subtitle="New organizations by month"
          icon={<Building className="h-4 w-4 text-violet-600" />}
          gradient="linear-gradient(135deg, rgba(124,58,237,0.06), rgba(167,139,250,0.02))"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={time_series} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="gradOrgs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.violet} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
              <Area type="monotone" dataKey="organizations" stroke="none" fill="url(#gradOrgs)" name="New Orgs" />
              <Line type="monotone" dataKey="organizations" stroke={C.violet} strokeWidth={2.5} dot={{ r: 4, fill: C.violet, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }} name="New Orgs" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
