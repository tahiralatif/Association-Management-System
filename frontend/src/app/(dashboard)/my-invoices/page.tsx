"use client";

import { useState, useEffect } from "react";
import { apiFetch, API_BASE, getToken } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, StatusBadge, Pagination, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { DollarSign, Download, FileText, Search, CreditCard, CheckCircle, ExternalLink } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  amount_paid: number;
  status: string;
  due_date?: string;
  due_at?: string;
  notes?: string;
  created_at?: string;
  line_items?: { description: string; quantity: number; unit_price: number }[];
}

export default function MyInvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [payingId, setPayingId] = useState<string | null>(null);
  const perPage = 15;

  // Check URL params for post-checkout status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "true") {
      toast("success", "Payment successful! Your invoice has been updated.");
      // Clean URL
      window.history.replaceState({}, "", "/my-invoices");
    } else if (params.get("cancelled") === "true") {
      toast("info", "Payment was cancelled. You can try again anytime.");
      window.history.replaceState({}, "", "/my-invoices");
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [page]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const data = await apiFetch<{ items: Invoice[]; total: number }>(
        `/api/v1/finances/my/invoices?page=${page}&per_page=${perPage}`
      );
      setInvoices(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      	toast("error", "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf(invoiceId: string, invoiceNumber: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/finances/my/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      	toast("error", "Failed to download PDF");
    }
  }

  async function handlePayNow(inv: Invoice) {
    setPayingId(inv.id);
    try {
      const balance = (inv.total || 0) - (inv.amount_paid || 0);
      const successUrl = `${window.location.origin}/my-invoices?paid=true`;
      const cancelUrl = `${window.location.origin}/my-invoices?cancelled=true`;
      const r = await apiFetch<{ url: string; session_id?: string }>(
        `/api/v1/finances/invoices/${inv.id}/checkout?success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`,
        { method: "POST" }
      );
      if (r?.url) {
        window.location.href = r.url;
      } else {
        toast("error", "Could not create checkout session");
      }
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      toast("error", e.message || "Payment setup failed. Please try again.");
    } finally {
      setPayingId(null);
    }
  }

  const totalDue = invoices
    .filter((inv) => inv.status === "pending" || inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.total || 0) - (inv.amount_paid || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Invoices"
        description="View and pay your invoices"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Total Invoices</div>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Outstanding Balance</div>
            <div className="text-2xl font-bold text-orange-600">
              ${totalDue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Paid Invoices</div>
            <div className="text-2xl font-bold text-green-600">
              {invoices.filter((inv) => inv.status === "paid").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : invoices.length === 0 ? (
            <EmptyState title="No invoices yet" description="You'll see your invoices here" />
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const balance = (inv.total || 0) - (inv.amount_paid || 0);
                const canPay = (inv.status === "pending" || inv.status === "overdue") && balance > 0;
                return (
                  <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="text-sm text-slate-500 mt-1 truncate">
                        {inv.line_items?.[0]?.description || "Invoice"}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Due: {inv.due_at
                          ? new Date(inv.due_at).toLocaleDateString()
                          : inv.due_date
                            ? new Date(inv.due_date).toLocaleDateString()
                            : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">${(inv.total || 0).toFixed(2)}</div>
                        {balance > 0 && (
                          <div className="text-xs text-orange-600">
                            ${balance.toFixed(2)} due
                          </div>
                        )}
                        {inv.amount_paid > 0 && (
                          <div className="text-xs text-green-600">
                            ${inv.amount_paid.toFixed(2)} paid
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {canPay && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePayNow(inv)}
                            disabled={payingId === inv.id}
                            className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 gap-1.5"
                          >
                            {payingId === inv.id ? (
                              <span className="animate-pulse">Redirecting…</span>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4" />
                                Pay Now
                              </>
                            )}
                          </Button>
                        )}
                        {inv.status === "paid" && (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium shrink-0">
                            <CheckCircle className="h-4 w-4" />
                            Paid
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                          title="Download PDF"
                          className="shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {total > perPage && (
            <div className="mt-4">
              <Pagination page={page} total={total} perPage={perPage} onChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
