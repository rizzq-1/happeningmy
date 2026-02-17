"use client";

import { useState } from "react";
import { Sparkles, Upload as UploadIcon, CheckCircle2 } from "lucide-react";
import PosterUploader from "@/components/PosterUploader";
import { GeminiExtractionResult } from "@/lib/types";

export default function UploadPage() {
  const [extracted, setExtracted] = useState<GeminiExtractionResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleExtracted = (result: GeminiExtractionResult, imgUrl: string) => {
    setExtracted(result);
    setImageUrl(imgUrl);
    setPublished(false);
  };

  const handlePublish = async () => {
    if (!extracted) return;

    setPublishing(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extracted,
          imageUrl: imageUrl || "",
          lat: 3.139 + (Math.random() - 0.5) * 0.05,
          lng: 101.6869 + (Math.random() - 0.5) * 0.05,
          attendeeCount: 0,
          status: "published",
          source: "ai-extracted",
        }),
      });

      if (res.ok) {
        setPublished(true);
      }
    } catch (error) {
      console.error("Publish error:", error);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-4">
          <Sparkles size={14} />
          Powered by Gemini 1.5 Flash
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          Snapshot-to-Event
        </h1>
        <p className="mt-3 text-gray-500 max-w-lg mx-auto">
          Upload an event poster or flyer and let Google AI extract all the
          details automatically. No manual data entry needed!
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {[
          {
            step: "1",
            title: "Upload Poster",
            desc: "Take a photo or drag & drop your event flyer",
            icon: UploadIcon,
          },
          {
            step: "2",
            title: "AI Extracts Details",
            desc: "Gemini analyzes the image and pulls out event info",
            icon: Sparkles,
          },
          {
            step: "3",
            title: "Publish Instantly",
            desc: "Review the extracted details and publish to the map",
            icon: CheckCircle2,
          },
        ].map((s) => (
          <div
            key={s.step}
            className="bg-white rounded-xl border border-gray-100 p-5 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold mx-auto mb-3">
              {s.step}
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{s.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Uploader */}
      <PosterUploader onExtracted={handleExtracted} />

      {/* Publish Button */}
      {extracted && !published && (
        <div className="mt-8 text-center">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {publishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Publish Event to Map
              </>
            )}
          </button>
        </div>
      )}

      {/* Success */}
      {published && (
        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-emerald-800">
            Event Published! 🎉
          </h3>
          <p className="text-sm text-emerald-600 mt-1">
            Your event has been extracted and published to the HappeningMY map.
          </p>
        </div>
      )}
    </div>
  );
}
