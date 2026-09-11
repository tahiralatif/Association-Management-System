"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll unread count
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click-outside handler — exclude portal dropdown (it's rendered outside containerRef)
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      // Check if click is inside our portal dropdown
      const dropdown = document.querySelector("[data-notification-dropdown]");
      if (dropdown && dropdown.contains(e.target as Node)) return;
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [open, handleClickOutside]);

  async function fetchUnreadCount() {
    try {
      const data = await apiFetch<{ count: number }>("/api/v1/notifications/unread-count");
      setUnreadCount(data.count || 0);
    } catch {
      // silently fail
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await apiFetch<Notification[]>("/api/v1/notifications");
      setNotifications(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  }

  async function markAllAsRead() {
    try {
      await apiFetch("/api/v1/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }

  function handleNotificationClick(n: Notification) {
    if (n.link) {
      setOpen(false);
      // Camoufox blocks window.location.href and router.push.
      // Use history.pushState + popstate to trigger Next.js client-side routing.
      window.history.pushState({ as: n.link }, '', n.link);
      window.dispatchEvent(new PopStateEvent('popstate', { state: {}, bubbles: true }));
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications().then(() => {
        // Auto-mark all as read when dropdown opens — matches social platform behavior
        markAllAsRead();
      });
      // Measure bell button position for portal dropdown
      const btn = containerRef.current?.querySelector("button");
      if (btn) {
        const rect = btn.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={toggle}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#0d9488] hover:bg-teal-50 transition-all duration-200"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            style={{ boxShadow: "0 2px 6px rgba(239,68,68,0.4)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — portaled to body so it escapes header stacking context */}
      {open &&
        createPortal(
          <div
            data-notification-dropdown
            className="fixed w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
            style={{ zIndex: 9999, top: dropdownPos.top, right: dropdownPos.right }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-[#0d9488] text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[#0d9488] hover:underline font-medium flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="h-6 w-6 border-2 border-teal-200 border-t-[#0d9488] rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-400 mt-3">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <Bell size={22} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">No notifications</p>
                  <p className="text-xs text-slate-400 mt-1">You&apos;re all caught up!</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all duration-150 hover:bg-slate-50/80 ${
                      navigatingId === n.id
                        ? "bg-teal-100/60 scale-[0.98]"
                        : !n.is_read
                          ? "bg-teal-50/30"
                          : "bg-white"
                    } ${n.link ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-start gap-3">
                      {navigatingId === n.id ? (
                        <div className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 border-2 border-teal-400 border-t-transparent animate-spin" />
                      ) : !n.is_read ? (
                        <span
                          className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            background: "linear-gradient(135deg, #0d9488, #14b8a6)",
                            boxShadow: "0 0 8px rgba(13,148,136,0.4)",
                          }}
                        />
                      ) : (
                        <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 bg-slate-200" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</p>
                          {n.link && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#0d9488] font-medium">
                              <ExternalLink size={9} /> View
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/30">
              <button
                onClick={() => setOpen(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-[#0d9488] font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
