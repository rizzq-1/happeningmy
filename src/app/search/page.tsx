"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MapPin, Sparkles, Globe, ExternalLink } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import EventCard from "@/components/EventCard";
import EventMap from "@/components/EventMap";
import { SEED_EVENTS } from "@/lib/constants";
import { HappeningEvent, SearchFilters, EventCategory } from "@/lib/types";

interface WebEvent extends HappeningEvent {
  website?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<HappeningEvent[]>(SEED_EVENTS);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<HappeningEvent[] | null>(null);
  const [webResults, setWebResults] = useState<WebEvent[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [searchContext, setSearchContext] = useState<string | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [searchEngine, setSearchEngine] = useState<string | null>(null);

  const initialCategory = searchParams.get("category") || "";
  const initialCity = searchParams.get("city") || "";

  useEffect(() => {
    if (initialCategory || initialCity) {
      handleSearch({
        category: initialCategory as EventCategory || undefined,
        city: initialCity || undefined,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback((filters: SearchFilters) => {
    setLoading(true);
    setSemanticResults(null);
    setWebResults([]);
    setAiSummary(null);
    setSearchContext(null);
    setSearchEngine(null);

    let results = [...SEED_EVENTS];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q)) ||
          e.venue.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q)
      );
    }
    if (filters.category) {
      results = results.filter((e) => e.category === filters.category);
    }
    if (filters.city) {
      results = results.filter((e) => e.city === filters.city);
    }
    if (filters.isFree !== undefined) {
      results = results.filter((e) => e.isFree === filters.isFree);
    }

    setTimeout(() => {
      setEvents(results);
      setLoading(false);
    }, 300);
  }, []);

  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;

    setSemanticLoading(true);
    setWebResults([]);
    setAiSummary(null);
    setSearchContext(null);
    setSearchEngine(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: semanticQuery }),
      });

      if (res.ok) {
        const data = await res.json();
        setSemanticResults(data.results || []);
        setWebResults(data.webResults || []);
        setAiSummary(data.aiSummary || null);
        setSearchContext(data.searchContext || null);
        setSearchEngine(data.engine || null);
      } else {
        const q = semanticQuery.toLowerCase();
        const results = SEED_EVENTS.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.tags.some((t) => t.includes(q))
        );
        setSemanticResults(results);
      }
    } catch {
      const q = semanticQuery.toLowerCase();
      const results = SEED_EVENTS.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.includes(q))
      );
      setSemanticResults(results);
    } finally {
      setSemanticLoading(false);
    }
  };

  const localDisplayEvents = semanticResults || events;
  const allDisplayEvents = [...localDisplayEvents, ...webResults];
  const totalCount = allDisplayEvents.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Search size={28} className="text-blue-600" />
          Discover Events
        </h1>
        <p className="text-gray-500 mt-2">
          Search by keyword, filter by category, or ask Gemini AI to find events from across the web
        </p>
      </div>

      {/* Gemini AI Search */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-purple-600" />
          <h3 className="text-sm font-bold text-gray-800">
            AI Search powered by Gemini
          </h3>
          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
            Google Search Grounded
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Describe what you&apos;re looking for in plain language — Gemini will search the web for real events in Malaysia.
          Try &ldquo;live jazz this weekend in KL&rdquo; or &ldquo;free outdoor family activities in Penang&rdquo;
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={semanticQuery}
            onChange={(e) => setSemanticQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSemanticSearch()}
            placeholder="Ask Gemini... e.g. 'affordable food festivals near Kuala Lumpur'"
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
          <button
            onClick={handleSemanticSearch}
            disabled={semanticLoading}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {semanticLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Search
          </button>
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div className="bg-white rounded-xl border border-purple-100 p-4 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-800 leading-relaxed">{aiSummary}</p>
              {searchContext && (
                <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                  <Globe size={10} /> {searchContext}
                </p>
              )}
              {searchEngine && (
                <span className="inline-block mt-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Engine: {searchEngine}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Standard Search */}
      <SearchBar
        onSearch={handleSearch}
        initialQuery={searchParams.get("q") || ""}
      />

      {/* View Toggle & Results Count */}
      <div className="flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-gray-500">
          {loading || semanticLoading
            ? "Searching..."
            : `${totalCount} events found${webResults.length > 0 ? ` (${webResults.length} from web)` : ""}`}
        </p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === "grid"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
              view === "map"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <MapPin size={12} /> Map
          </button>
        </div>
      </div>

      {/* Results */}
      {view === "grid" ? (
        <div className="space-y-8">
          {/* Web Results Section */}
          {webResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-blue-600" />
                <h2 className="text-lg font-bold text-gray-800">From the Web</h2>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                  Powered by Gemini
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {webResults.map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
                      <Globe size={10} /> Web
                    </div>
                    <EventCard event={event} />
                    {event.website && (
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2"
                      >
                        <ExternalLink size={10} /> Visit source
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Results Section */}
          {localDisplayEvents.length > 0 && (
            <div>
              {webResults.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <MapPin size={16} className="text-green-600" />
                  <h2 className="text-lg font-bold text-gray-800">From HappeningMY</h2>
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                    Local events
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {localDisplayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {totalCount === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔍</p>
              <h3 className="text-lg font-bold text-gray-800">No events found</h3>
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search or ask Gemini something different
              </p>
            </div>
          )}
        </div>
      ) : (
        <EventMap
          events={allDisplayEvents}
          className="w-full h-[600px]"
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
