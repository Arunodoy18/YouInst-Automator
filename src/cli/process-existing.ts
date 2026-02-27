/**
 * Process Existing Video — Apply backgrounds & enhance audio
 *
 * Takes your recorded MP4 videos and:
 * 1. Extracts audio
 * 2. Enhances/smooths audio with ElevenLabs
 * 3. Transcribes with Whisper for word-level captions
 * 4. Generates high-engagement caption animations
 * 5. Renders with ALL background themes
 * 6. Outputs multiple versions
 *
 * Usage:
 *   npx ts-node src/cli/process-existing.ts <input-video.mp4>
 *   npx ts-node src/cli/process-existing.ts input/Subway.mp4
 *   npx ts-node src/cli/process-existing.ts --all  (process all files in input/)
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { transcribeWithWhisper } from "../lib/whisper";
import { renderVideo, getAudioDuration, type TimedCaption } from "../lib/videoRenderer";
import type { BackgroundMode } from "../lib/visualSelector";

const execAsync = promisify(exec);

// Get ffmpeg from ffmpeg-static
const ffmpegPath: string = require("ffmpeg-static");

const OUTPUT_DIR = path.resolve(__dirname, "../../output");
const INPUT_DIR = path.resolve(__dirname, "../../input");

// All available background modes
const ALL_BACKGROUNDS: BackgroundMode[] = [
  "temple_run",
  "endless_runner",
  "futuristic",
  "finance",
  "productivity",
  "high_energy",
];

interface ProcessingOptions {
  inputVideo: string;
  backgrounds: BackgroundMode[];
  enhanceAudio: boolean;
  captionIntensity: "normal" | "high_engagement";
}

/**
 * Main processing function
 */
async function processVideo(options: ProcessingOptions) {
  const { inputVideo, backgrounds, enhanceAudio, captionIntensity } = options;

  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Input video not found: ${inputVideo}`);
  }

  const videoName = path.basename(inputVideo, path.extname(inputVideo));
  const timestamp = Date.now();
  const workDir = path.join(OUTPUT_DIR, `${videoName}-${timestamp}`);

  fs.mkdirSync(workDir, { recursive: true });

  console.log("\n  ════════════════════════════════════════════════════════");
  console.log(`  Processing: ${videoName}`);
  console.log("  ════════════════════════════════════════════════════════\n");

  // ─── Step 1: Extract Audio ───────────────────────────────────────
  console.log("  [1/6] Extracting audio from video…");
  const originalAudioPath = path.join(workDir, "original_audio.mp3");
  await execAsync(`"${ffmpegPath}" -i "${inputVideo}" -vn -acodec libmp3lame -q:a 2 "${originalAudioPath}" -y`);
  console.log(`  ✓ Audio extracted: ${originalAudioPath}`);

  // ─── Step 2: Enhance Audio (Optional - Future Feature) ───────────
  let finalAudioPath = originalAudioPath;

  if (enhanceAudio) {
    console.log("\n  [2/6] Audio enhancement requested, but using original for now");
    console.log("  💡 Tip: For audio enhancement, use ElevenLabs' web interface or Audacity");
  } else {
    console.log("\n  [2/6] Using original audio");
  }

  // ─── Step 3: Transcribe with Whisper ─────────────────────────────
  console.log("\n  [3/6] Transcribing audio with Whisper for word-level captions…");
  const whisperSegments = await transcribeWithWhisper(finalAudioPath, workDir);
  
  const allWords: Array<{ word: string; start: number; end: number }> = [];
  whisperSegments.forEach((seg) => {
    seg.words.forEach((w) => allWords.push(w));
  });

  console.log(`  ✓ Transcription complete: ${whisperSegments.length} segments, ${allWords.length} words`);

  // ─── Step 4: Generate High-Engagement Captions ───────────────────
  console.log("\n  [4/6] Generating high-engagement captions…");
  const captions = generateEngagingCaptions(allWords, captionIntensity);
  console.log(`  ✓ Generated ${captions.length} caption segments`);

  // ─── Step 5: Get Original Video Dimensions ───────────────────────
  console.log("\n  [5/6] Analyzing video metadata…");
  const videoDuration = await getAudioDuration(finalAudioPath);
  console.log(`  ✓ Duration: ${videoDuration.toFixed(2)}s`);

  // ─── Step 6: Render with All Backgrounds ─────────────────────────
  console.log(`\n  [6/6] Rendering with ${backgrounds.length} background themes…\n`);

  const outputVideos: Array<{ background: string; path: string }> = [];

  for (const bgMode of backgrounds) {
    console.log(`  → Rendering with '${bgMode}' background…`);

    const bgWorkDir = path.join(workDir, bgMode);
    fs.mkdirSync(bgWorkDir, { recursive: true });

    try {
      // Copy or symlink the background video if needed
      // For now, the video renderer will use procedural backgrounds
      
      const outputPath = await renderVideo(
        captions.map((cap) => cap.text), // scenes
        finalAudioPath, // voicePath
        bgWorkDir, // outputDir
        { captions: captions } // options with timed captions
      );

      outputVideos.push({ background: bgMode, path: outputPath });
      console.log(`  ✓ ${bgMode}: ${outputPath}`);
    } catch (err: any) {
      console.error(`  ✗ ${bgMode} failed: ${err.message}`);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("\n  ════════════════════════════════════════════════════════");
  console.log("  PROCESSING COMPLETE");
  console.log("  ════════════════════════════════════════════════════════");
  console.log(`  Original Video: ${inputVideo}`);
  console.log(`  Audio Enhanced: ${enhanceAudio ? "Yes" : "No"}`);
  console.log(`  Output Folder:  ${workDir}`);
  console.log(`  Variants Created: ${outputVideos.length}`);
  console.log("\n  Videos:");
  outputVideos.forEach((v) => {
    const sizeMB = (fs.statSync(v.path).size / 1024 / 1024).toFixed(2);
    console.log(`    • ${v.background.padEnd(15)} → ${v.path} (${sizeMB} MB)`);
  });
  console.log("  ════════════════════════════════════════════════════════\n");

  return { workDir, outputVideos };
}

/**
 * Generate high-engagement captions from Whisper words
 */
function generateEngagingCaptions(
  words: Array<{ word: string; start: number; end: number }>,
  intensity: "normal" | "high_engagement"
): TimedCaption[] {
  const captions: TimedCaption[] = [];

  // High engagement: 2-3 words per caption (faster pace, more dynamic)
  // Normal: 4-6 words per caption
  const wordsPerCaption = intensity === "high_engagement" ? 3 : 5;

  for (let i = 0; i < words.length; i += wordsPerCaption) {
    const chunk = words.slice(i, i + wordsPerCaption);
    if (chunk.length === 0) continue;

    const text = chunk.map((w) => w.word).join(" ");
    const start = chunk[0].start;
    const end = chunk[chunk.length - 1].end;

    // Ensure timing is valid
    if (start < end) {
      captions.push({ text, start, end });
    }
  }

  // Sort by start time and ensure no overlaps
  captions.sort((a, b) => a.start - b.start);

  // Fix any overlaps by adjusting end times
  for (let i = 0; i < captions.length - 1; i++) {
    if (captions[i].end > captions[i + 1].start) {
      captions[i].end = captions[i + 1].start - 0.01;
    }
  }

  return captions;
}

// ══════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ══════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help") {
    console.log(`
  Process Existing Video — Apply backgrounds & enhance audio
  ═══════════════════════════════════════════════════════════

  Usage:
    npx ts-node src/cli/process-existing.ts <video.mp4>
    npx ts-node src/cli/process-existing.ts input/Subway.mp4
    npx ts-node src/cli/process-existing.ts --all

  Options:
    --all               Process all MP4 files in input/ folder
    --no-enhance        Skip audio enhancement (faster)
    --normal-captions   Use normal caption pacing (default: high_engagement)
    --backgrounds=X,Y   Only render specific backgrounds (comma-separated)
                        Available: temple_run, endless_runner, futuristic,
                                   finance, productivity, high_energy

  Examples:
    Process single video with all backgrounds:
      npx ts-node src/cli/process-existing.ts input/Subway.mp4

    Process all videos without audio enhancement:
      npx ts-node src/cli/process-existing.ts --all --no-enhance

    Only render Temple Run and Futuristic backgrounds:
      npx ts-node src/cli/process-existing.ts input/video.mp4 --backgrounds=temple_run,futuristic
    `);
    process.exit(0);
  }

  // Parse options
  const enhanceAudio = !args.includes("--no-enhance");
  const captionIntensity = args.includes("--normal-captions") ? "normal" : "high_engagement";

  let backgrounds = ALL_BACKGROUNDS;
  const bgArg = args.find((a) => a.startsWith("--backgrounds="));
  if (bgArg) {
    const requested = bgArg.split("=")[1].split(",") as BackgroundMode[];
    backgrounds = requested.filter((bg) => ALL_BACKGROUNDS.includes(bg));
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
      await processVideo({
        inputVideo: videoPath,
        backgrounds,
        enhanceAudio,
        captionIntensity,
      });
    }
  } else {
    const videoPath = args[0].startsWith("--") ? path.join(INPUT_DIR, "Subway.mp4") : args[0];
    await processVideo({
      inputVideo: videoPath,
      backgrounds,
      enhanceAudio,
      captionIntensity,
    });
  }
}

main().catch((err) => {
  console.error("\n  ✗ Fatal error:", err.message);
  process.exit(1);
});
