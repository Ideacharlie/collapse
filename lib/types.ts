export type AspectRatio = "16:9" | "9:16" | "1:1";
export type Duration = "5" | "10";
export type Mode = "text-to-video" | "image-to-video";

export interface GenerateRequest {
  prompt: string;
  image_url?: string;
  aspect_ratio: AspectRatio;
  duration: Duration;
  mode: Mode;
}

export interface GenerateResponse {
  video_url: string;
  seed?: number;
}

export interface VideoResult {
  id: string;
  prompt: string;
  video_url: string;
  aspect_ratio: AspectRatio;
  duration: Duration;
  mode: Mode;
  created_at: number;
  thumbnail_url?: string;
}
