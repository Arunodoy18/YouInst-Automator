/**
 * Reroll AI Video Enhancement Integration
 * AI video upscaling, style transfer, and quality enhancement
 * 
 * Features:
 * - 4K upscaling
 * - Style transfer (anime, realistic, cartoon)
 * - Frame interpolation
 * - Quality enhancement
 */

import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";

const REROLL_API_URL = process.env.REROLL_API_URL || "https://api.reroll.ai/v1";
const REROLL_API_KEY = process.env.REROLL_API_KEY;

export interface RerollEnhanceOptions {
  operation: "upscale" | "style-transfer" | "interpolate" | "enhance";
  targetResolution?: "1080p" | "2k" | "4k";
  style?: "anime" | "realistic" | "cartoon" | "oil-painting" | "sketch";
  interpolationFps?: number;    // For frame interpolation (30, 60, 120)
  denoiseLevel?: number;        // 0-10
  sharpenLevel?: number;        // 0-10
}

export interface RerollJobStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;             // 0-100
  videoUrl?: string;
  error?: string;
  processingTime?: number;      // seconds
}

/**
 * Enhance video using Reroll API
 */
export async function enhanceVideoWithReroll(
  inputVideoPath: string,
  options: RerollEnhanceOptions,
  outputPath: string
): Promise<string> {
  if (!REROLL_API_KEY) {
    throw new Error("REROLL_API_KEY not configured");
  }

  console.log("  [Reroll] Initiating video enhancement...");
  console.log(`    Input: ${path.basename(inputVideoPath)}`);
  console.log(`    Operation: ${options.operation}`);
  
  if (options.operation === "upscale") {
    console.log(`    Target: ${options.targetResolution || "4k"}`);
  } else if (options.operation === "style-transfer") {
    console.log(`    Style: ${options.style || "realistic"}`);
  } else if (options.operation === "interpolate") {
    console.log(`    Target FPS: ${options.interpolationFps || 60}`);
  }

  try {
    // 1. Upload video
    const uploadedUrl = await uploadVideoToReroll(inputVideoPath);
    console.log(`  [Reroll] Video uploaded`);

    // 2. Create enhancement job
    const job = await createRerollJob(uploadedUrl, options);
    console.log(`  [Reroll] Job created: ${job.id}`);

    // 3. Poll for completion
    const videoUrl = await pollRerollJob(job.id);

    // 4. Download enhanced video
    await downloadRerollVideo(videoUrl, outputPath);

    const stats = fs.statSync(outputPath);
    console.log(`  [Reroll] ✓ Video enhanced: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);

    return outputPath;
  } catch (error: any) {
    console.error(`  [Reroll] Error: ${error.message}`);
    throw new Error(`Reroll enhancement failed: ${error.message}`);
  }
}

/**
 * Upload video to Reroll for processing
 */
async function uploadVideoToReroll(videoPath: string): Promise<string> {
  const form = new FormData();
  form.append("video", fs.createReadStream(videoPath));

  const response = await axios.post(`${REROLL_API_URL}/upload`, form, {
    headers: {
      ...form.getHeaders(),
      "Authorization": `Bearer ${REROLL_API_KEY}`,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return response.data.url;
}

/**
 * Create a Reroll enhancement job
 */
async function createRerollJob(
  videoUrl: string,
  options: RerollEnhanceOptions
): Promise<RerollJobStatus> {
  const response = await axios.post(
    `${REROLL_API_URL}/enhance`,
    {
      video_url: videoUrl,
      operation: options.operation,
      target_resolution: options.targetResolution || "4k",
      style: options.style || "realistic",
      interpolation_fps: options.interpolationFps || 60,
      denoise_level: options.denoiseLevel || 5,
      sharpen_level: options.sharpenLevel || 3,
    },
    {
      headers: {
        "Authorization": `Bearer ${REROLL_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

/**
 * Poll Reroll job until completion
 */
async function pollRerollJob(jobId: string): Promise<string> {
  const maxAttempts = 120; // 10 minutes (5s intervals) - enhancement takes longer
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getRerollJobStatus(jobId);

    if (status.status === "completed") {
      if (!status.videoUrl) {
        throw new Error("Video URL not provided");
      }
      console.log(""); // New line after progress
      return status.videoUrl;
    }

    if (status.status === "failed") {
      throw new Error(status.error || "Enhancement failed");
    }

    // Show progress
    if (status.progress > 0) {
      process.stdout.write(`\r  [Reroll] Progress: ${status.progress}%`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error("Enhancement timeout (10 minutes)");
}

/**
 * Get job status from Reroll API
 */
async function getRerollJobStatus(jobId: string): Promise<RerollJobStatus> {
  const response = await axios.get(`${REROLL_API_URL}/jobs/${jobId}`, {
    headers: {
      "Authorization": `Bearer ${REROLL_API_KEY}`,
    },
  });

  return response.data;
}

/**
 * Download enhanced video from Reroll CDN
 */
async function downloadRerollVideo(url: string, outputPath: string): Promise<void> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`  [Reroll] Downloading enhanced video...`);

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
 * Check Reroll API health
 */
export async function checkRerollHealth(): Promise<boolean> {
  if (!REROLL_API_KEY) {
    return false;
  }

  try {
    const response = await axios.get(`${REROLL_API_URL}/health`, {
      headers: { "Authorization": `Bearer ${REROLL_API_KEY}` },
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Quick upscale helper
 */
export async function upscaleVideo(
  inputPath: string,
  outputPath: string,
  targetResolution: "1080p" | "2k" | "4k" = "4k"
): Promise<string> {
  return enhanceVideoWithReroll(inputPath, { operation: "upscale", targetResolution }, outputPath);
}

/**
 * Quick style transfer helper
 */
export async function applyStyleTransfer(
  inputPath: string,
  outputPath: string,
  style: "anime" | "realistic" | "cartoon" = "anime"
): Promise<string> {
  return enhanceVideoWithReroll(inputPath, { operation: "style-transfer", style }, outputPath);
}

/**
 * Quick frame interpolation helper
 */
export async function interpolateFrames(
  inputPath: string,
  outputPath: string,
  targetFps: number = 60
): Promise<string> {
  return enhanceVideoWithReroll(
    inputPath,
    { operation: "interpolate", interpolationFps: targetFps },
    outputPath
  );
}
