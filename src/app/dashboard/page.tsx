"use client";

import { BarChart3, TrendingUp, Target, Sparkles } from "lucide-react";
import { SDGCard, StatsOverview } from "@/components/Dashboard";
import { SDG_METRICS, MOCK_DASHBOARD_STATS, SEED_EVENTS, MOCK_HEATMAP_DATA } from "@/lib/constants";
import EventMap from "@/components/EventMap";

export default function DashboardPage() {
  const aiEvents = SEED_EVENTS.filter((e) => e.source === "ai-extracted").length;
  const totalEvents = SEED_EVENTS.length;
  const aiPercentage = Math.round((aiEvents / totalEvents) * 100);

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
            events={SEED_EVENTS}
            heatmapData={MOCK_HEATMAP_DATA}
            showHeatmap={true}
            className="w-full h-[320px]"
          />
        </div>
      </div>

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
