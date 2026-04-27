import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import type { GenerateRequest } from "@/lib/types";

export const maxDuration = 300;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const MODEL = "bytedance/seedance-2.0" as const;

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();
    const {
      prompt,
      reference_images,
      aspect_ratio,
      duration,
      creativity_scale,
      temporal_smoothing,
    } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio,
      duration,
    };

    if (reference_images?.length) {
      input.reference_images = reference_images;
    }
    if (creativity_scale !== undefined) {
      input.creativity_scale = creativity_scale;
    }
    if (temporal_smoothing !== undefined) {
      input.temporal_smoothing = temporal_smoothing;
    }

    const output = await replicate.run(MODEL, { input });

    // Replicate returns a FileOutput or string for video models
    const videoUrl = output?.toString?.() ?? String(output);

    if (!videoUrl || videoUrl === "[object Object]") {
      return NextResponse.json({ error: "No video URL returned from model" }, { status: 500 });
    }

    return NextResponse.json({ video_url: videoUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
