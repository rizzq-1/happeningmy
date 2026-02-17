"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { HappeningEvent, HeatmapDataPoint } from "@/lib/types";
import { CATEGORY_CONFIG, MALAYSIA_CENTER } from "@/lib/constants";

interface EventMapProps {
  events: HappeningEvent[];
  heatmapData?: HeatmapDataPoint[];
  showHeatmap?: boolean;
  onMarkerClick?: (event: HappeningEvent) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export default function EventMap({
  events,
  heatmapData,
  showHeatmap = false,
  onMarkerClick,
  center = MALAYSIA_CENTER,
  zoom = 7,
  className = "w-full h-[500px]",
}: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const AdvancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === "your_google_maps_api_key") {
      setError("Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local");
      return;
    }

    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places", "marker", "visualization"],
    });

    Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
      importLibrary("visualization"),
    ])
      .then(async ([, markerLib]) => {
        if (!mapRef.current) return;

        AdvancedMarkerRef.current = (markerLib as google.maps.MarkerLibrary).AdvancedMarkerElement;

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapInstanceRef.current = map;
        setIsLoaded(true);
      })
      .catch((err) => {
        const msg = String(err?.message || err || "");
        if (msg.includes("ApiNotActivatedMapError") || msg.includes("api-not-activated")) {
          setError(
            "Maps JavaScript API is not enabled. Go to Google Cloud Console → APIs & Services → Library → enable 'Maps JavaScript API' for your project."
          );
        } else {
          setError("Failed to load Google Maps. Check your API key and enabled APIs in Google Cloud Console.");
        }
      });
  }, [center, zoom]);

  // Add markers
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !AdvancedMarkerRef.current) return;

    const AdvancedMarker = AdvancedMarkerRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    events.forEach((event) => {
      const cat = CATEGORY_CONFIG[event.category] || { emoji: "📌", color: "#6B7280" };

      const pin = document.createElement("div");
      pin.className = "event-marker";
      pin.innerHTML = `
        <div style="
          background: ${cat.color};
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
          cursor: pointer;
          transition: transform 0.2s;
        ">${cat.emoji}</div>
      `;

      pin.addEventListener("mouseenter", () => {
        pin.style.transform = "scale(1.2)";
        pin.style.zIndex = "10";
      });
      pin.addEventListener("mouseleave", () => {
        pin.style.transform = "scale(1)";
        pin.style.zIndex = "1";
      });

      const marker = new AdvancedMarker({
        map: mapInstanceRef.current!,
        position: { lat: event.lat, lng: event.lng },
        content: pin,
        title: event.title,
      });

      marker.addListener("click", () => {
        onMarkerClick?.(event);
      });

      markersRef.current.push(marker);
    });
  }, [events, isLoaded, onMarkerClick]);

  // Heatmap layer
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current || !showHeatmap || !heatmapData) return;

    const heatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmapData.map(
        (point) =>
          ({
            location: new google.maps.LatLng(point.lat, point.lng),
            weight: point.weight,
          })
      ),
      map: mapInstanceRef.current,
      radius: 50,
      opacity: 0.6,
    });

    return () => {
      heatmap.setMap(null);
    };
  }, [heatmapData, showHeatmap, isLoaded]);

  if (error) {
    return (
      <div className={`${className} rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-dashed border-blue-200 flex items-center justify-center`}>
        <div className="text-center p-6">
          <div className="text-4xl mb-3">🗺️</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Map Preview</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {error}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs mx-auto">
            {events.slice(0, 4).map((e) => (
              <div
                key={e.id}
                className="bg-white/70 rounded-lg p-2 text-left cursor-pointer hover:bg-white transition-colors"
                onClick={() => onMarkerClick?.(e)}
              >
                <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                <p className="text-[10px] text-gray-500">{e.city}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-2xl overflow-hidden shadow-sm border border-gray-200 relative`}>
      <div ref={mapRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading map...
          </div>
        </div>
      )}
    </div>
  );
}
