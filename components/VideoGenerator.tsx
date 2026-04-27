"use client";

import { useState, useRef, useCallback } from "react";
import type { AspectRatio, VideoResult } from "@/lib/types";

const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "16:9", icon: "▬" },
  { value: "9:16", label: "9:16", icon: "▮" },
  { value: "1:1", label: "1:1", icon: "■" },
  { value: "4:3", label: "4:3", icon: "▭" },
  { value: "3:4", label: "3:4", icon: "▯" },
  { value: "21:9", label: "21:9", icon: "⬛" },
  { value: "adaptive", label: "Auto", icon: "✦" },
];

const ASPECT_CSS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "9:16": "aspect-[9/16] max-w-[300px]",
  "1:1": "aspect-square max-w-[480px]",
  "4:3": "aspect-[4/3]",
  "3:4": "aspect-[3/4] max-w-[360px]",
  "21:9": "aspect-[21/9]",
  adaptive: "aspect-video",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target?.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function VideoGenerator() {
  const [mode, setMode] = useState<"text-to-video" | "image-to-video">("text-to-video");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [duration, setDuration] = useState(5);
  const [creativityScale, setCreativityScale] = useState(0.5);
  const [temporalSmoothing, setTemporalSmoothing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // image refs
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImages = useCallback((files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 9);
    setImageFiles((prev) => [...prev, ...valid].slice(0, 9));
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setImagePreviews((prev) => [...prev, e.target?.result as string].slice(0, 9));
      reader.readAsDataURL(file);
    });
  }, []);

  const removeImage = (i: number) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      addImages(e.dataTransfer.files);
    },
    [addImages]
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    if (mode === "image-to-video" && imageFiles.length === 0 && !imageUrls.trim()) {
      setError("Please add at least one reference image.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let refImages: string[] = [];

      if (mode === "image-to-video") {
        const fileDataUrls = await Promise.all(imageFiles.map(toDataUrl));
        const urlList = imageUrls
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        refImages = [...fileDataUrls, ...urlList].slice(0, 9);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          reference_images: refImages.length ? refImages : undefined,
          aspect_ratio: aspectRatio,
          duration,
          mode,
          creativity_scale: creativityScale,
          temporal_smoothing: temporalSmoothing,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const result: VideoResult = {
        id: uid(),
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

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
          S
        </div>
        <span className="font-semibold text-lg tracking-tight">Seedance 2</span>
        <span className="text-xs text-white/40 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          AI Video Generator
        </span>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[440px_1fr] gap-8">
        {/* Controls */}
        <aside className="space-y-5">
          {/* Mode */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              {(["text-to-video", "image-to-video"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    mode === m ? "bg-indigo-600 text-white shadow" : "text-white/50 hover:text-white"
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
                  : "Describe how the image should animate... Reference images as [Image1], [Image2]..."
              }
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition"
            />
          </div>

          {/* Reference Images */}
          {mode === "image-to-video" && (
            <div>
              <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                Reference Images{" "}
                <span className="text-white/30 normal-case font-normal">
                  (up to 9 · reference as [Image1], [Image2]…)
                </span>
              </label>
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`ref ${i + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-white/10"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 bg-black/70 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] transition"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-0.5 left-1 text-[9px] text-white/60 font-mono">
                        [{i + 1}]
                      </span>
                    </div>
                  ))}
                  {imagePreviews.length < 9 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-lg border border-dashed border-white/20 hover:border-indigo-500 flex items-center justify-center text-white/30 hover:text-indigo-400 text-xl transition"
                    >
                      +
                    </button>
                  )}
                </div>
              )}
              {imagePreviews.length === 0 && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition group"
                >
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-lg group-hover:bg-indigo-500/10 transition">
                    ↑
                  </div>
                  <p className="text-sm text-white/40 text-center">
                    Drop images or <span className="text-indigo-400">browse</span>
                  </p>
                  <p className="text-xs text-white/20">PNG, JPG, WEBP · up to 9 images</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addImages(e.target.files)}
              />
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">or paste URLs (one per line)</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <textarea
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                placeholder={"https://example.com/image1.jpg\nhttps://..."}
                rows={2}
                className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 resize-none transition"
              />
            </div>
          )}

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Aspect Ratio
            </label>
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar.value}
                  onClick={() => setAspectRatio(ar.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    aspectRatio === ar.value
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-white/10 bg-white/5 text-white/40 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span>{ar.icon}</span>
                  <span>{ar.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              Duration — <span className="text-white/70 normal-case font-normal">{duration}s</span>
            </label>
            <input
              type="range"
              min={4}
              max={15}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>4s</span>
              <span>15s</span>
            </div>
          </div>

          {/* Advanced */}
          <div>
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition"
            >
              <span>{showAdvanced ? "▾" : "▸"}</span>
              Advanced settings
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-4 border border-white/10 rounded-xl p-4 bg-white/3">
                {/* Creativity Scale */}
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-2">
                    Creativity Scale —{" "}
                    <span className="text-white/70">{creativityScale.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={creativityScale}
                    onChange={(e) => setCreativityScale(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-white/25 mt-1">
                    <span>Literal</span>
                    <span>Creative</span>
                  </div>
                </div>
                {/* Temporal Smoothing */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white/50">Temporal Smoothing</p>
                    <p className="text-[11px] text-white/25">Reduces flicker in long shots</p>
                  </div>
                  <button
                    onClick={() => setTemporalSmoothing((v) => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      temporalSmoothing ? "bg-indigo-600" : "bg-white/10"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        temporalSmoothing ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </span>
            ) : (
              "Generate Video"
            )}
          </button>
        </aside>

        {/* Output */}
        <main className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {activeVideo ? (
              <div className="p-4 space-y-4">
                <div className={`mx-auto w-full ${ASPECT_CSS[activeVideo.aspect_ratio]}`}>
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
                  <p className="text-sm text-white/60 flex-1 line-clamp-2">{activeVideo.prompt}</p>
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
                    className={`rounded-xl overflow-hidden border transition-all text-left ${
                      activeVideo?.id === r.id ? "border-indigo-500" : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <video src={r.video_url} muted className="w-full aspect-video object-cover bg-black" />
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
