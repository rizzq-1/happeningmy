"use client";

import { useState, useCallback } from "react";
import { Upload, Camera, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { GeminiExtractionResult } from "@/lib/types";

interface PosterUploaderProps {
  onExtracted: (result: GeminiExtractionResult, imageUrl: string) => void;
}

export default function PosterUploader({ onExtracted }: PosterUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "extracting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [extraction, setExtraction] = useState<GeminiExtractionResult | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (JPG, PNG, or WebP).");
      setStatus("error");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setErrorMsg("File too large. Max 10 MB.");
      setStatus("error");
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus("idle");
    setErrorMsg("");
    setExtraction(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleExtract = async () => {
    if (!file) return;

    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("poster", file);

      setStatus("extracting");

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Extraction failed");
      }

      const data = await res.json();
      setExtraction(data.extraction);
      setStatus("success");
      onExtracted(data.extraction, preview || "");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setStatus("idle");
    setErrorMsg("");
    setExtraction(null);
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
            dragActive
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
          }`}
          onClick={() => document.getElementById("poster-input")?.click()}
        >
          <input
            id="poster-input"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <Upload size={28} className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800">
                Drop your event poster here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse · JPG, PNG, WebP up to 10 MB
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Camera size={14} /> Take Photo
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Sparkles size={14} /> AI-Powered
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Actions */}
      {file && preview && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image preview */}
            <div className="relative bg-gray-50 flex items-center justify-center min-h-[300px] p-4">
              <img
                src={preview}
                alt="Poster preview"
                className="max-h-[400px] object-contain rounded-lg shadow-sm"
              />
              {status === "extracting" && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <Loader2 size={32} className="text-blue-600 animate-spin" />
                      <Sparkles size={14} className="text-purple-500 absolute -top-1 -right-1 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      Gemini is analyzing your poster...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Info / Results panel */}
            <div className="p-6">
              {status === "idle" && (
                <div className="h-full flex flex-col justify-center items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Ready to Extract</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Gemini 1.5 Flash will analyze this poster and extract event details automatically.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      Change Image
                    </button>
                    <button
                      onClick={handleExtract}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-blue-200 transition-all flex items-center gap-2"
                    >
                      <Sparkles size={16} />
                      Extract with AI
                    </button>
                  </div>
                </div>
              )}

              {status === "uploading" && (
                <div className="h-full flex items-center justify-center">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Loader2 size={20} className="animate-spin" />
                    <span>Uploading poster...</span>
                  </div>
                </div>
              )}

              {status === "success" && extraction && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-4">
                    <CheckCircle2 size={20} />
                    <span className="text-sm font-semibold">
                      Extraction Complete — {Math.round(extraction.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <div className="space-y-3 text-sm">
                    <Field label="Title" value={extraction.title} />
                    <Field label="Date" value={extraction.date} />
                    <Field label="Time" value={extraction.time} />
                    <Field label="Venue" value={extraction.venue} />
                    <Field label="Location" value={`${extraction.city}, ${extraction.state}`} />
                    <Field label="Category" value={extraction.category} />
                    <Field label="Price" value={extraction.isFree ? "Free" : extraction.price} />
                    <Field label="Organizer" value={extraction.organizer} />
                    {extraction.tags.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-xs">Tags</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {extraction.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={reset}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                    >
                      Upload Another
                    </button>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <AlertCircle size={32} className="text-red-500" />
                  <div>
                    <h3 className="font-bold text-gray-900">Extraction Failed</h3>
                    <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleExtract}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400 text-xs">{label}</span>
      <p className="text-gray-800 font-medium">{value || "—"}</p>
    </div>
  );
}
