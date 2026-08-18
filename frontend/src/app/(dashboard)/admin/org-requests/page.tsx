"use client";

import { useState, useEffect, useCallback } from "react";
import { listOrgRequests, approveOrgRequest, rejectOrgRequest, type OrgRequest } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, StatusBadge, Pagination, SearchInput, Modal, ConfirmDialog } from "@/components/ui/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Building, Mail, Phone, Globe, Users, ExternalLink } from "lucide-react";

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function OrgRequestsPage() {
  const toast = useToast();
  const [items, setItems] = useState<OrgRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const [detail, setDetail] = useState<OrgRequest | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<OrgRequest | null>(null);
  const [confirmReject, setConfirmReject] = useState<OrgRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listOrgRequests({ status: statusFilter, page, per_page: 20 });
      setItems(r.items || []);
      setTotal(r.total || 0);
    } catch { toast.error("Failed to load requests"); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove() {
    if (!confirmApprove) return;
    setApproving(true);
    try {
      await approveOrgRequest(confirmApprove.id);
      toast.success(`${confirmApprove.org_name} approved! Setup email sent.`);
      setConfirmApprove(null);
      load();
    } catch (e: any) { toast.error(e.message || "Approval failed"); }
    finally { setApproving(false); }
  }

  async function handleReject() {
    if (!confirmReject || !rejectReason.trim()) return;
    try {
      await rejectOrgRequest(confirmReject.id, rejectReason);
      toast.success(`${confirmReject.org_name} rejected`);
      setConfirmReject(null);
      setRejectReason("");
      load();
    } catch (e: any) { toast.error(e.message || "Rejection failed"); }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Organization Requests"
        description="Review and approve new association registrations"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`p-4 rounded-xl border text-left transition-all ${
              statusFilter === s ? "border-teal-300 bg-teal-50 shadow-sm" : "border-black/5 bg-white hover:border-gray-200"
            }`}
          >
            <div className="text-sm font-medium text-gray-500 capitalize">{s}</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {statusFilter === s ? items.length : "—"}
            </div>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No {statusFilter} requests</p>
          <p className="text-sm mt-1">New organization requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((req) => (
            <Card
              key={req.id}
              className="cursor-pointer hover:border-teal-200 transition-all duration-200 rounded-2xl border border-black/5"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              onClick={() => setDetail(req)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base text-slate-800">{req.org_name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{req.contact_person} — {req.contact_email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[req.status] || ""}`}>
                    {req.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {req.org_name}</span>
                  {req.expected_members && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {req.expected_members} members</span>}
                  <span>Submitted {fmtDate(req.created_at)}</span>
                </div>
                {req.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{req.description}</p>}
                {req.status === "pending" && (
                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setConfirmApprove(req)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all">
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => setConfirmReject(req)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-all border border-red-200">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
                {req.status === "approved" && req.tenant_id && (
                  <div className="mt-2 text-xs text-emerald-600">
                    Tenant: <code className="bg-emerald-50 px-1.5 py-0.5 rounded">{req.tenant_id}</code>
                    {req.setup_token_used ? " · Setup complete" : " · Setup link sent"}
                  </div>
                )}
                {req.status === "rejected" && req.rejection_reason && (
                  <div className="mt-2 text-xs text-red-500">Reason: {req.rejection_reason}</div>
                )}
              </CardContent>
            </Card>
          ))}
          <Pagination page={page} total={total} perPage={20} onChange={setPage} />
        </div>
      )}

      {/* Detail Slide-over */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h2 className="text-lg font-semibold">{detail.org_name}</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-5 space-y-5">
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[detail.status] || ""}`}>
                {detail.status}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building className="h-4 w-4 text-gray-400" /> {detail.contact_person}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" /> {detail.contact_email}
                  </div>
                  {detail.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" /> {detail.phone}
                    </div>
                  )}
                  {detail.website && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <a href={detail.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">{detail.website}</a>
                    </div>
                  )}
                </div>
              </div>

              {detail.expected_members && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Expected Size</h3>
                  <p className="text-sm text-gray-600">{detail.expected_members} members</p>
                </div>
              )}

              {detail.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{detail.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Timeline</h3>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Submitted: {fmtDate(detail.created_at)}</p>
                  {detail.reviewed_at && <p>Reviewed: {fmtDate(detail.reviewed_at)}</p>}
                  {detail.tenant_id && <p>Tenant ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{detail.tenant_id}</code></p>}
                </div>
              </div>

              {detail.status === "pending" && (
                <div className="flex gap-3 pt-4 border-t">
                  <button onClick={() => { setConfirmApprove(detail); setDetail(null); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all">
                    <CheckCircle className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => { setConfirmReject(detail); setDetail(null); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirm */}
      <ConfirmDialog
        open={!!confirmApprove}
        onOpenChange={(v) => { if (!v) setConfirmApprove(null); }}
        onConfirm={handleApprove}
        title={`Approve "${confirmApprove?.org_name}"?`}
        description={`This will create the organization tenant and send a setup email to ${confirmApprove?.contact_email}.`}
      />

      {/* Reject Dialog */}
      <Modal open={!!confirmReject} onOpenChange={(v) => { if (!v) { setConfirmReject(null); setRejectReason(""); } }} title={`Reject "${confirmReject?.org_name}"`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Provide a reason for rejecting this request. This will not create any tenant or user accounts.</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Reason for rejection..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setConfirmReject(null); setRejectReason(""); }} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all">Cancel</button>
            <button
              onClick={handleReject}
              disabled={!rejectReason.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Reject Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
