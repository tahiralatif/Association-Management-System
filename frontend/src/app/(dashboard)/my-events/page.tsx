"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { Calendar, MapPin, Clock, Users, CheckCircle, XCircle } from "lucide-react";

interface MyEvent {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  event_type?: string;
  is_registered: boolean;
}

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
        // Unregister
        await apiFetch(`/api/v1/events/events/${event.id}/unregister`, { method: "POST" });
        	toast("success", "Unregistered from event");
      } else {
        // Register
        await apiFetch(`/api/v1/events/events/${event.id}/register`, { method: "POST" });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Events"
        description="Browse events and manage your registrations"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Available Events</div>
            <div className="text-2xl font-bold">{upcoming.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">My Registrations</div>
            <div className="text-2xl font-bold text-teal-600">
              {events.filter((e) => e.is_registered).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-500">Past Events</div>
            <div className="text-2xl font-bold text-slate-400">{past.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming events" description="Check back later for new events" />
          ) : (
            <div className="space-y-3">
              {upcoming.map((event) => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{event.title}</span>
                      <StatusBadge status={event.is_registered ? "registered" : event.event_type || "event"} />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                      {event.start_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(event.start_date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-1">{event.description}</p>
                    )}
                  </div>
                  <Button
                    variant={event.is_registered ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleRegistration(event)}
                    disabled={registering === event.id}
                    className={`shrink-0 ${event.is_registered ? "text-red-600 border-red-200 hover:bg-red-50" : "bg-teal-600 hover:bg-teal-700"}`}
                  >
                    {registering === event.id ? (
                      "..."
                    ) : event.is_registered ? (
                      <><XCircle className="h-4 w-4 mr-1" /> Cancel</>
                    ) : (
                      <><CheckCircle className="h-4 w-4 mr-1" /> Register</>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Events */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-500">Past Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {past.map((event) => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3 rounded-lg bg-slate-50 opacity-70">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-600">{event.title}</span>
                    <span className="text-sm text-slate-400">
                      {event.start_date && new Date(event.start_date).toLocaleDateString()}
                    </span>
                  </div>
                  {event.is_registered && (
                    <span className="text-xs text-green-600 font-medium">Attended</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
