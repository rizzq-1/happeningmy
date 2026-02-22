"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  ArrowRight,
  Search,
  Upload,
  BarChart3,
  Flame,
  Zap,
} from "lucide-react";
import EventCard from "@/components/EventCard";
import EventMap from "@/components/EventMap";
import { SEED_EVENTS, MOCK_HEATMAP_DATA, CATEGORY_CONFIG } from "@/lib/constants";
import { getEvents } from "@/lib/events";
import { HappeningEvent } from "@/lib/types";

export default function HomePage() {
  const [events, setEvents] = useState<HappeningEvent[]>(SEED_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<HappeningEvent | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => setEvents(SEED_EVENTS));
  }, []);

  const handleMarkerClick = useCallback((event: HappeningEvent) => {
    setSelectedEvent(event);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Sparkles size={12} /> Powered by Google AI
              </span>
              <span className="px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-semibold">
                🇲🇾 Made for Malaysia
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              Discover What&apos;s
              <br />
              <span className="bg-gradient-to-r from-yellow-200 to-pink-200 bg-clip-text text-transparent">
                Happening
              </span>{" "}
              in Malaysia
            </h1>
            <p className="mt-6 text-lg md:text-xl text-blue-100 leading-relaxed max-w-2xl">
              Upload an event poster &amp; let Gemini AI extract the details.
              Explore events on a live map, search by vibes, and track your
              community&apos;s social impact.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transition-all"
              >
                <Upload size={18} />
                Upload a Poster
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/25 transition-all"
              >
                <Search size={18} />
                Explore Events
              </Link>
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Zap, label: "Snapshot-to-Event", desc: "AI poster extraction" },
              { icon: Search, label: "Vibe Search", desc: "Natural language queries" },
              { icon: Flame, label: "Live Heatmaps", desc: "Community engagement" },
              { icon: BarChart3, label: "SDG Impact", desc: "Track social goals" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <f.icon size={20} className="text-yellow-200 mb-2" />
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-xs text-blue-200 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={24} className="text-blue-600" />
              Live Event Map
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Explore events across Malaysia with real-time markers
            </p>
          </div>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              showHeatmap
                ? "bg-orange-100 text-orange-700 border border-orange-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            <Flame size={16} />
            {showHeatmap ? "Heatmap On" : "Show Heatmap"}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EventMap
              events={events}
              heatmapData={MOCK_HEATMAP_DATA}
              showHeatmap={showHeatmap}
              onMarkerClick={handleMarkerClick}
              className="w-full h-[500px]"
            />
          </div>

          {/* Sidebar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 overflow-y-auto max-h-[500px]">
            {selectedEvent ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="px-2 py-1 rounded-lg text-white text-xs font-bold"
                    style={{
                      backgroundColor:
                        CATEGORY_CONFIG[selectedEvent.category]?.color || "#6B7280",
                    }}
                  >
                    {CATEGORY_CONFIG[selectedEvent.category]?.emoji}{" "}
                    {CATEGORY_CONFIG[selectedEvent.category]?.label}
                  </span>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕ Close
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedEvent.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                  {selectedEvent.description}
                </p>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>📅 {selectedEvent.date} · {selectedEvent.time}</p>
                  <p>📍 {selectedEvent.venue}, {selectedEvent.city}</p>
                  <p>💰 {selectedEvent.isFree ? "Free" : selectedEvent.price}</p>
                </div>
                <Link
                  href={`/events/${selectedEvent.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Details <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  Upcoming Events
                </h3>
                <div className="space-y-1">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} compact />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🔥 Trending Events
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Popular events happening across Malaysia
            </p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {events.slice(0, 8).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {Object.entries(CATEGORY_CONFIG).map(([key, cat]) => (
            <Link
              key={key}
              href={`/search?category=${key}`}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {cat.emoji}
              </span>
              <span className="text-xs font-medium text-gray-700">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            Got an Event Poster? Let AI Do the Work ✨
          </h2>
          <p className="mt-3 text-blue-100 max-w-xl mx-auto">
            Just snap a photo or upload a flyer. Gemini 1.5 Flash will extract
            all the details and publish your event in seconds.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Upload size={18} />
            Try Snapshot-to-Event
          </Link>
        </div>
      </section>
    </div>
  );
}
