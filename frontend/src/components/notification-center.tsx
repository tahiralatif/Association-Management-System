"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

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

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(!open);
    if (!open) fetchNotifications();
  }

  const panel = open ? createPortal(
    <div ref={panelRef} className="fixed w-80 rounded-2xl border border-slate-200 bg-white shadow-2xl" style={{ zIndex: 9999, top: position.top, right: position.right }}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="font-semibold text-sm text-slate-900">Notifications</span>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-xs text-[#0d9488] hover:underline font-medium flex items-center gap-1">
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center">
            <div className="h-6 w-6 border-2 border-teal-200 border-t-[#0d9488] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <Bell size={20} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                !n.is_read ? "bg-teal-50/40" : ""
              }`}
              onClick={() => !n.is_read && markAsRead(n.id)}
            >
              <div className="flex items-start gap-2.5">
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 rounded-full shrink-0" style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 0 6px rgba(13,148,136,0.4)' }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-100 text-center">
          <button onClick={() => setOpen(false)} className="text-xs text-[#0d9488] hover:underline font-medium">
            Close
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#0d9488] hover:bg-teal-50 transition-all duration-200"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white" style={{ boxShadow: '0 2px 4px rgba(239,68,68,0.3)' }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </>
  );
}
