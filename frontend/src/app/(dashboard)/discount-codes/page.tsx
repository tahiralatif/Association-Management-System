"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatusBadge, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { Tag, Plus, Trash2, Edit, Copy } from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  max_uses?: number;
  used_count: number;
  valid_from?: string;
  valid_to?: string;
  applicable_to: string;
  is_active: boolean;
  created_at: string;
}

export default function DiscountCodesPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [applicableTo, setApplicableTo] = useState("both");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadCodes(); }, []);

  async function loadCodes() {
    try {
      const data = await apiFetch<{ items: DiscountCode[] }>("/api/v1/finances/finances/discount-codes");
      setCodes(data.items || []);
    } catch {
      toast("error", "Failed to load discount codes");
    } finally {
      setLoading(false);
    }
  }

  async function saveCode() {
    if (!code.trim() || !value) {
      toast("error", "Code and value are required");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        code: code.toUpperCase().trim(),
        discount_type: discountType,
        value: parseFloat(value),
        applicable_to: applicableTo,
        is_active: true,
      };
      if (maxUses) body.max_uses = parseInt(maxUses);
      if (validFrom) body.valid_from = validFrom;
      if (validTo) body.valid_to = validTo;

      if (editing) {
        await apiFetch(`/api/v1/finances/finances/discount-codes/${editing.id}`, {
          method: "PATCH", body: JSON.stringify(body),
        });
        toast("success", "Discount code updated");
      } else {
        await apiFetch("/api/v1/finances/finances/discount-codes", {
          method: "POST", body: JSON.stringify(body),
        });
        toast("success", "Discount code created");
      }
      resetForm();
      loadCodes();
    } catch (e: any) {
      toast("error", e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCode(id: string) {
    if (!confirm("Delete this discount code?")) return;
    try {
      await apiFetch(`/api/v1/finances/finances/discount-codes/${id}`, { method: "DELETE" });
      toast("success", "Deleted");
      loadCodes();
    } catch {
      toast("error", "Failed to delete");
    }
  }

  function resetForm() {
    setCode(""); setDiscountType("percentage"); setValue(""); setMaxUses("");
    setValidFrom(""); setValidTo(""); setApplicableTo("both");
    setShowForm(false); setEditing(null);
  }

  function startEdit(c: DiscountCode) {
    setEditing(c); setCode(c.code); setDiscountType(c.discount_type);
    setValue(String(c.value)); setMaxUses(c.max_uses ? String(c.max_uses) : "");
    setValidFrom(c.valid_from ? c.valid_from.split("T")[0] : "");
    setValidTo(c.valid_to ? c.valid_to.split("T")[0] : "");
    setApplicableTo(c.applicable_to); setShowForm(true);
  }

  function copyCode(c: string) {
    navigator.clipboard.writeText(c);
    toast("success", `Copied "${c}" to clipboard`);
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Discount Codes"
        description="Manage promotional discount codes for events and memberships"
        actions={
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-1" /> New Code
          </Button>
        }
      />

      {showForm && (
        <Card className="rounded-2xl border-slate-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <CardHeader>
            <CardTitle>{editing ? "Edit" : "Create"} Discount Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SUMMER2026" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "5.00"} />
              </div>
              <div className="space-y-2">
                <Label>Max Uses (optional)</Label>
                <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
              </div>
              <div className="space-y-2">
                <Label>Valid From</Label>
                <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valid To</Label>
                <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Applicable To</Label>
                <select value={applicableTo} onChange={(e) => setApplicableTo(e.target.value)}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                  <option value="both">Both (Events & Memberships)</option>
                  <option value="event">Events Only</option>
                  <option value="membership">Memberships Only</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={saveCode} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-slate-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" /> Active Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <EmptyState title="No discount codes" description="Create your first promo code" />
          ) : (
            <div className="space-y-2">
              {codes.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg border dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-sm bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {c.code}
                      </code>
                      <StatusBadge status={c.is_active ? "active" : "inactive"} />
                      <span className="text-xs text-slate-400 capitalize">{c.applicable_to}</span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {c.discount_type === "percentage" ? `${c.value}% off` : `$${c.value.toFixed(2)} off`}
                      {c.max_uses ? ` · ${c.used_count}/${c.max_uses} used` : ` · ${c.used_count} used`}
                      {c.valid_to ? ` · Expires ${new Date(c.valid_to).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyCode(c.code)} title="Copy code">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => startEdit(c)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteCode(c.id)} title="Delete" className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
