"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ── Page Header ──────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #14b8a6 100%)', boxShadow: '0 8px 32px rgba(13,148,136,0.25), 0 2px 8px rgba(0,0,0,0.1)' }}>
      {/* Decorative circles */}
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
      <div className="absolute top-4 right-24 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
      <div className="relative z-10 p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
            {description && <p className="text-teal-100 mt-1.5 text-sm sm:text-base">{description}</p>}
          </div>
          {actions && <div className="flex gap-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  active:            { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive:          { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400" },
  pending:           { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  cancelled:         { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  completed:         { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  draft:             { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400" },
  published:         { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  paused:            { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  archived:          { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400" },
  paid:              { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  overdue:           { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  sent:              { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  approved:          { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected:          { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  open:              { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  closed:            { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400" },
  running:           { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  failed:            { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  success:           { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  waiting:           { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  processing:        { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  error:             { bg: "bg-red-50",     text: "text-red-600",     dot: "bg-red-500" },
  suspended:         { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500" },
  lapsed:            { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-500" },
  pending_approval:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  refunded:          { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500" },
  partially_paid:    { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  reimbursed:        { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  submitted:         { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  upcoming:          { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  ongoing:           { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  basic:             { bg: "bg-slate-50",   text: "text-slate-600",   dot: "bg-slate-400" },
  premium:           { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500" },
  professional:      { bg: "bg-teal-50",    text: "text-teal-700",    dot: "bg-teal-500" },
  executive:         { bg: "bg-purple-50",  text: "text-purple-700",  dot: "bg-purple-500" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status.toLowerCase()] || { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize", s.bg, s.text)} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  );
}

// ── Loading Spinner ──────────────────────────────────────────

export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" }[size];
  return (
    <div className="flex items-center justify-center py-12">
      <div className={cn("animate-spin rounded-full border-2 border-teal-100 border-t-[#0d9488]", sizeClass)} />
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: { icon?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 8px 24px rgba(13,148,136,0.2)' }}>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      {description && <p className="text-slate-500 mt-1.5 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────

export function ConfirmDialog({ open, onOpenChange, title, description, confirmText = "Confirm", variant = "destructive", onConfirm, loading }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; confirmText?: string; variant?: "destructive" | "default"; onConfirm: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xl" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-2xl p-6 max-w-md w-full mx-4" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #0d9488, #065f46)' }} />
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="text-slate-500 mt-2 text-sm">{description}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => onOpenChange(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50 transition-all" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} className={cn("px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all", variant === "destructive" ? "bg-red-500 hover:bg-red-600" : "bg-[#0d9488] hover:bg-[#0f766e]")} style={{ boxShadow: '0 4px 12px rgba(13,148,136,0.25)' }}>
            {loading ? "Loading..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal / Dialog ───────────────────────────────────────────

export function Modal({ open, onOpenChange, title, children, maxWidth = "max-w-lg" }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; children: React.ReactNode; maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xl" onClick={() => onOpenChange(false)} />
      <div className={cn("relative bg-white rounded-2xl mx-4 max-h-[90vh] overflow-y-auto w-full", maxWidth)} style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: 'linear-gradient(90deg, #0d9488, #065f46)' }} />
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Data Table ───────────────────────────────────────────────

export function DataTable<T = Record<string, any>>({ columns, data, loading, emptyMessage = "No data found", onRowClick }: {
  columns: { key: string; header: string; render?: (row: any) => React.ReactNode; className?: string }[]; data: T[]; loading?: boolean; emptyMessage?: string; onRowClick?: (row: any) => void;
}) {
  if (loading) return <LoadingSpinner />;
  return (
    <div className="rounded-2xl border border-black/5 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'linear-gradient(135deg, #065f46, #0d9488)' }}>
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-3.5 text-left font-semibold text-white text-xs uppercase tracking-wider", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">{emptyMessage}</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={String((row as any).id ?? i)} className={cn("border-t border-slate-100 transition-all duration-200", i % 2 === 0 ? "bg-white" : "bg-teal-50/20", onRowClick && "cursor-pointer hover:bg-gradient-to-r hover:from-teal-50/60 hover:to-transparent")} onClick={() => onRowClick?.(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
                    {col.render ? col.render(row) : ((row as any)[col.key] as React.ReactNode) ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────────

export function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (page: number) => void; }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-slate-500 font-medium">Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</p>
      <div className="flex gap-1.5">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-all bg-white">← Prev</button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = page <= 3 ? i + 1 : page - 2 + i;
          if (p < 1 || p > totalPages) return null;
          return (
            <button key={p} onClick={() => onChange(p)} className={cn("px-3.5 py-2 text-sm font-semibold rounded-xl transition-all", p === page ? "bg-[#0d9488] text-white" : "bg-white border border-slate-200 hover:bg-slate-50")} style={p === page ? { boxShadow: '0 2px 8px rgba(13,148,136,0.3)' } : {}}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-all bg-white">Next →</button>
      </div>
    </div>
  );
}

// ── Search Input ─────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (value: string) => void; placeholder?: string; }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0d9488] text-sm">🔍</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }} />
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────

type AccentColor = "green" | "teal" | "blue" | "purple" | "red" | "yellow" | "orange" | "slate";

const ACCENT_STYLES: Record<AccentColor, { gradient: string; iconBg: string; iconText: string; trendUp: string; trendDown: string }> = {
  green:  { gradient: "linear-gradient(90deg, #10b981, #34d399)", iconBg: "bg-emerald-50",  iconText: "text-emerald-600",  trendUp: "text-emerald-600", trendDown: "text-red-500" },
  teal:   { gradient: "linear-gradient(90deg, #0d9488, #14b8a6)",  iconBg: "bg-teal-50",     iconText: "text-teal-600",     trendUp: "text-emerald-600", trendDown: "text-red-500" },
  blue:   { gradient: "linear-gradient(90deg, #3b82f6, #60a5fa)",  iconBg: "bg-blue-50",     iconText: "text-blue-600",     trendUp: "text-emerald-600", trendDown: "text-red-500" },
  purple: { gradient: "linear-gradient(90deg, #8b5cf6, #a78bfa)",  iconBg: "bg-purple-50",   iconText: "text-purple-600",   trendUp: "text-emerald-600", trendDown: "text-red-500" },
  red:    { gradient: "linear-gradient(90deg, #ef4444, #f87171)",  iconBg: "bg-red-50",      iconText: "text-red-600",      trendUp: "text-emerald-600", trendDown: "text-red-500" },
  yellow: { gradient: "linear-gradient(90deg, #f59e0b, #fbbf24)",  iconBg: "bg-amber-50",    iconText: "text-amber-600",    trendUp: "text-emerald-600", trendDown: "text-red-500" },
  orange: { gradient: "linear-gradient(90deg, #f97316, #fb923c)",  iconBg: "bg-orange-50",   iconText: "text-orange-600",   trendUp: "text-emerald-600", trendDown: "text-red-500" },
  slate:  { gradient: "linear-gradient(90deg, #94a3b8, #cbd5e1)",  iconBg: "bg-slate-50",    iconText: "text-slate-500",    trendUp: "text-emerald-600", trendDown: "text-red-500" },
};

export function StatCard({ label, value, icon, trend, trendUp, accent = "slate", iconElement }: {
  label: string; value: string | number; icon?: string; trend?: string; trendUp?: boolean; accent?: AccentColor; iconElement?: React.ReactNode;
}) {
  const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.slate;
  return (
    <div className="relative bg-white rounded-2xl p-6 border border-black/5 overflow-hidden transition-all duration-300 hover:-translate-y-1.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: styles.gradient }} />
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 hover:opacity-100" style={{ boxShadow: '0 12px 32px rgba(13,148,136,0.12)' }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          {iconElement ? (
            <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl", styles.iconBg)}>
              {iconElement}
            </div>
          ) : icon ? (
            <span className="text-2xl">{icon}</span>
          ) : null}
        </div>
        <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trendUp !== undefined && (
              <span className={cn("text-xs font-bold", trendUp ? styles.trendUp : styles.trendDown)}>
                {trendUp ? "↑" : "↓"}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Form Field ───────────────────────────────────────────────

export function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode; }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// ── Input ────────────────────────────────────────────────────

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] disabled:opacity-50 transition-all bg-white", className)} {...props} />
));
Input.displayName = "Input";

// ── Select ───────────────────────────────────────────────────

export function Select({ value, onChange, options, placeholder, className }: { value?: string; onChange: (value: string) => void; options: { value: string; label: string }[]; placeholder?: string; className?: string; }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={cn("w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] transition-all bg-white", className)}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
    </select>
  );
}

// ── Textarea ─────────────────────────────────────────────────

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0d9488]/20 focus:border-[#0d9488] min-h-[80px] resize-y transition-all bg-white", className)} {...props} />
));
Textarea.displayName = "Textarea";

// ── Tabs ─────────────────────────────────────────────────────

export function Tabs({ tabs, activeTab, onChange }: { tabs: { key: string; label: string; count?: number }[]; activeTab: string; onChange: (key: string) => void; }) {
  return (
    <div className="bg-slate-100/80 rounded-xl p-1 flex gap-1">
      {tabs.map((tab) => (
        <button key={tab.key} onClick={() => onChange(tab.key)} className={cn("px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200", activeTab === tab.key ? "bg-white text-[#0d9488] shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/50")}>
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn("ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold", activeTab === tab.key ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-500")}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
