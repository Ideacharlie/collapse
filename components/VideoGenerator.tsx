"use client";

import { useState, useRef, useCallback } from "react";
import type { AspectRatio, Duration, Mode, VideoResult } from "@/lib/types";

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "Landscape", icon: "▬" },
  { value: "9:16", label: "Portrait", icon: "▮" },
  { value: "1:1", label: "Square", icon: "■" },
];

const DURATIONS: { value: Duration; label: string }[] = [
  { value: "5", label: "5s" },
  { value: "10", label: "10s" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function VideoGenerator() {
  const [mode, setMode] = useState<Mode>("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState<Duration>("5");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = useCallback((file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Use object URL as the image_url for fal (they accept base64 data URLs)
    setImageUrl("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleImageFile(file);
      }
    },
    [handleImageFile]
  );

  const uploadImageToFal = async (file: File): Promise<string> => {
    // Convert to base64 data URL — fal.ai accepts these directly
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    if (mode === "image-to-video" && !imageFile && !imageUrl) {
      setError("Please upload an image or provide an image URL.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let resolvedImageUrl = imageUrl;
      if (mode === "image-to-video" && imageFile) {
        resolvedImageUrl = await uploadImageToFal(imageFile);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image_url: resolvedImageUrl || undefined,
          aspect_ratio: aspectRatio,
          duration,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const result: VideoResult = {
        id: generateId(),
        prompt,
        video_url: data.video_url,
        aspect_ratio: aspectRatio,
        duration,
        mode,
        created_at: Date.now(),
      };

      setResults((prev) => [result, ...prev]);
      setActiveVideo(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const aspectClass: Record<AspectRatio, string> = {
    "16:9": "aspect-video",
    "9:16": "aspect-[9/16] max-w-[320px]",
    "1:1": "aspect-square max-w-[480px]",
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
            S
          </div>
          <span className="font-semibold text-lg tracking-tight">Seedance 2</span>
          <span className="text-xs text-white/40 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            AI Video Generator
          </span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        {/* Controls Panel */}
        <aside className="space-y-6">
          {/* Mode Toggle */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              {(["text-to-video", "image-to-video"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    mode === m
                      ? "bg-indigo-600 text-white shadow"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {m === "text-to-video" ? "Text to Video" : "Image to Video"}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "text-to-video"
                  ? "A cinematic drone shot over misty mountains at sunrise..."
                  : "Describe how you want the image to animate..."
              }
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition"
            />
          </div>

          {/* Image Upload (image-to-video mode) */}
          {mode === "image-to-video" && (
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                Input Image
              </label>
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-xl object-cover max-h-48"
                  />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                      setImageUrl("");
                    }}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl group-hover:bg-indigo-500/10 transition">
                      ↑
                    </div>
                    <p className="text-sm text-white/40 text-center">
                      Drop an image or{" "}
                      <span className="text-indigo-400">browse</span>
                    </p>
                    <p className="text-xs text-white/20">PNG, JPG, WEBP</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageFile(file);
                    }}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30">or paste URL</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </>
              )}
            </div>
          )}

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Aspect Ratio
            </label>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                    aspectRatio === ar.value
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span className="text-lg leading-none">{ar.icon}</span>
                  <span>{ar.label}</span>
                  <span className="text-[10px] opacity-60">{ar.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    duration === d.value
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:border-white/20"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Generating…
              </span>
            ) : (
              "Generate Video"
            )}
          </button>
        </aside>

        {/* Output Area */}
        <main className="space-y-6">
          {/* Active Video */}
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {activeVideo ? (
              <div className="p-4 space-y-4">
                <div className={`mx-auto w-full ${aspectClass[activeVideo.aspect_ratio]}`}>
                  <video
                    key={activeVideo.video_url}
                    src={activeVideo.video_url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full rounded-xl bg-black"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-white/60 flex-1 line-clamp-2">
                    {activeVideo.prompt}
                  </p>
                  <a
                    href={activeVideo.video_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : loading ? (
              <div className="aspect-video flex flex-col items-center justify-center gap-4 p-8">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <p className="text-white/40 text-sm animate-pulse">
                  Generating your video with Seedance 2…
                </p>
                <p className="text-white/20 text-xs">This typically takes 30–90 seconds</p>
              </div>
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center gap-3 text-white/20 p-8">
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-2xl">
                  ▶
                </div>
                <p className="text-sm">Your generated video will appear here</p>
              </div>
            )}
          </div>

          {/* History */}
          {results.length > 1 && (
            <div>
              <h2 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">
                History
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {results.slice(1).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveVideo(r)}
                    className={`rounded-xl overflow-hidden border transition-all text-left group ${
                      activeVideo?.id === r.id
                        ? "border-indigo-500"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <video
                      src={r.video_url}
                      muted
                      className="w-full aspect-video object-cover bg-black"
                    />
                    <div className="px-2 py-1.5 bg-white/5">
                      <p className="text-xs text-white/40 truncate">{r.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
