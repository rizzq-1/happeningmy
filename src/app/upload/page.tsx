"use client";

import { useState } from "react";
import { Sparkles, Upload as UploadIcon, CheckCircle2, LogIn, ShieldCheck, Clock, Pencil } from "lucide-react";
import PosterUploader from "@/components/PosterUploader";
import { uploadPoster, createEvent } from "@/lib/events";
import { GeminiExtractionResult, EventCategory } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";

interface EditForm {
  title: string;
  description: string;
  date: string;
  time: string;
  endDate: string;
  endTime: string;
  venue: string;
  address: string;
  city: string;
  state: string;
  category: string;
  tags: string;
  price: string;
  isFree: boolean;
  organizer: string;
  contactEmail: string;
  contactPhone: string;
  website: string;
}

export default function UploadPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [extracted, setExtracted] = useState<GeminiExtractionResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const handleExtracted = (result: GeminiExtractionResult, imgUrl: string, file: File) => {
    setExtracted(result);
    setImageUrl(imgUrl);
    setPosterFile(file);
    setPublished(false);
    // Populate editable form from extraction
    setEditForm({
      title: result.title || "",
      description: result.description || "",
      date: result.date || "",
      time: result.time || "",
      endDate: result.endDate || "",
      endTime: result.endTime || "",
      venue: result.venue || "",
      address: result.address || "",
      city: result.city || "",
      state: result.state || "",
      category: result.category || "community",
      tags: (result.tags || []).join(", "),
      price: result.price || "",
      isFree: result.isFree ?? false,
      organizer: result.organizer || "",
      contactEmail: result.contactEmail || "",
      contactPhone: result.contactPhone || "",
      website: result.website || "",
    });
  };

  function updateField(field: keyof EditForm, value: string | boolean) {
    setEditForm((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  const handlePublish = async () => {
    if (!editForm) return;

    setPublishing(true);
    setPublishError("");
    try {
      // Upload poster to Firebase Storage for a persistent URL
      let finalImageUrl = imageUrl || "";
      if (posterFile) {
        try {
          finalImageUrl = await Promise.race([
            uploadPoster(posterFile),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Storage upload timed out")), 15000)
            ),
          ]);
          console.log("Storage upload succeeded:", finalImageUrl);
        } catch (err) {
          console.error("Storage upload failed, using local preview:", err);
        }
      }

      const tags = editForm.tags.split(",").map((t) => t.trim()).filter(Boolean);

      const payload = {
        title: editForm.title,
        description: editForm.description,
        date: editForm.date,
        time: editForm.time,
        endDate: editForm.endDate || undefined,
        endTime: editForm.endTime || undefined,
        venue: editForm.venue,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        category: editForm.category as EventCategory,
        tags,
        price: editForm.price,
        isFree: editForm.isFree,
        organizer: editForm.organizer,
        contactEmail: editForm.contactEmail || undefined,
        contactPhone: editForm.contactPhone || undefined,
        website: editForm.website || undefined,
        sdgGoals: extracted?.sdgGoals || [],
        confidence: extracted?.confidence || 0,
        imageUrl: finalImageUrl,
        lat: 3.139 + (Math.random() - 0.5) * 0.05,
        lng: 101.6869 + (Math.random() - 0.5) * 0.05,
        attendeeCount: 0,
        status: "pending" as const,
        source: "ai-extracted" as const,
        organizerUid: user?.uid || "",
        organizerEmail: user?.email || "",
        organizerName: user?.displayName || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await createEvent(payload);
      setPublished(true);
    } catch (error) {
      console.error("Publish error:", error);
      setPublishError(error instanceof Error ? error.message : "Network error. Please try again.");
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
            title: "Edit & Submit",
            desc: "Review, edit the details, and submit for admin approval",
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

      {/* Editable Form */}
      {editForm && !published && (
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Pencil size={16} className="text-blue-600" />
              <h3 className="font-bold text-gray-900">Review & Edit Details</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              AI extracted these details — review and correct anything before submitting.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Event Title *</label>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm resize-none"
              />
            </div>

            {/* Date / Time row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Start Time</label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => updateField("time", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">End Time</label>
                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => updateField("endTime", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Venue / City / State */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Venue *</label>
                <input
                  type="text"
                  value={editForm.venue}
                  onChange={(e) => updateField("venue", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">City *</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">State</label>
                <input
                  type="text"
                  value={editForm.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
              />
            </div>

            {/* Category / Price / Free */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm bg-white"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.emoji} {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price</label>
                <input
                  type="text"
                  value={editForm.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="e.g. RM 50 or Free"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isFree}
                    onChange={(e) => {
                      updateField("isFree", e.target.checked);
                      if (e.target.checked) updateField("price", "Free");
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                  />
                  <span className="text-sm text-gray-700 font-medium">Free event</span>
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={editForm.tags}
                onChange={(e) => updateField("tags", e.target.value)}
                placeholder="e.g. music, live, outdoor"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
              />
            </div>

            {/* Organizer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Organizer</label>
                <input
                  type="text"
                  value={editForm.organizer}
                  onChange={(e) => updateField("organizer", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Website</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) => updateField("contactEmail", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editForm.contactPhone}
                  onChange={(e) => updateField("contactPhone", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Publish */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              {extracted?.confidence !== undefined && (
                <p className="text-xs text-gray-400">
                  AI confidence: <span className="font-semibold text-gray-600">{Math.round(extracted.confidence * 100)}%</span>
                </p>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={handlePublish}
                  disabled={publishing || !editForm.title.trim() || !editForm.date}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50 text-sm"
                >
                  {publishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      Submit for Review
                    </>
                  )}
                </button>
              </div>
            </div>

            {publishError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700 font-medium">Failed to publish</p>
                <p className="text-xs text-red-600 mt-1">{publishError}</p>
              </div>
            )}
          </div>
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
