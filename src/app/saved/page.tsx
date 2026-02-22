"use client";

import { useState, useEffect } from "react";
import { Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import EventCard from "@/components/EventCard";
import { useSavedEvents } from "@/lib/useSavedEvents";
import { getEventById } from "@/lib/events";
import { HappeningEvent } from "@/lib/types";

export default function SavedPage() {
  const { savedIds } = useSavedEvents();
  const [events, setEvents] = useState<HappeningEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (savedIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    Promise.all(
      savedIds.map(async (id) => {
        // Try Firestore first
        const event = await getEventById(id).catch(() => null);
        if (event) return event;

        // Fallback to sessionStorage (for web search results)
        try {
          const cached = JSON.parse(sessionStorage.getItem("webEvents") || "{}");
          if (cached[id]) return cached[id] as HappeningEvent;
        } catch { /* ignore */ }

        return null;
      })
    ).then((results) => {
      setEvents(results.filter(Boolean) as HappeningEvent[]);
      setLoading(false);
    });
  }, [savedIds]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Heart size={28} className="text-pink-500" />
          Saved Events
        </h1>
        <p className="text-gray-500 mt-2">
          Events you&apos;ve saved for later
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading saved events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">💜</p>
          <h2 className="text-xl font-bold text-gray-800">No saved events yet</h2>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            Tap the heart icon on any event to save it here for quick access.
          </p>
          <Link
            href="/search"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm"
          >
            <ArrowLeft size={14} /> Browse Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
