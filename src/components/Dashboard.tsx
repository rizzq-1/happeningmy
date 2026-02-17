"use client";

import { TrendingUp, TrendingDown, Target, Users, CalendarCheck, Globe } from "lucide-react";
import { SDGMetric, DashboardStats } from "@/lib/types";

interface SDGCardProps {
  metric: SDGMetric;
}

export function SDGCard({ metric }: SDGCardProps) {
  const isPositive = metric.trend > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: metric.color }}
        >
          {metric.goal}
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
            isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(metric.trend)}%
        </div>
      </div>

      <h3 className="font-bold text-gray-900 text-sm">SDG {metric.goal}: {metric.title}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{metric.description}</p>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400">Events</p>
          <p className="text-lg font-bold text-gray-900">{metric.eventCount.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400">People Impacted</p>
          <p className="text-lg font-bold text-gray-900">{metric.attendeeImpact.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

interface StatsOverviewProps {
  stats: DashboardStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const items = [
    { icon: CalendarCheck, label: "Total Events", value: stats.totalEvents.toLocaleString(), color: "text-blue-600 bg-blue-50" },
    { icon: Users, label: "Total Attendees", value: stats.totalAttendees.toLocaleString(), color: "text-purple-600 bg-purple-50" },
    { icon: Target, label: "AI Extracted", value: stats.aiExtractedEvents.toLocaleString(), color: "text-amber-600 bg-amber-50" },
    { icon: Globe, label: "Cities Covered", value: String(stats.citiesCovered), color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
          <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
            <item.icon size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
