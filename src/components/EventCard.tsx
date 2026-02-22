"use client";

import Link from "next/link";
import { Calendar, MapPin, Tag } from "lucide-react";
import { HappeningEvent } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { format, parseISO } from "date-fns";

interface EventCardProps {
  event: HappeningEvent;
  compact?: boolean;
}

export default function EventCard({ event, compact = false }: EventCardProps) {
  const cat = CATEGORY_CONFIG[event.category] || {
    label: event.category,
    emoji: "📌",
    color: "#6B7280",
  };

  const formattedDate = (() => {
    try {
      return format(parseISO(event.date), "EEE, MMM d yyyy");
    } catch {
      return event.date;
    }
  })();

  if (compact) {
    return (
      <Link
        href={`/events/${event.id}`}
        className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: cat.color + "18" }}
        >
          {cat.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {event.title}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            {formattedDate} · {event.venue}
          </p>
        </div>
        {event.isFree && (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
            FREE
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-5xl">
          {cat.emoji}
        </div>
        {/* Category badge */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-white text-xs font-semibold shadow-sm"
          style={{ backgroundColor: cat.color }}
        >
          {cat.label}
        </div>
        {/* Price badge */}
        <div className="absolute top-3 right-3">
          {event.isFree ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-xs font-semibold shadow-sm">
              FREE
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur text-gray-800 text-xs font-semibold shadow-sm">
              {event.price}
            </span>
          )}
        </div>
        {/* AI badge */}
        {event.source === "ai-extracted" && (
          <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center gap-1">
            ✨ AI Extracted
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
          {event.title}
        </h3>
        <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar size={13} className="text-blue-500" />
            <span>{formattedDate} · {event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin size={13} className="text-red-500" />
            <span className="truncate">
              {event.venue}, {event.city}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {event.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md text-[10px]"
                >
                  <Tag size={8} />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
