"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, MapPin, Calendar } from "lucide-react";
import { CATEGORY_CONFIG, CITIES } from "@/lib/constants";
import { EventCategory, SearchFilters } from "@/lib/types";

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  initialQuery?: string;
  initialCategory?: string;
  initialCity?: string;
  showFilters?: boolean;
}

export default function SearchBar({ onSearch, initialQuery = "", initialCategory = "", initialCity = "", showFilters = true }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filtersOpen, setFiltersOpen] = useState(!!(initialCategory || initialCity));
  const [category, setCategory] = useState<EventCategory | "">(initialCategory as EventCategory | "");
  const [city, setCity] = useState(initialCity);
  const [isFree, setIsFree] = useState<boolean | undefined>();

  const handleSearch = () => {
    onSearch({
      query: query || undefined,
      category: category || undefined,
      city: city || undefined,
      isFree,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const clearFilters = () => {
    setCategory("");
    setCity("");
    setIsFree(undefined);
    onSearch({ query: query || undefined });
  };

  const activeFilterCount = [category, city, isFree !== undefined].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search events… e.g. &quot;music gigs near me with no cover charge&quot;"
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        {showFilters && (
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`relative flex items-center gap-2 px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
              filtersOpen
                ? "bg-blue-50 border-blue-200 text-blue-600"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-200 transition-all"
        >
          Search
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-800">Filters</h4>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X size={12} />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                <Calendar size={12} /> Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const val = e.target.value as EventCategory | "";
                  setCategory(val);
                  onSearch({ query: query || undefined, category: val || undefined, city: city || undefined, isFree });
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Categories</option>
                {Object.entries(CATEGORY_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.emoji} {val.label}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
                <MapPin size={12} /> City
              </label>
              <select
                value={city}
                onChange={(e) => {
                  const val = e.target.value;
                  setCity(val);
                  onSearch({ query: query || undefined, category: category || undefined, city: val || undefined, isFree });
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Cities</option>
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Price
              </label>
              <div className="flex gap-2">
                {[
                  { label: "All", value: undefined },
                  { label: "Free", value: true },
                  { label: "Paid", value: false },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      setIsFree(opt.value);
                      onSearch({ query: query || undefined, category: category || undefined, city: city || undefined, isFree: opt.value });
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isFree === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
