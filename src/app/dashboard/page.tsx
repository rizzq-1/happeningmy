"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Target, Sparkles, Download, Globe, Loader2, CheckCircle, AlertCircle, ShieldCheck, X, Check, Clock, Pencil, Save, Tag, Trash2, CalendarX2 } from "lucide-react";
import { SDGCard, StatsOverview } from "@/components/Dashboard";
import { SDG_METRICS, MOCK_DASHBOARD_STATS, SEED_EVENTS, MOCK_HEATMAP_DATA, CATEGORY_CONFIG } from "@/lib/constants";
import { getEvents, updateEvent, deleteEvent } from "@/lib/events";
import EventMap from "@/components/EventMap";
import { HappeningEvent } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { isAdminUser } from "@/lib/constants";

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user?.email);

  const [events, setEvents] = useState<HappeningEvent[]>(SEED_EVENTS);

  // Pending events for admin review
  const [pendingEvents, setPendingEvents] = useState<HappeningEvent[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Gemini Web Import state
  const [geminiQuery, setGeminiQuery] = useState("");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiPreview, setGeminiPreview] = useState<(HappeningEvent & { confidence?: number; source?: string; website?: string })[]>([]);
  const [geminiMessage, setGeminiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [geminiSelected, setGeminiSelected] = useState<Set<number>>(new Set());
  const [geminiImporting, setGeminiImporting] = useState(false);

  // Admin event editor modal
  const [editingEvent, setEditingEvent] = useState<HappeningEvent | null>(null);
  const [editForm, setEditForm] = useState<{
    category: string;
    tags: string;
    title: string;
    venue: string;
    city: string;
    date: string;
    time: string;
    price: string;
    isFree: boolean;
    description: string;
  }>({ category: "", tags: "", title: "", venue: "", city: "", date: "", time: "", price: "", isFree: false, description: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editMessage, setEditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [eventSearch, setEventSearch] = useState("");

  useEffect(() => {
    getEvents({ includePast: true })
      .then((fetched) => {
        if (fetched.length > 0) setEvents(fetched);
      })
      .catch((err) => {
        console.error("[Dashboard] Failed to fetch events:", err);
      });
  }, []);

  // Fetch pending events for admin review
  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function fetchPendingEvents() {
    setPendingLoading(true);
    try {
      const pending = await getEvents({ status: "pending", includePast: true });
      // Filter out seed events (they don't have pending status)
      setPendingEvents(pending.filter((e) => e.status === "pending"));
    } catch {
      setPendingEvents([]);
    } finally {
      setPendingLoading(false);
    }
  }

  async function handleApprove(eventId: string) {
    setReviewMessage(null);
    try {
      await updateEvent(eventId, { status: "published" });
      setReviewMessage({ type: "success", text: "Event approved and published!" });
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
      // Refresh published events
      getEvents().then(setEvents).catch(() => {});
    } catch (err) {
      setReviewMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to approve" });
    }
  }

  async function handleReject(eventId: string) {
    setReviewMessage(null);
    try {
      await deleteEvent(eventId);
      setReviewMessage({ type: "success", text: "Event rejected and removed." });
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      setReviewMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to reject" });
    }
  }

  async function handleDeleteEvent(eventId: string) {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
    try {
      await deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  async function handleCleanupPastEvents() {
    const today = new Date().toISOString().slice(0, 10);
    const pastEvents = events.filter((e) => (e.endDate || e.date) < today);
    if (pastEvents.length === 0) {
      alert("No past events to clean up!");
      return;
    }
    if (!confirm(`Delete ${pastEvents.length} past event(s)? This cannot be undone.`)) return;
    let deleted = 0;
    for (const ev of pastEvents) {
      try {
        await deleteEvent(ev.id);
        deleted++;
      } catch { /* skip */ }
    }
    setEvents((prev) => prev.filter((e) => (e.endDate || e.date) >= today));
    alert(`Deleted ${deleted} past event(s).`);
  }

  function openEditModal(event: HappeningEvent) {
    setEditingEvent(event);
    setEditForm({
      category: event.category,
      tags: event.tags.join(", "),
      title: event.title,
      venue: event.venue,
      city: event.city,
      date: event.date,
      time: event.time,
      price: event.price,
      isFree: event.isFree,
      description: event.description,
    });
    setEditMessage(null);
  }

  async function handleSaveEdit() {
    if (!editingEvent) return;
    setEditSaving(true);
    setEditMessage(null);
    try {
      const tags = editForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await updateEvent(editingEvent.id, {
        category: editForm.category as HappeningEvent["category"],
        tags,
        title: editForm.title,
        venue: editForm.venue,
        city: editForm.city,
        date: editForm.date,
        time: editForm.time,
        price: editForm.price,
        isFree: editForm.isFree,
        description: editForm.description,
      });
      setEditMessage({ type: "success", text: "Event updated!" });
      // Refresh events list
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEvent.id
            ? { ...e, ...editForm, tags, category: editForm.category as HappeningEvent["category"] }
            : e
        )
      );
      setTimeout(() => setEditingEvent(null), 800);
    } catch (err) {
      setEditMessage({ type: "error", text: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setEditSaving(false);
    }
  }

  // ── Gemini Web Search ─────────────────────────────────────
  async function handleGeminiSearch() {
    if (!geminiQuery.trim()) return;
    setGeminiLoading(true);
    setGeminiMessage(null);
    setGeminiPreview([]);
    setGeminiSelected(new Set());
    try {
      const params = new URLSearchParams({ q: geminiQuery.trim() });
      const res = await fetch(`/api/gemini-import?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setGeminiPreview(data.events || []);
      // Select all by default
      setGeminiSelected(new Set((data.events || []).map((_: unknown, i: number) => i)));
      setGeminiMessage({
        type: "success",
        text: `Found ${data.totalCount} events from the web.`,
      });
    } catch (err) {
      setGeminiMessage({ type: "error", text: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setGeminiLoading(false);
    }
  }

  // ── Gemini Import Selected ────────────────────────────────
  async function handleGeminiImport() {
    const toImport = geminiPreview.filter((_, i) => geminiSelected.has(i));
    if (toImport.length === 0) return;
    setGeminiImporting(true);
    setGeminiMessage(null);
    try {
      const res = await fetch("/api/gemini-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: toImport }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setGeminiMessage({ type: "success", text: data.message });
      setGeminiPreview([]);
      setGeminiSelected(new Set());
      // Refresh events and pending queue
      getEvents({ includePast: true }).then((fetched) => { if (fetched.length > 0) setEvents(fetched); }).catch(() => {});
      if (isAdmin) fetchPendingEvents();
    } catch (err) {
      setGeminiMessage({ type: "error", text: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setGeminiImporting(false);
    }
  }

  function toggleGeminiSelect(index: number) {
    setGeminiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleGeminiSelectAll() {
    if (geminiSelected.size === geminiPreview.length) {
      setGeminiSelected(new Set());
    } else {
      setGeminiSelected(new Set(geminiPreview.map((_, i) => i)));
    }
  }

  const aiEvents = events.filter((e) => e.source === "ai-extracted").length;
  const totalEvents = events.length;
  const aiPercentage = totalEvents > 0 ? Math.round((aiEvents / totalEvents) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <BarChart3 size={28} className="text-blue-600" />
          Social Impact Dashboard
        </h1>
        <p className="text-gray-500 mt-2">
          Tracking HappeningMY&apos;s contribution toward UN Sustainable Development Goals
        </p>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={MOCK_DASHBOARD_STATS} />

      {/* SDG Cards */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Target size={20} className="text-green-600" />
          SDG Goal Tracking
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Events mapped to UN Sustainable Development Goals 4, 8, and 11
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SDG_METRICS.map((metric) => (
            <SDGCard key={metric.goal} metric={metric} />
          ))}
        </div>
      </div>

      {/* AI Accuracy Panel */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-purple-600" />
            <h3 className="text-lg font-bold text-gray-900">
              AI Extraction Performance
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-3xl font-extrabold text-blue-600">
                {MOCK_DASHBOARD_STATS.avgAccuracy}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Extraction Accuracy
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp size={10} /> Above 95% target
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-3xl font-extrabold text-purple-600">
                {MOCK_DASHBOARD_STATS.aiExtractedEvents}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                AI-Extracted Events
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {aiPercentage}% of events in demo
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-3xl font-extrabold text-amber-600">&lt;1.8s</p>
              <p className="text-xs text-gray-500 mt-1">
                Avg. Map Load Time
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp size={10} /> Below 2s target
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-4">
              <p className="text-3xl font-extrabold text-emerald-600">
                &lt;25s
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Avg. Onboarding Time
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                <TrendingUp size={10} /> Below 30s target
              </p>
            </div>
          </div>
        </div>

        {/* Heatmap preview */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            🔥 Community Engagement Heatmap
          </h3>
          <EventMap
            events={events}
            heatmapData={MOCK_HEATMAP_DATA}
            showHeatmap={true}
            className="w-full h-[320px]"
          />
        </div>
      </div>

      {/* Gemini Web Event Importer */}
      <div className="mt-10 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={20} className="text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">Gemini Web Importer</h3>
          <span className="ml-auto text-xs text-purple-500 bg-purple-100 px-2 py-1 rounded-full font-medium">
            AI-powered
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Search the web for real Malaysian events using Gemini AI. Found events are imported as pending for admin review.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={geminiQuery}
            onChange={(e) => setGeminiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeminiSearch()}
            placeholder="e.g. music festivals KL March 2026, tech meetups Cyberjaya..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-purple-200 focus:ring-2 focus:ring-purple-300 focus:outline-none text-sm bg-white"
          />
          <button
            onClick={handleGeminiSearch}
            disabled={geminiLoading || !geminiQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {geminiLoading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            Search Web
          </button>
        </div>

        {/* Quick search suggestions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            "upcoming events KL 2026",
            "music concerts Malaysia",
            "food festivals Penang",
            "tech meetups Cyberjaya",
            "charity events Malaysia",
            "art exhibitions KL",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => { setGeminiQuery(suggestion); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Status message */}
        {geminiMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-4 ${
              geminiMessage.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {geminiMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {geminiMessage.text}
          </div>
        )}

        {/* Preview results */}
        {geminiPreview.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={toggleGeminiSelectAll}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
              >
                {geminiSelected.size === geminiPreview.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={handleGeminiImport}
                disabled={geminiImporting || geminiSelected.size === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold text-sm hover:from-emerald-700 hover:to-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {geminiImporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Import {geminiSelected.size} Event{geminiSelected.size !== 1 ? "s" : ""}
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {geminiPreview.map((ev, i) => (
                <div
                  key={i}
                  onClick={() => toggleGeminiSelect(i)}
                  className={`flex items-center gap-3 rounded-xl p-3 border cursor-pointer transition-all ${
                    geminiSelected.has(i)
                      ? "bg-purple-50 border-purple-300 shadow-sm"
                      : "bg-white border-gray-100 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={geminiSelected.has(i)}
                    onChange={() => toggleGeminiSelect(i)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500">
                      {ev.date} · {ev.venue && ev.venue !== "See website" ? `${ev.venue} · ` : ""}
                      {ev.city} · {ev.isFree ? "Free" : ev.price}
                    </p>
                    {ev.website && (
                      <a
                        href={ev.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-purple-500 hover:underline truncate block mt-0.5"
                      >
                        {ev.website}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-lg font-medium">
                      {ev.category}
                    </span>
                    {ev.confidence != null && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                        ev.confidence >= 0.8 ? "bg-emerald-100 text-emerald-700" :
                        ev.confidence >= 0.6 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {Math.round(ev.confidence * 100)}% conf
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Admin: Manage Events (edit tags, category, etc.) */}
      {isAdmin && (
        <div className="mt-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Pencil size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Manage Events</h3>
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
              {events.length} published
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Edit category, tags, and other details for published events. Click the edit button to open the editor.
          </p>

          {/* Cleanup past events button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search / filter */}
            <input
              type="text"
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Search events by title, venue, or tag..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm bg-white"
            />
            <button
              onClick={handleCleanupPastEvents}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold border border-red-200 transition-colors whitespace-nowrap"
            >
              <CalendarX2 size={16} />
              Clean Up Past Events
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events
              .filter((ev) => {
                if (!eventSearch) return true;
                const q = eventSearch.toLowerCase();
                return (
                  ev.title.toLowerCase().includes(q) ||
                  ev.venue.toLowerCase().includes(q) ||
                  ev.city.toLowerCase().includes(q) ||
                  ev.category.toLowerCase().includes(q) ||
                  ev.tags.some((t) => t.toLowerCase().includes(q))
                );
              })
              .map((ev) => {
                const cat = CATEGORY_CONFIG[ev.category] || { label: ev.category, emoji: "📌", color: "#6B7280" };
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:border-blue-200 transition-colors"
                  >
                    {ev.imageUrl && (ev.imageUrl.startsWith("http://") || ev.imageUrl.startsWith("https://") || ev.imageUrl.startsWith("data:")) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={ev.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: cat.color + "18" }}
                      >
                        {ev.imageUrl && !ev.imageUrl.startsWith("/") ? ev.imageUrl : cat.emoji}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.label}
                        </span>
                        {ev.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                          >
                            <Tag size={8} />
                            {tag}
                          </span>
                        ))}
                        {ev.tags.length > 4 && (
                          <span className="text-[10px] text-gray-400">+{ev.tags.length - 4}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(ev)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Pencil size={18} className="text-blue-600" />
                Edit Event
              </h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                  placeholder="e.g. jazz, live-music, outdoor"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {editForm.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
                      >
                        <Tag size={9} />
                        {tag}
                      </span>
                    ))}
                </div>
              </div>

              {/* Venue & City */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Venue</label>
                  <input
                    type="text"
                    value={editForm.venue}
                    onChange={(e) => setEditForm((f) => ({ ...f, venue: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Time</label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Price & Free toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Price</label>
                  <input
                    type="text"
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm"
                    placeholder="RM 50 or Free"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isFree}
                      onChange={(e) => setEditForm((f) => ({ ...f, isFree: e.target.checked, price: e.target.checked ? "Free" : f.price }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">Free event</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:outline-none text-sm resize-none"
                />
              </div>

              {/* Status message */}
              {editMessage && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    editMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {editMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {editMessage.text}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setEditingEvent(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Pending Events Review */}
      {isAdmin && (
        <div className="mt-10 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={20} className="text-amber-600" />
            <h3 className="text-lg font-bold text-gray-900">Event Review Queue</h3>
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
              {pendingEvents.length} pending
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Review and approve events submitted by organizers before they go live on the map.
          </p>

          {reviewMessage && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-4 ${
                reviewMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {reviewMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {reviewMessage.text}
            </div>
          )}

          {pendingLoading ? (
            <div className="text-center py-8">
              <Loader2 size={24} className="animate-spin text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading pending events...</p>
            </div>
          ) : pendingEvents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No events pending review. All clear!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
                >
                  {ev.imageUrl && ev.imageUrl !== "/placeholder-event.jpg" && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={ev.imageUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={12} className="text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-600 uppercase">Pending Review</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ev.date} · {ev.venue} · {ev.city}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{ev.description}</p>
                    {(ev as HappeningEvent & { organizerEmail?: string }).organizerEmail && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Submitted by: {(ev as HappeningEvent & { organizerEmail?: string }).organizerEmail}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(ev.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Check size={12} /> Approve
                    </button>
                    <button
                      onClick={() => handleReject(ev.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <X size={12} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Trend (visual) */}
      <div className="mt-10 bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          📈 Monthly Event Trend
        </h3>
        <div className="flex items-end gap-2 h-40">
          {[35, 42, 58, 65, 72, 85, 78, 92, 105, 118, 130, 145].map(
            (val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-purple-500 transition-all hover:opacity-80"
                  style={{ height: `${(val / 145) * 100}%` }}
                />
                <span className="text-[9px] text-gray-400">
                  {["J","F","M","A","M","J","J","A","S","O","N","D"][i]}
                </span>
              </div>
            )
          )}
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <span>Jan 2025</span>
          <span>Dec 2025</span>
        </div>
      </div>
    </div>
  );
}
