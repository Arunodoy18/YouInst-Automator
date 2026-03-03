/**
 * bobaAnime AI Video Generation Integration
 * Anime-style AI video generation
 * 
 * Features:
 * - Anime character generation
 * - Motion synthesis
 * - Style consistency
 * - Fast generation
 */

import axios from "axios";
import fs from "fs";
import path from "path";

const BOBA_ANIME_API_URL = process.env.BOBA_ANIME_API_URL || "https://api.boba-anime.com/v1";
const BOBA_ANIME_API_KEY = process.env.BOBA_ANIME_API_KEY;

export interface BobaAnimeGenerateOptions {
  prompt: string;               // Description of the anime video
  character?: string;           // Character description
  scene?: string;               // Scene description
  style?: "shonen" | "shoujo" | "seinen" | "moe" | "realistic";
  motion?: "static" | "slow" | "medium" | "fast" | "dynamic";
  duration?: number;            // Target duration in seconds (1-30)
  fps?: number;                 // 24 or 30
  resolution?: "720p" | "1080p";
}

export interface BobaAnimeJobStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;             // 0-100
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

/**
 * Generate anime video using bobaAnime API
 */
export async function generateBobaAnimeVideo(
  options: BobaAnimeGenerateOptions,
  outputPath: string
): Promise<string> {
  if (!BOBA_ANIME_API_KEY) {
    throw new Error("BOBA_ANIME_API_KEY not configured");
  }

  console.log("  [bobaAnime] Initiating anime video generation...");
  console.log(`    Prompt: ${options.prompt.substring(0, 50)}...`);
  console.log(`    Style: ${options.style || "seinen"}`);
  console.log(`    Motion: ${options.motion || "dynamic"}`);

  try {
    // 1. Create generation job
    const job = await createBobaAnimeJob(options);
    console.log(`  [bobaAnime] Job created: ${job.id}`);

    // 2. Poll for completion
    const videoUrl = await pollBobaAnimeJob(job.id);

    // 3. Download video
    await downloadBobaAnimeVideo(videoUrl, outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  [bobaAnime] ✓ Anime video generated: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

    return outputPath;
  } catch (error: any) {
    console.error(`  [bobaAnime] Error: ${error.message}`);
    throw new Error(`bobaAnime generation failed: ${error.message}`);
  }
}

/**
 * Create a bobaAnime video generation job
 */
async function createBobaAnimeJob(options: BobaAnimeGenerateOptions): Promise<BobaAnimeJobStatus> {
  const response = await axios.post(
    `${BOBA_ANIME_API_URL}/generate`,
    {
      prompt: options.prompt,
      character: options.character || "",
      scene: options.scene || "",
      style: options.style || "seinen",
      motion: options.motion || "dynamic",
      duration: Math.min(options.duration || 30, 30), // Max 30s
      fps: options.fps || 30,
      resolution: options.resolution || "1080p",
    },
    {
      headers: {
        "Authorization": `Bearer ${BOBA_ANIME_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Poll bobaAnime job until completion
 */
async function pollBobaAnimeJob(jobId: string): Promise<string> {
  const maxAttempts = 40; // ~3 minutes (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getBobaAnimeJobStatus(jobId);

    if (status.status === "completed") {
      if (!status.videoUrl) {
        throw new Error("Video URL not provided");
      }
      console.log(""); // New line after progress
      return status.videoUrl;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Generation failed");
    }

    // Show progress
    if (status.progress > 0) {
      process.stdout.write(`\r  [bobaAnime] Progress: ${status.progress}%`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Generation timeout (3 minutes)");
}

/**
 * Get job status from bobaAnime API
 */
async function getBobaAnimeJobStatus(jobId: string): Promise<BobaAnimeJobStatus> {
  const response = await axios.get(`${BOBA_ANIME_API_URL}/jobs/${jobId}`, {
    headers: {
      "Authorization": `Bearer ${BOBA_ANIME_API_KEY}`,
    },
  });

  return response.data;
}

/**
 * Download video from bobaAnime CDN
 */
async function downloadBobaAnimeVideo(url: string, outputPath: string): Promise<void> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`  [bobaAnime] Downloading video...`);

  const response = await axios.get(url, {
    responseType: "stream",
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

/**
 * Check bobaAnime API health
 */
export async function checkBobaAnimeHealth(): Promise<boolean> {
  if (!BOBA_ANIME_API_KEY) {
    return false;
  }

  try {
    const response = await axios.get(`${BOBA_ANIME_API_URL}/health`, {
      headers: { "Authorization": `Bearer ${BOBA_ANIME_API_KEY}` },
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
