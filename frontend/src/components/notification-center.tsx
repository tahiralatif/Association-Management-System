"use client";

import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, X } from "lucide-react";

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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
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
    setOpen(!open);
    if (!open) fetchNotifications();
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button variant="ghost" size="icon-sm" onClick={toggle} className="relative">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-700 shadow-lg z-50">
          <div className="flex items-center justify-between border-b dark:border-slate-700 px-4 py-3">
            <span className="font-semibold text-sm text-slate-900 dark:text-white">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-teal-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                    !n.is_read ? "bg-teal-50/50 dark:bg-teal-900/20" : ""
                  }`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
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
            <div className="px-4 py-2 border-t dark:border-slate-700 text-center">
              <button
                onClick={() => { setOpen(false); }}
                className="text-xs text-teal-600 hover:underline"
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
