"use client";

import { useState } from "react";
import { Sparkles, Upload as UploadIcon, CheckCircle2, LogIn, ShieldCheck, Clock } from "lucide-react";
import PosterUploader from "@/components/PosterUploader";
import { uploadPoster } from "@/lib/events";
import { GeminiExtractionResult } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

export default function UploadPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [extracted, setExtracted] = useState<GeminiExtractionResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleExtracted = (result: GeminiExtractionResult, imgUrl: string, file: File) => {
    setExtracted(result);
    setImageUrl(imgUrl);
    setPosterFile(file);
    setPublished(false);
  };

  const handlePublish = async () => {
    if (!extracted) return;

    setPublishing(true);
    try {
      // Upload poster to Firebase Storage for a persistent URL
      let finalImageUrl = imageUrl || "";
      if (posterFile) {
        try {
          finalImageUrl = await uploadPoster(posterFile);
        } catch (err) {
          console.error("Storage upload failed, using local preview:", err);
        }
      }

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extracted,
          imageUrl: finalImageUrl,
          lat: 3.139 + (Math.random() - 0.5) * 0.05,
          lng: 101.6869 + (Math.random() - 0.5) * 0.05,
          attendeeCount: 0,
          status: "pending",
          source: "ai-extracted",
          organizerUid: user?.uid || "",
          organizerEmail: user?.email || "",
          organizerName: user?.displayName || "",
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

  // ── Auth gate: show sign-in prompt if not logged in ─────
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
          <ShieldCheck size={48} className="text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Sign In Required</h1>
          <p className="text-gray-500 text-sm mb-6">
            To upload event posters, please sign in with your Google account.
            This helps us verify organizers and maintain quality.
          </p>
          <button
            onClick={signInWithGoogle}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all"
          >
            <LogIn size={18} />
            Sign In with Google
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Uploaded events will be reviewed before going live.
          </p>
        </div>
      </div>
    );
  }

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
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-200">
          <Clock size={12} />
          Uploads are reviewed by admins before going live
        </div>
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
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <Clock size={40} className="text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-800">
            Event Submitted for Review! 📋
          </h3>
          <p className="text-sm text-amber-600 mt-1">
            Your event has been extracted and submitted. An admin will review and
            approve it before it appears on the map.
          </p>
        </div>
      )}
    </div>
  );
}
