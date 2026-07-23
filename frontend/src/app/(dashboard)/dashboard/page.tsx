"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import {
  PageHeader, StatCard, LoadingSpinner, EmptyState,
} from "@/components/ui/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, Calendar, DollarSign, FileText, TrendingUp,
  AlertTriangle, ArrowRight, Zap,
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

interface DashStats {
  total_members?: number; active_members?: number;
  total_revenue?: number; upcoming_events?: number;
  total_documents?: number; workflow_runs?: number;
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
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Association overview and quick actions"
        actions={
          <a href="/analytics" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            Full Analytics <ArrowRight className="h-4 w-4" />
          </a>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={m?.total ?? "—"} icon="👥" trend={`${m?.active ?? 0} active`} />
        <StatCard label="Revenue" value={f ? fmt$(f.total_revenue) : "—"} icon="💰" trend={f ? `${fmt$(f.outstanding)} outstanding` : ""} />
        <StatCard label="Upcoming Events" value={ev?.upcoming ?? "—"} icon="📅" trend={ev ? `${ev.total_attendees} attendees` : ""} />
        <StatCard label="Documents" value={overview?.documents?.total ?? "—"} icon="📄" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Add Member", href: "/members" },
              { label: "Create Invoice", href: "/finances" },
              { label: "New Event", href: "/events" },
              { label: "Send Announcement", href: "/communications" },
              { label: "Upload Document", href: "/documents" },
              { label: "Run Workflow", href: "/workflows" },
            ].map((a) => (
              <a key={a.href} href={a.href} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm transition">
                {a.label}
                <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {overview?.recent_activity && overview.recent_activity.length > 0 ? (
              <div className="space-y-3">
                {overview.recent_activity.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{a.description}</p>
                      <p className="text-xs text-gray-400">{fmtDate(a.timestamp)} {fmtTime(a.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> AI Insights
            {insights.filter(i => !i.is_read).length > 0 && (
              <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{insights.filter(i => !i.is_read).length} new</span>
            )}
          </CardTitle></CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-sm text-gray-400">No insights available</p>
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 5).map((ins) => (
                  <div key={ins.id} className={`p-3 rounded-lg border text-sm ${ins.is_read ? "bg-white" : "bg-blue-50 border-blue-200"}`}>
                    <p className="font-medium">{ins.title}</p>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{ins.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finance Summary */}
      {f && (
        <Card>
          <CardHeader><CardTitle className="text-base">Financial Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{fmt$(f.total_revenue)}</p>
                <p className="text-xs text-green-600">Total Revenue</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-700">{fmt$(f.outstanding)}</p>
                <p className="text-xs text-yellow-600">Outstanding</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{fmt$(f.expenses)}</p>
                <p className="text-xs text-red-600">Expenses</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{fmt$(f.total_revenue - f.expenses)}</p>
                <p className="text-xs text-blue-600">Net Income</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
