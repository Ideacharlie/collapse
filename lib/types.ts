export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "adaptive";
export type Duration = number; // 4–15 seconds
export type Mode = "text-to-video" | "image-to-video";

export interface GenerateRequest {
  prompt: string;
  reference_images?: string[];
  aspect_ratio: AspectRatio;
  duration: Duration;
  mode: Mode;
  creativity_scale?: number;
  temporal_smoothing?: boolean;
}

export interface GenerateResponse {
  video_url: string;
}

export interface VideoResult {
  id: string;
  prompt: string;
  video_url: string;
  aspect_ratio: AspectRatio;
  duration: Duration;
  mode: Mode;
  created_at: number;
}
