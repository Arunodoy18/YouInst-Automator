/**
 * Golpo AI Video Generation Integration
 * Story-based AI video generation
 * 
 * Features:
 * - Text-to-video with narrative understanding
 * - Scene transitions
 * - Character consistency
 * - Multiple aspect ratios
 */

import axios from "axios";
import fs from "fs";
import path from "path";

const GOLPO_API_URL = process.env.GOLPO_API_URL || "https://api.golpo.ai/v1";
const GOLPO_API_KEY = process.env.GOLPO_API_KEY;

export interface GolpoGenerateOptions {
  script: string;               // Story script
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: number;            // Target duration in seconds
  style?: "realistic" | "anime" | "cartoon" | "cinematic";
  fps?: number;                 // 24, 30, or 60
  resolution?: "720p" | "1080p" | "4k";
}

export interface GolpoJobStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;             // 0-100
  videoUrl?: string;
  error?: string;
  estimatedTime?: number;       // seconds
}

/**
 * Generate video using Golpo API
 */
export async function generateGolpoVideo(
  options: GolpoGenerateOptions,
  outputPath: string
): Promise<string> {
  if (!GOLPO_API_KEY) {
    throw new Error("GOLPO_API_KEY not configured");
  }

  console.log("  [Golpo] Initiating video generation...");
  console.log(`    Script: ${options.script.substring(0, 50)}...`);
  console.log(`    Style: ${options.style || "cinematic"}`);
  console.log(`    Resolution: ${options.resolution || "1080p"}`);

  try {
    // 1. Create generation job
    const job = await createGolpoJob(options);
    console.log(`  [Golpo] Job created: ${job.id}`);

    // 2. Poll for completion
    const videoUrl = await pollGolpoJob(job.id);

    // 3. Download video
    await downloadGolpoVideo(videoUrl, outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  [Golpo] ✓ Video generated: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

    return outputPath;
  } catch (error: any) {
    console.error(`  [Golpo] Error: ${error.message}`);
    throw new Error(`Golpo generation failed: ${error.message}`);
  }
}

/**
 * Create a Golpo video generation job
 */
async function createGolpoJob(options: GolpoGenerateOptions): Promise<GolpoJobStatus> {
  const response = await axios.post(
    `${GOLPO_API_URL}/generate`,
    {
      script: options.script,
      aspect_ratio: options.aspectRatio || "9:16",
      duration: options.duration || 30,
      style: options.style || "cinematic",
      fps: options.fps || 30,
      resolution: options.resolution || "1080p",
    },
    {
      headers: {
        "Authorization": `Bearer ${GOLPO_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Poll Golpo job until completion
 */
async function pollGolpoJob(jobId: string): Promise<string> {
  const maxAttempts = 60; // 5 minutes (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getGolpoJobStatus(jobId);

    if (status.status === "completed") {
      if (!status.videoUrl) {
        throw new Error("Video URL not provided");
      }
      return status.videoUrl;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Generation failed");
    }

    // Show progress
    if (status.progress > 0) {
      process.stdout.write(`\r  [Golpo] Progress: ${status.progress}%`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Generation timeout (5 minutes)");
}

/**
 * Get job status from Golpo API
 */
async function getGolpoJobStatus(jobId: string): Promise<GolpoJobStatus> {
  const response = await axios.get(`${GOLPO_API_URL}/jobs/${jobId}`, {
    headers: {
      "Authorization": `Bearer ${GOLPO_API_KEY}`,
    },
  });

  return response.data;
}

/**
 * Download video from Golpo CDN
 */
async function downloadGolpoVideo(url: string, outputPath: string): Promise<void> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n  [Golpo] Downloading video...`);

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
 * Check Golpo API health
 */
export async function checkGolpoHealth(): Promise<boolean> {
  if (!GOLPO_API_KEY) {
    return false;
  }

  try {
    const response = await axios.get(`${GOLPO_API_URL}/health`, {
      headers: { "Authorization": `Bearer ${GOLPO_API_KEY}` },
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
