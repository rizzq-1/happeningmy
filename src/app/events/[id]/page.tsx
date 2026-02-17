"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Tag,
  Globe,
  Mail,
  Phone,
  Share2,
  Heart,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SEED_EVENTS, CATEGORY_CONFIG } from "@/lib/constants";
import EventMap from "@/components/EventMap";
import { format, parseISO } from "date-fns";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = use(params);
  const event = SEED_EVENTS.find((e) => e.id === id);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😢</p>
        <h1 className="text-2xl font-bold text-gray-900">Event Not Found</h1>
        <p className="text-gray-500 mt-2">
          This event may have been removed or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        >
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </div>
    );
  }

  const cat = CATEGORY_CONFIG[event.category] || {
    label: event.category,
    emoji: "📌",
    color: "#6B7280",
  };

  const formattedDate = (() => {
    try {
      return format(parseISO(event.date), "EEEE, MMMM d, yyyy");
    } catch {
      return event.date;
    }
  })();

  const sdgLabels: Record<number, string> = {
    4: "Quality Education",
    8: "Decent Work & Economic Growth",
    11: "Sustainable Cities & Communities",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to events
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image area */}
          <div className="relative h-64 md:h-80 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex items-center justify-center">
            <span className="text-7xl">{cat.emoji}</span>
            <div
              className="absolute top-4 left-4 px-3 py-1.5 rounded-lg text-white text-sm font-semibold"
              style={{ backgroundColor: cat.color }}
            >
              {cat.emoji} {cat.label}
            </div>
            {event.source === "ai-extracted" && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center gap-1">
                <Sparkles size={12} /> AI Extracted
              </div>
            )}
            <div className="absolute bottom-4 right-4">
              {event.isFree ? (
                <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-bold">
                  FREE
                </span>
              ) : (
                <span className="px-3 py-1.5 bg-white/90 backdrop-blur text-gray-800 rounded-lg text-sm font-bold">
                  {event.price}
                </span>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              {event.title}
            </h1>
            <p className="text-gray-500 mt-1">by {event.organizer}</p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
              >
                <Tag size={10} /> {tag}
              </span>
            ))}
          </div>

          {/* Map */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin size={18} className="text-red-500" /> Location
            </h3>
            <EventMap
              events={[event]}
              center={{ lat: event.lat, lng: event.lng }}
              zoom={14}
              className="w-full h-[300px]"
            />
            <p className="text-sm text-gray-500 mt-2">
              {event.address}, {event.city}, {event.state}
            </p>
          </div>

          {/* SDG Goals */}
          {event.sdgGoals.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Globe size={18} className="text-green-600" /> SDG Contribution
              </h3>
              <div className="flex flex-wrap gap-3">
                {event.sdgGoals.map((goal) => (
                  <div
                    key={goal}
                    className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <span className="w-8 h-8 rounded-lg bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                      {goal}
                    </span>
                    <span className="text-sm font-medium text-green-800">
                      {sdgLabels[goal] || `SDG ${goal}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Info Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 sticky top-24">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {formattedDate}
                </p>
                <p className="text-xs text-gray-500">
                  {event.time}
                  {event.endTime && ` — ${event.endTime}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock size={18} className="text-purple-500 shrink-0" />
              <p className="text-sm text-gray-700">{event.time} start</p>
            </div>

            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {event.venue}
                </p>
                <p className="text-xs text-gray-500">
                  {event.city}, {event.state}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users size={18} className="text-indigo-500 shrink-0" />
              <p className="text-sm text-gray-700">
                {event.attendeeCount.toLocaleString()} attending
                {event.maxCapacity &&
                  ` / ${event.maxCapacity.toLocaleString()} max`}
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* Actions */}
            <div className="space-y-2">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm">
                I&apos;m Going! 🎉
              </button>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">
                  <Heart size={14} /> Save
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-all">
                  <Share2 size={14} /> Share
                </button>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Contact */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">
                Contact
              </h4>
              {event.contactEmail && (
                <a
                  href={`mailto:${event.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                >
                  <Mail size={14} /> {event.contactEmail}
                </a>
              )}
              {event.contactPhone && (
                <a
                  href={`tel:${event.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                >
                  <Phone size={14} /> {event.contactPhone}
                </a>
              )}
              {event.website && (
                <a
                  href={event.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600"
                >
                  <ExternalLink size={14} /> Website
                </a>
              )}
              {!event.contactEmail && !event.contactPhone && !event.website && (
                <p className="text-xs text-gray-400">
                  Contact info not available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
