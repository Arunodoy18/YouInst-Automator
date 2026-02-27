/**
 * Apply Background Themes to Existing Videos
 *
 * Takes your recorded MP4 videos and creates multiple versions
 * with different visual treatments:
 * - Temple Run: Golden overlay with motion effects
 * - Futuristic: Cyan glow with digital effects
 * - High Energy: Fast cuts with color grading
 * - etc.
 *
 * Usage:
 *   npx ts-node src/cli/apply-backgrounds.ts --all
 *   npx ts-node src/cli/apply-backgrounds.ts input/Subway.mp4
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { transcribeWithWhisper } from "../lib/whisper";
import type { BackgroundMode } from "../lib/visualSelector";

const execAsync = promisify(exec);
const ffmpegPath: string = require("ffmpeg-static");
const ffprobePath: string = require("@ffprobe-installer/ffprobe").path;

const OUTPUT_DIR = path.resolve(__dirname, "../../output");
const INPUT_DIR = path.resolve(__dirname, "../../input");

const ALL_BACKGROUNDS: BackgroundMode[] = [
  "temple_run",
  "endless_runner",
  "futuristic",
  "finance",
  "productivity",
  "high_energy",
];

// Visual treatment for each background mode
const BACKGROUND_EFFECTS: Record<
  BackgroundMode,
  {
    colorOverlay: string;
    saturation: number;
    brightness: number;
    contrast: number;
    vignette: boolean;
  }
> = {
  temple_run: {
    colorOverlay: "color=0xFFD700@0.2", // Gold overlay
    saturation: 1.3,
    brightness: 0.05,
    contrast: 1.2,
    vignette: true,
  },
  endless_runner: {
    colorOverlay: "color=0x00FF00@0.15", // Lime green
    saturation: 1.4,
    brightness: 0.1,
    contrast: 1.3,
    vignette: false,
  },
  futuristic: {
    colorOverlay: "color=0x00FFFF@0.2", // Cyan
    saturation: 0.8,
    brightness: 0.15,
    contrast: 1.4,
    vignette: true,
  },
  finance: {
    colorOverlay: "color=0x4CAF50@0.15", // Green (money)
    saturation: 1.1,
    brightness: 0.0,
    contrast: 1.1,
    vignette: true,
  },
  productivity: {
    colorOverlay: "color=0xFF9800@0.15", // Orange
    saturation: 1.2,
    brightness: 0.08,
    contrast: 1.2,
    vignette: false,
  },
  high_energy: {
    colorOverlay: "color=0xFF00FF@0.25", // Magenta
    saturation: 1.5,
    brightness: 0.12,
    contrast: 1.4,
    vignette: false,
  },
};

interface ProcessOptions {
  inputVideo: string;
  backgrounds: BackgroundMode[];
  addCaptions: boolean;
  captionStyle: "minimal" | "engaging";
}

async function applyBackgroundEffects(options: ProcessOptions) {
  const { inputVideo, backgrounds, addCaptions, captionStyle } = options;

  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Input video not found: ${inputVideo}`);
  }

  const videoName = path.basename(inputVideo, path.extname(inputVideo));
  const timestamp = Date.now();
  const workDir = path.join(OUTPUT_DIR, `${videoName}-styled-${timestamp}`);

  fs.mkdirSync(workDir, { recursive: true });

  console.log("\n  ═══════════════════════════════════════════════════════");
  console.log(`  Applying Background Themes: ${videoName}`);
  console.log("  ═══════════════════════════════════════════════════════\n");

  // ─── Step 1: Extract Audio for Captions (if needed) ──────────────
  let captions: Array<{ text: string; start: number; end: number }> = [];

  if (addCaptions) {
    console.log("  [1/3] Extracting audio & transcribing for captions…");
    const audioPath = path.join(workDir, "audio.mp3");
    await execAsync(
      `"${ffmpegPath}" -i "${inputVideo}" -vn -acodec libmp3lame -q:a 2 "${audioPath}" -y`
    );

    try {
      const whisperSegments = await transcribeWithWhisper(audioPath, workDir);
      const allWords: Array<{ word: string; start: number; end: number }> = [];
      whisperSegments.forEach((seg) => {
        seg.words.forEach((w) => allWords.push(w));
      });

      console.log(`  ✓ Transcribed: ${allWords.length} words`);

      // Generate captions (3-4 words per caption for engaging style)
      const wordsPerCaption = captionStyle === "engaging" ? 3 : 6;
      for (let i = 0; i < allWords.length; i += wordsPerCaption) {
        const chunk = allWords.slice(i, i + wordsPerCaption);
        if (chunk.length > 0) {
          captions.push({
            text: chunk.map((w) => w.word).join(" "),
            start: chunk[0].start,
            end: chunk[chunk.length - 1].end,
          });
        }
      }

      // Save captions to SRT file for ffmpeg
      const srtPath = path.join(workDir, "captions.srt");
      const srtContent = captions
        .map((cap, idx) => {
          const startTime = formatSRTTime(cap.start);
          const endTime = formatSRTTime(cap.end);
          return `${idx + 1}\n${startTime} --> ${endTime}\n${cap.text}\n`;
        })
        .join("\n");
      fs.writeFileSync(srtPath, srtContent, "utf-8");

      console.log(`  ✓ Generated ${captions.length} caption segments\n`);
    } catch (err: any) {
      console.log(`  ⚠ Transcription failed (${err.message}), skipping captions\n`);
    }
  } else {
    console.log("  [1/3] Skipping captions\n");
  }

  // ─── Step 2: Get Video Info ──────────────────────────────────────
  console.log("  [2/3] Analyzing video…");
  const videoInfo = await getVideoInfo(inputVideo);
  console.log(`  ✓ ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}s\n`);

  // ─── Step 3: Apply Each Background Theme ──────────────────────────
  console.log(`  [3/3] Applying ${ backgrounds.length} background themes…\n`);

  const outputVideos: Array<{ background: string; path: string; size: number }> = [];

  for (const bgMode of backgrounds) {
    console.log(`  → '${bgMode}' theme…`);

    const effect = BACKGROUND_EFFECTS[bgMode];
    const outputPath = path.join(workDir, `${videoName}_${bgMode}.mp4`);

    try {
      // Build ffmpeg filter complex
      let filterChain = [];

      // Color adjustments
      filterChain.push(`eq=saturation=${effect.saturation}:brightness=${effect.brightness}:contrast=${effect.contrast}`);

      // Vignette
      if (effect.vignette) {
        filterChain.push("vignette=angle=PI/4");
      }

      // Color overlay
      filterChain.push(`${effect.colorOverlay}:size=${videoInfo.width}x${videoInfo.height}[overlay]`);
      filterChain.push("[0:v][overlay]blend=all_mode=overlay:all_opacity=1");

      // Add captions if available
      let captionFilter = "";
      if (addCaptions && captions.length > 0) {
        const srtPath = path.join(workDir, "captions.srt").replace(/\\/g, "/");
        captionFilter = `,subtitles='${srtPath}':force_style='FontName=Arial Bold,FontSize=28,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=3,Shadow=2,Alignment=2,MarginV=50'`;
      }

      const filterComplex = filterChain.join(",") + captionFilter;

      // Execute ffmpeg
      const cmd = `"${ffmpegPath}" -i "${inputVideo}" -filter_complex "${filterComplex}" -c:v libx264 -preset medium -crf 23 -c:a copy "${outputPath}" -y`;

      await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

      const stats = fs.statSync(outputPath);
      outputVideos.push({
        background: bgMode,
        path: outputPath,
        size: stats.size,
      });

      console.log(`    ✓ ${bgMode}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (err: any) {
      console.error(`    ✗ ${bgMode} failed: ${err.message}`);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("\n  ═══════════════════════════════════════════════════════");
  console.log("  PROCESSING COMPLETE");
  console.log("  ═══════════════════════════════════════════════════════");
  console.log(`  Original: ${inputVideo}`);
  console.log(`  Captions: ${addCaptions ? "Yes" : "No"}`);
  console.log(`  Output:   ${workDir}`);
  console.log(`  Variants: ${outputVideos.length}/${backgrounds.length}\n`);

  outputVideos.forEach((v) => {
    console.log(`    • ${v.background.padEnd(15)} → ${path.basename(v.path)}`);
  });

  console.log("  ═══════════════════════════════════════════════════════\n");

  return { workDir, outputVideos };
}

/**
 * Get video metadata (width, height, duration) using ffprobe
 */
async function getVideoInfo(videoPath: string): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  try {
    const { stdout } = await execAsync(
      `"${ffprobePath}" -v quiet -print_format json -show_streams -show_format "${videoPath}"`
    );
    
    const data = JSON.parse(stdout);
    const videoStream = data.streams.find((s: any) => s.codec_type === "video");
    
    if (!videoStream) {
      throw new Error("No video stream found");
    }

    const width = parseInt(videoStream.width) || 1080;
    const height = parseInt(videoStream.height) || 1920;
    const duration = parseFloat(data.format.duration) || 30;

    return { width, height, duration };
  } catch (err: any) {
    console.error("⚠️  Failed to get video info:", err.message);
    return { width: 1080, height: 1920, duration: 30 };
  }
}

/**
 * Format seconds to SRT timestamp (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

// ══════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ══════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log(`
  Apply Background Themes to Existing Videos
  ═══════════════════════════════════════════════════════════

  Usage:
    npx ts-node src/cli/apply-backgrounds.ts <video.mp4> [options]
    npx ts-node src/cli/apply-backgrounds.ts input/Subway.mp4
    npx ts-node src/cli/apply-backgrounds.ts --all

  Options:
    --all               Process all MP4 files in input/ folder
    --captions          Add animated captions (requires speech in video)
    --minimal-captions  Use minimal caption style (slower pace)
    --themes=X,Y        Only apply specific themes (comma-separated)
                        Available: temple_run, endless_runner, futuristic,
                                   finance, productivity, high_energy

  Examples:
    Process with Temple Run and Futuristic themes:
      npx ts-node src/cli/apply-backgrounds.ts input/Subway.mp4 --themes=temple_run,futuristic

    Process all videos with engaging captions:
      npx ts-node src/cli/apply-backgrounds.ts --all --captions
    `);
    process.exit(0);
  }

  // Parse options
  const addCaptions = args.includes("--captions");
  const captionStyle = args.includes("--minimal-captions") ? "minimal" : "engaging";

  let backgrounds = ALL_BACKGROUNDS;
  const themesArg = args.find((a) => a.startsWith("--themes="));
  if (themesArg) {
    const requested = themesArg
      .split("=")[1]
      .split(",")
      .map((t) => t.trim()) as BackgroundMode[];
    backgrounds = requested.filter((bg) => ALL_BACKGROUNDS.includes(bg));
    
    if (backgrounds.length === 0) {
      console.error(`\n  Error: No valid themes found. Available: ${ALL_BACKGROUNDS.join(", ")}\n`);
      process.exit(1);
    }
  }

  // Process all or single video
  if (args.includes("--all")) {
    const inputFiles = fs
      .readdirSync(INPUT_DIR)
      .filter((f) => f.endsWith(".mp4"))
      .map((f) => path.join(INPUT_DIR, f));

    if (inputFiles.length === 0) {
      console.error("\n  No MP4 files found in input/ folder\n");
      process.exit(1);
    }

    console.log(`\n  Found ${inputFiles.length} videos to process\n`);

    for (const videoPath of inputFiles) {
      await applyBackgroundEffects({
        inputVideo: videoPath,
        backgrounds,
        addCaptions,
        captionStyle,
      });
    }
  } else {
    const videoPath = args.find((a) => !a.startsWith("--"));
    if (!videoPath) {
      console.error("\n  Error: No input video specified\n");
      process.exit(1);
    }

    await applyBackgroundEffects({
      inputVideo: videoPath,
      backgrounds,
      addCaptions,
      captionStyle,
    });
  }
}

main().catch((err) => {
  console.error("\n  ✗ Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
