import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest } from "@/lib/types";

fal.config({
  credentials: process.env.FAL_KEY,
});

// Seedance 2 model IDs on fal.ai
const MODEL_TEXT_TO_VIDEO = "fal-ai/seedance-v2";
const MODEL_IMAGE_TO_VIDEO = "fal-ai/seedance-v2/image-to-video";

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const { prompt, image_url, aspect_ratio, duration, mode } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (mode === "image-to-video" && !image_url) {
      return NextResponse.json({ error: "Image URL is required for image-to-video" }, { status: 400 });
    }

    const modelId = mode === "image-to-video" ? MODEL_IMAGE_TO_VIDEO : MODEL_TEXT_TO_VIDEO;

    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio,
      duration: parseInt(duration),
    };

    if (mode === "image-to-video" && image_url) {
      input.image_url = image_url;
    }

    const result = await fal.subscribe(modelId, {
      input,
      logs: false,
    });

    const output = result.data as { video?: { url: string }; seed?: number };

    if (!output?.video?.url) {
      return NextResponse.json({ error: "No video returned from model" }, { status: 500 });
    }

    return NextResponse.json({
      video_url: output.video.url,
      seed: output.seed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
