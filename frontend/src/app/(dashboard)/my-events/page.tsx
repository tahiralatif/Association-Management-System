"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader, EmptyState } from "@/components/ui/shared";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Tag,
  ChevronRight,
  Sparkles,
  Trophy,
  CalendarDays,
} from "lucide-react";

interface MyEvent {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  event_type?: string;
  is_registered: boolean;
  registration_id?: string | null;
}

// ── Event Type Styling ─────────────────────────────────────
const EVENT_TYPE_CONFIG: Record<
  string,
  {
    gradient: string;
    lightBg: string;
    lightText: string;
    badge: string;
    icon: string;
    emoji: string;
  }
> = {
  conference: {
    gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)",
    lightBg: "bg-blue-50",
    lightText: "text-blue-700",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    icon: "🏛️",
    emoji: "🎤",
  },
  workshop: {
    gradient: "linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)",
    lightBg: "bg-orange-50",
    lightText: "text-orange-700",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "🔧",
    emoji: "🛠️",
  },
  webinar: {
    gradient: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)",
    lightBg: "bg-purple-50",
    lightText: "text-purple-700",
    badge: "bg-purple-100 text-purple-700 border-purple-200",
    icon: "💻",
    emoji: "📡",
  },
  social: {
    gradient: "linear-gradient(135deg, #db2777 0%, #ec4899 50%, #f472b6 100%)",
    lightBg: "bg-pink-50",
    lightText: "text-pink-700",
    badge: "bg-pink-100 text-pink-700 border-pink-200",
    icon: "🎉",
    emoji: "🤝",
  },
  meeting: {
    gradient: "linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)",
    lightBg: "bg-slate-50",
    lightText: "text-slate-700",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    icon: "📋",
    emoji: "💬",
  },
  seminar: {
    gradient: "linear-gradient(135deg, #0891b2 0%, #06b6d4 50%, #22d3ee 100%)",
    lightBg: "bg-cyan-50",
    lightText: "text-cyan-700",
    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    icon: "📚",
    emoji: "🎓",
  },
  networking: {
    gradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
    lightBg: "bg-emerald-50",
    lightText: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "🤝",
    emoji: "🌐",
  },
};

const DEFAULT_EVENT_STYLE = {
  gradient: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)",
  lightBg: "bg-teal-50",
  lightText: "text-teal-700",
  badge: "bg-teal-100 text-teal-700 border-teal-200",
  icon: "📅",
  emoji: "✨",
};

function getEventStyle(type?: string) {
  if (!type) return DEFAULT_EVENT_STYLE;
  return EVENT_TYPE_CONFIG[type.toLowerCase()] || DEFAULT_EVENT_STYLE;
}

// ── Event Card ──────────────────────────────────────────────

function EventCard({
  event,
  registering,
  onToggle,
}: {
  event: MyEvent;
  registering: string | null;
  onToggle: (e: MyEvent) => void;
}) {
  const style = getEventStyle(event.event_type);
  const isUpcoming = !event.start_date || new Date(event.start_date) >= new Date();

  const startFormatted = event.start_date
    ? new Date(event.start_date).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const startTime = event.start_date
    ? new Date(event.start_date).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const endTime = event.end_date
    ? new Date(event.end_date).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/60 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300/60">
      {/* Color-coded banner */}
      <div
        className="relative h-32 sm:h-36 overflow-hidden"
        style={{ background: style.gradient }}
      >
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full border-2 border-white" />
          <div className="absolute bottom-2 left-6 w-16 h-16 rounded-full border border-white" />
          <div className="absolute top-8 left-1/3 w-8 h-8 rounded-full border border-white" />
        </div>
        {/* Event type emoji */}
        <div className="absolute top-4 left-4 text-4xl opacity-30 select-none">
          {style.emoji}
        </div>
        {/* Registered badge */}
        {event.is_registered && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
            <CheckCircle className="h-3.5 w-3.5" />
            Registered
          </div>
        )}
        {/* Event type badge */}
        <div className="absolute bottom-3 left-4">
          <span
            className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
            style={{ color: style.gradient.includes("blue") ? "#2563eb" : style.gradient.includes("orange") ? "#ea580c" : style.gradient.includes("purple") ? "#7c3aed" : style.gradient.includes("pink") ? "#db2777" : style.gradient.includes("cyan") ? "#0891b2" : style.gradient.includes("emerald") ? "#059669" : "#0d9488" }}
          >
            {style.icon} {event.event_type || "Event"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Meta info */}
        <div className="mt-4 space-y-2">
          {startFormatted && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-teal-50 transition-colors">
                <Calendar className="h-3.5 w-3.5 text-slate-500 group-hover:text-teal-600 transition-colors" />
              </div>
              <span>{startFormatted}</span>
              {startTime && (
                <span className="text-slate-400">
                  {startTime}
                  {endTime && ` – ${endTime}`}
                </span>
              )}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-teal-50 transition-colors">
                <MapPin className="h-3.5 w-3.5 text-slate-500 group-hover:text-teal-600 transition-colors" />
              </div>
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => onToggle(event)}
            disabled={registering === event.id}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              registering === event.id
                ? "bg-slate-100 text-slate-400 cursor-wait"
                : event.is_registered
                ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300"
                : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-md"
            }`}
          >
            {registering === event.id ? (
              <>
                <div className="h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : event.is_registered ? (
              <>
                <XCircle className="h-4 w-4" />
                Cancel Registration
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Register Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Past Event Row ──────────────────────────────────────────

function PastEventRow({ event }: { event: MyEvent }) {
  const style = getEventStyle(event.event_type);
  const dateStr = event.start_date
    ? new Date(event.start_date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100 opacity-75 hover:opacity-100 transition-opacity">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: style.gradient }}
      >
        {style.icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-slate-700 text-sm">{event.title}</span>
        {dateStr && (
          <span className="text-xs text-slate-400 ml-2">{dateStr}</span>
        )}
      </div>
      {event.is_registered && (
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          Attended
        </span>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────

export default function MyEventsPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const data = await apiFetch<MyEvent[]>("/api/v1/members/me/events");
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      toast("error", "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRegistration(event: MyEvent) {
    setRegistering(event.id);
    try {
      if (event.is_registered) {
        const regId = (event as any).registration_id;
        if (regId) {
          await apiFetch(`/api/v1/events/registrations/${regId}/cancel`, {
            method: "POST",
          });
        }
        toast("success", "Unregistered from event");
      } else {
        await apiFetch(`/api/v1/events/${event.id}/register`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        toast("success", "Registered for event!");
      }
      loadEvents();
    } catch (e: any) {
      toast("error", e.message || "Action failed");
    } finally {
      setRegistering(null);
    }
  }

  const upcoming = events.filter(
    (e) => !e.start_date || new Date(e.start_date) >= new Date()
  );
  const past = events.filter(
    (e) => e.start_date && new Date(e.start_date) < new Date()
  );
  const registeredCount = events.filter((e) => e.is_registered).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 mx-auto animate-spin rounded-xl border-4 border-teal-200 border-t-[#0d9488]" />
          <p className="text-sm text-slate-400 font-medium">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Events"
        description="Discover upcoming events and manage your registrations"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatBox
          icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
          label="Available"
          value={upcoming.length}
          accent="blue"
        />
        <StatBox
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          label="Registered"
          value={registeredCount}
          accent="emerald"
        />
        <StatBox
          icon={<Trophy className="h-5 w-5 text-amber-600" />}
          label="Attended"
          value={past.filter((e) => e.is_registered).length}
          accent="amber"
        />
        <StatBox
          icon={<Sparkles className="h-5 w-5 text-purple-600" />}
          label="Total"
          value={events.length}
          accent="purple"
        />
      </div>

      {/* Upcoming Events Grid */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <div className="h-1 w-1 rounded-full bg-teal-500" />
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Upcoming Events
          </h2>
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
            {upcoming.length}
          </span>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description="Check back later for new events from your association"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                registering={registering}
                onToggle={toggleRegistration}
              />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <h2 className="text-lg font-bold text-slate-500 tracking-tight">
              Past Events
            </h2>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-1">
              {past.length}
            </span>
          </div>
          <div className="space-y-2">
            {past.map((event) => (
              <PastEventRow key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini Stat Box ───────────────────────────────────────────

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50",
    emerald: "bg-emerald-50",
    amber: "bg-amber-50",
    purple: "bg-purple-50",
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/60 hover:border-slate-300/60 transition-all hover:shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl ${bgMap[accent] || "bg-slate-50"}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 tracking-tight">
            {value}
          </p>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}
