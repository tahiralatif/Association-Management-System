"use client";

import { useEffect, useState, useCallback } from "react";
import { listAllOrganizations, type OrgSummary } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, LoadingSpinner, Pagination } from "@/components/ui/shared";
import { Building, Users, Mail, ExternalLink, CheckCircle, XCircle, Download } from "lucide-react";
import { API_BASE, getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AdminOrganizationsPage() {
  const toast = useToast();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllOrganizations({ page, per_page: perPage });
      setOrgs(data);
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const downloadCsv = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/api/v1/admin/organizations/export/csv`, { headers });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "organizations.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export organizations");
    }
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Organizations"
        description="All registered associations on the platform"
        actions={
          <button onClick={downloadCsv} className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      {loading ? <LoadingSpinner /> : orgs.length === 0 ? (
        <div className="text-center py-16">
          <Building className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No organizations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="bg-white rounded-2xl border border-black/5 p-5 hover:shadow-md transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-400 text-white font-bold text-lg" style={{ boxShadow: '0 2px 8px rgba(13,148,136,0.3)' }}>
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{org.name}</h3>
                      {org.is_active ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">/{org.slug}</p>
                    {org.description && (
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">{org.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold">{org.user_count}</span> users
                  </div>
                  {org.admin_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      <span>{org.admin_email}</span>
                    </div>
                  )}
                  <a
                    href={`/?org=${org.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[#0d9488] hover:underline font-semibold"
                  >
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {orgs.length >= perPage && (
        <Pagination page={page} total={orgs.length} perPage={perPage} onChange={setPage} />
      )}
    </div>
  );
}
