"use client";

import { useEffect, useState, useCallback } from "react";
import { listAllUsers, type PlatformUser } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, LoadingSpinner, Pagination } from "@/components/ui/shared";
import { Shield, Users, CheckCircle, XCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtRoles(roles: string[]) {
  return roles.map(r => r.replace(/_/g, " ")).join(", ");
}

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllUsers({ page, per_page: perPage });
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Platform Users"
        description="All users across every organization"
      />

      {loading ? <LoadingSpinner /> : users.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Role</th>
                <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Organization</th>
                <th className="text-left px-5 py-3 font-bold text-slate-600 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #0d9488, #065f46)' }}>
                        {(u.email[0] || "U").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      "text-[10px] px-2 py-1 rounded-full font-bold",
                      u.roles.includes("super_admin") ? "bg-indigo-100 text-indigo-700" :
                      u.roles.includes("tenant_admin") ? "bg-teal-100 text-teal-700" :
                      u.roles.includes("staff") ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      {fmtRoles(u.roles)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500 font-medium">
                    {u.tenant_id === "platform" ? (
                      <span className="text-indigo-600">Platform</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-slate-400" />
                        {u.tenant_id}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {u.is_active ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                        <XCircle className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.length >= perPage && (
        <Pagination page={page} total={users.length} perPage={perPage} onChange={setPage} />
      )}
    </div>
  );
}
