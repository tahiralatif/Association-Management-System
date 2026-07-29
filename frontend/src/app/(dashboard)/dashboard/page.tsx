"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatCard, LoadingSpinner,
} from "@/components/ui/shared";
import {
  Users, Calendar, DollarSign, FileText, TrendingUp,
  AlertTriangle, ArrowRight, Zap, Send, Upload, Play,
  ChevronRight, Activity, Sparkles, ArrowUpRight,
} from "lucide-react";

interface Overview {
  members?: { total: number; active: number; new_this_month: number };
  finances?: { total_revenue: number; outstanding: number; expenses: number };
  events?: { upcoming: number; total_attendees: number };
  documents?: { total: number };
  recent_activity?: { action: string; description: string; timestamp: string }[];
}

interface Insight {
  id: string; type: string; title: string; description: string;
  priority?: string; created_at?: string; is_read?: boolean;
}

function fmt$(n: number) {
  return `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d?: string) {
  return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";
}
function fmtTime(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ov, ins] = await Promise.allSettled([
          apiFetch<Overview>("/api/v1/analytics/overview"),
          apiFetch<Insight[] | { items: Insight[] }>("/api/v1/analytics/insights"),
        ]);
        if (ov.status === "fulfilled") setOverview(ov.value);
        if (ins.status === "fulfilled") {
          const v = ins.value;
          setInsights(Array.isArray(v) ? v : (v as any).items || []);
        }
      } catch (e: any) { toast.error("Failed to load dashboard"); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <LoadingSpinner />;

  const m = overview?.members;
  const f = overview?.finances;
  const ev = overview?.events;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's your association at a glance"
        actions={
          <a href="/analytics" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm">
            Full Analytics <ArrowRight className="h-4 w-4" />
          </a>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
        <StatCard label="Total Members" value={m?.total ?? "—"} accent="green" iconElement={<Users className="h-5 w-5 text-emerald-600" />} trend={m ? `${m.active} active, ${m.new_this_month} new this month` : ""} trendUp={true} />
        <StatCard label="Revenue" value={f ? fmt$(f.total_revenue) : "—"} accent="teal" iconElement={<DollarSign className="h-5 w-5 text-teal-600" />} trend={f ? `${fmt$(f.outstanding)} outstanding` : ""} trendUp={true} />
        <StatCard label="Upcoming Events" value={ev?.upcoming ?? "—"} accent="blue" iconElement={<Calendar className="h-5 w-5 text-blue-600" />} trend={ev ? `${ev.total_attendees} total attendees` : ""} />
        <StatCard label="Documents" value={overview?.documents?.total ?? "—"} accent="purple" iconElement={<FileText className="h-5 w-5 text-purple-600" />} trend="All stored securely" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-black/5 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Quick Actions</h3>
          </div>
          <div className="space-y-1">
            {[
              { label: "Add Member", href: "/members", icon: Users, color: "from-emerald-500 to-emerald-400" },
              { label: "Create Invoice", href: "/finances", icon: DollarSign, color: "from-teal-500 to-teal-400" },
              { label: "New Event", href: "/events", icon: Calendar, color: "from-blue-500 to-blue-400" },
              { label: "Send Announcement", href: "/communications", icon: Send, color: "from-purple-500 to-purple-400" },
              { label: "Upload Document", href: "/documents", icon: Upload, color: "from-orange-500 to-orange-400" },
              { label: "Run Workflow", href: "/workflows", icon: Play, color: "from-slate-500 to-slate-400" },
            ].map((a) => (
              <a key={a.href} href={a.href} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-gradient-to-r hover:from-teal-50/60 hover:to-transparent text-sm transition-all duration-200 group">
                <div className={cn("flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r text-white", a.color)} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <a.icon className="h-4 w-4" />
                </div>
                <span className="flex-1 font-semibold text-slate-700 group-hover:text-slate-900">{a.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#0d9488] transition-colors group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-black/5 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
          </div>
          {overview?.recent_activity && overview.recent_activity.length > 0 ? (
            <div className="space-y-0">
              {overview.recent_activity.slice(0, 7).map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 0 8px rgba(13,148,136,0.4)' }} />
                    {i < (overview.recent_activity?.length || 0) - 1 && (
                      <div className="absolute left-[4px] top-4 w-[1.5px] h-full" style={{ background: 'linear-gradient(180deg, rgba(13,148,136,0.2), rgba(13,148,136,0.02))' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{a.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{fmtDate(a.timestamp)} {fmtTime(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No recent activity</p>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-2xl border border-black/5 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)' }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">AI Insights</h3>
            {insights.filter(i => !i.is_read).length > 0 && (
              <span className="ml-auto text-xs bg-gradient-to-r from-red-500 to-rose-500 text-white px-2 py-0.5 rounded-full font-bold" style={{ boxShadow: '0 2px 6px rgba(239,68,68,0.3)' }}>
                {insights.filter(i => !i.is_read).length} new
              </span>
            )}
          </div>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No insights available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {insights.slice(0, 5).map((ins) => (
                <div key={ins.id} className={cn("p-3 rounded-xl border text-sm transition-all duration-200 hover:shadow-sm", ins.is_read ? "bg-white border-slate-100" : "border-l-3 bg-gradient-to-r from-amber-50/80 to-white border-amber-200")} style={ins.is_read ? {} : { borderLeftWidth: '3px' }}>
                  <p className="font-semibold text-slate-800">{ins.title}</p>
                  <p className="text-slate-500 text-xs mt-1 line-clamp-2">{ins.description}</p>
                </div>
              ))}
              <a href="/ai" className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#0d9488] hover:text-[#0f766e] py-2 rounded-xl hover:bg-teal-50 transition-all">
                View all insights <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Finance Summary */}
      {f && (
        <div className="bg-white rounded-2xl border border-black/5 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Financial Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", value: fmt$(f.total_revenue), gradient: "from-emerald-500 to-emerald-400", bg: "from-emerald-50 to-emerald-50/50", text: "text-emerald-700", border: "border-emerald-100" },
              { label: "Outstanding", value: fmt$(f.outstanding), gradient: "from-amber-500 to-amber-400", bg: "from-amber-50 to-amber-50/50", text: "text-amber-700", border: "border-amber-100" },
              { label: "Expenses", value: fmt$(f.expenses), gradient: "from-red-500 to-red-400", bg: "from-red-50 to-red-50/50", text: "text-red-600", border: "border-red-100" },
              { label: "Net Income", value: fmt$(f.total_revenue - f.expenses), gradient: "from-teal-500 to-teal-400", bg: "from-teal-50 to-teal-50/50", text: "text-teal-700", border: "border-teal-100" },
            ].map((item) => (
              <div key={item.label} className={cn("text-center p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1", item.border)} style={{ background: `linear-gradient(135deg, ${item.bg.includes('emerald') ? '#f0fdfa, #ecfdf5' : item.bg.includes('amber') ? '#fffbeb, #fef3c7' : item.bg.includes('red') ? '#fff1f2, #ffe4e6' : '#f0fdfa, #e0f2fe'})`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className={cn("w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-r flex items-center justify-center text-white", item.gradient)} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <DollarSign className="h-5 w-5" />
              </div>
              <p className={cn("text-2xl font-bold", item.text)}>{item.value}</p>
              <p className={cn("text-xs font-semibold mt-1", item.text, "opacity-70")}>{item.label}</p>
            </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
