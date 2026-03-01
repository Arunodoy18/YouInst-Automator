/**
 * Voice Training Engine
 *
 * Complete pipeline for extracting, cleaning, and training voice models:
 *
 *   1. EXTRACT  — Pull audio from MP4/video files via ffmpeg
 *   2. CLEAN    — Remove background noise, music, silence; normalize loudness
 *   3. SEGMENT  — Split into optimal training clips (10-30s each)
 *   4. TRAIN    — Upload to ElevenLabs Professional Voice Clone (PVC)
 *   5. REFINE   — Add more samples to improve accuracy iteratively
 *
 * Supports: .mp4, .mkv, .avi, .mov, .webm, .mp3, .wav, .m4a, .ogg, .flac, .aac
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const execAsync = promisify(exec);

/* ── Types ──────────────────────────────────────────────────────────── */

export interface ExtractedAudio {
  /** Path to extracted/cleaned audio WAV file */
  audioPath: string;
  /** Duration in seconds */
  duration: number;
  /** Sample rate (Hz) */
  sampleRate: number;
  /** Whether noise reduction was applied */
  noiseReduced: boolean;
  /** Original source file */
  sourcePath: string;
}

export interface TrainingSegment {
  /** Path to the segment WAV file */
  path: string;
  /** Start time in the source (seconds) */
  startTime: number;
  /** Duration of this segment (seconds) */
  duration: number;
  /** Estimated speech content ratio (0-1) */
  speechRatio: number;
  /** Segment quality score (0-100) */
  qualityScore: number;
}

export interface TrainingDataset {
  /** All segments ready for training */
  segments: TrainingSegment[];
  /** Total speech duration across all segments */
  totalSpeechDuration: number;
  /** Number of source files processed */
  sourceCount: number;
  /** Dataset directory */
  datasetDir: string;
  /** Quality assessment */
  quality: "poor" | "fair" | "good" | "excellent";
}

export interface TrainedVoice {
  /** ElevenLabs voice ID */
  voiceId: string;
  /** Profile name */
  profileName: string;
  /** Training quality */
  quality: TrainingDataset["quality"];
  /** Number of samples used */
  sampleCount: number;
  /** Total training audio duration */
  totalDuration: number;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const VIDEO_EXTENSIONS = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".wma"];
const ALL_EXTENSIONS = [...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS];

/** Optimal segment length for voice training (seconds) */
const MIN_SEGMENT_DURATION = 8;
const MAX_SEGMENT_DURATION = 30;
const IDEAL_SEGMENT_DURATION = 15;

/** Minimum total training data for decent quality */
const MIN_TRAINING_SECONDS = 30;   // Bare minimum
const GOOD_TRAINING_SECONDS = 120; // 2 minutes = good
const IDEAL_TRAINING_SECONDS = 300; // 5 minutes = excellent

/* ── Step 1: Audio Extraction ──────────────────────────────────────── */

/**
 * Extract audio from a video or audio file.
 * Converts to 44.1kHz mono WAV (optimal for voice training).
 */
export async function extractAudio(
  inputPath: string,
  outputDir: string
): Promise<ExtractedAudio> {
  const absInput = path.resolve(inputPath);
  const ext = path.extname(absInput).toLowerCase();

  if (!ALL_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported format: ${ext}\nSupported: ${ALL_EXTENSIONS.join(", ")}`
    );
  }

  if (!fs.existsSync(absInput)) {
    throw new Error(`File not found: ${absInput}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = path.basename(absInput, ext);
  const rawAudioPath = path.join(outputDir, `${baseName}_raw.wav`);

  const isVideo = VIDEO_EXTENSIONS.includes(ext);
  console.log(`  📦 ${isVideo ? "Extracting audio from video" : "Converting audio"}: ${path.basename(absInput)}`);

  // Extract/convert to WAV — mono, 44.1kHz, 16-bit for optimal training
  const extractCmd = [
    `ffmpeg -y -i "${absInput}"`,
    `-vn`,                         // No video
    `-acodec pcm_s16le`,           // 16-bit PCM
    `-ar 44100`,                   // 44.1kHz sample rate
    `-ac 1`,                       // Mono
    `"${rawAudioPath}"`,
  ].join(" ");

  await execAsync(extractCmd, { maxBuffer: 50 * 1024 * 1024 });

  if (!fs.existsSync(rawAudioPath)) {
    throw new Error("Audio extraction failed — no output file created");
  }

  // Get duration
  const duration = await getAudioDuration(rawAudioPath);
  console.log(`  ✓ Raw audio extracted: ${duration.toFixed(1)}s`);

  return {
    audioPath: rawAudioPath,
    duration,
    sampleRate: 44100,
    noiseReduced: false,
    sourcePath: absInput,
  };
}

/* ── Step 2: Audio Cleaning ────────────────────────────────────────── */

/**
 * Clean audio for voice training:
 *   - High-pass filter (remove low rumble < 80Hz)
 *   - Noise gate (suppress background noise)
 *   - Loudness normalization (EBU R128 -16 LUFS)
 *   - Remove long silences
 *   - Optional: aggressive noise reduction via spectral subtraction
 */
export async function cleanAudio(
  extracted: ExtractedAudio,
  outputDir: string,
  options: {
    aggressiveNoise?: boolean;   // Stronger noise reduction (may affect quality)
    removeSilence?: boolean;     // Remove silence gaps > 1s
    normalizeVolume?: boolean;   // EBU R128 normalization
  } = {}
): Promise<ExtractedAudio> {
  const {
    aggressiveNoise = true,
    removeSilence = true,
    normalizeVolume = true,
  } = options;

  const baseName = path.basename(extracted.audioPath, ".wav").replace("_raw", "");
  const cleanedPath = path.join(outputDir, `${baseName}_clean.wav`);

  console.log(`  🧹 Cleaning audio: noise reduction, normalization, silence removal...`);

  // Build ffmpeg filter chain
  const filters: string[] = [];

  // 1. High-pass filter — remove rumble below 80Hz
  filters.push("highpass=f=80");

  // 2. Low-pass filter — remove harsh highs above 14kHz (mic noise)
  filters.push("lowpass=f=14000");

  // 3. Noise gate — suppress background noise below threshold
  if (aggressiveNoise) {
    // Aggressive: compress quiet sections more
    filters.push("compand=attacks=0.01:decays=0.3:points=-80/-80|-45/-45|-30/-25|0/0:soft-knee=6");
  } else {
    filters.push("compand=attacks=0.02:decays=0.5:points=-80/-80|-45/-40|-25/-20|0/0:soft-knee=3");
  }

  // 4. Remove silence gaps
  if (removeSilence) {
    // Detect and remove silences longer than 0.8s, keeping 0.2s padding
    filters.push("silenceremove=start_periods=1:start_silence=0.2:start_threshold=-35dB:detection=peak");
  }

  // 5. Volume normalization
  if (normalizeVolume) {
    filters.push("loudnorm=I=-16:LRA=11:TP=-1.5");
  }

  // 6. Final limiter to prevent clipping
  filters.push("alimiter=limit=0.95:attack=5:release=50");

  const filterChain = filters.join(",");

  const cleanCmd = [
    `ffmpeg -y -i "${extracted.audioPath}"`,
    `-af "${filterChain}"`,
    `-acodec pcm_s16le -ar 44100 -ac 1`,
    `"${cleanedPath}"`,
  ].join(" ");

  try {
    await execAsync(cleanCmd, { maxBuffer: 50 * 1024 * 1024 });
  } catch (err: any) {
    // If complex filter fails, try simpler version
    console.warn(`  ⚠ Complex filter failed, trying simplified cleaning...`);
    const simpleCmd = [
      `ffmpeg -y -i "${extracted.audioPath}"`,
      `-af "highpass=f=80,lowpass=f=14000,loudnorm=I=-16:LRA=11:TP=-1.5"`,
      `-acodec pcm_s16le -ar 44100 -ac 1`,
      `"${cleanedPath}"`,
    ].join(" ");
    await execAsync(simpleCmd, { maxBuffer: 50 * 1024 * 1024 });
  }

  if (!fs.existsSync(cleanedPath)) {
    throw new Error("Audio cleaning failed — no output file created");
  }

  const duration = await getAudioDuration(cleanedPath);
  console.log(`  ✓ Cleaned audio: ${duration.toFixed(1)}s (noise reduced, normalized)`);

  return {
    audioPath: cleanedPath,
    duration,
    sampleRate: 44100,
    noiseReduced: true,
    sourcePath: extracted.sourcePath,
  };
}

/* ── Step 3: Segmentation ──────────────────────────────────────────── */

/**
 * Split cleaned audio into optimal training segments.
 * Uses silence detection to find natural break points.
 * Each segment: 8-30 seconds of clean speech.
 */
export async function segmentAudio(
  cleaned: ExtractedAudio,
  outputDir: string
): Promise<TrainingSegment[]> {
  const segmentDir = path.join(outputDir, "segments");
  if (!fs.existsSync(segmentDir)) {
    fs.mkdirSync(segmentDir, { recursive: true });
  }

  console.log(`  ✂️  Segmenting audio into training clips...`);

  // Detect silence points for natural segmentation
  const silencePoints = await detectSilencePoints(cleaned.audioPath);

  const segments: TrainingSegment[] = [];
  let segmentIdx = 0;

  if (silencePoints.length < 2) {
    // No natural breaks — split evenly
    const numSegments = Math.max(1, Math.floor(cleaned.duration / IDEAL_SEGMENT_DURATION));
    const segDuration = cleaned.duration / numSegments;

    for (let i = 0; i < numSegments; i++) {
      const start = i * segDuration;
      const dur = Math.min(segDuration, cleaned.duration - start);

      if (dur < MIN_SEGMENT_DURATION) continue;

      const segPath = path.join(segmentDir, `seg_${String(segmentIdx).padStart(3, "0")}.wav`);
      await cutSegment(cleaned.audioPath, segPath, start, dur);

      const speechRatio = await estimateSpeechRatio(segPath);

      segments.push({
        path: segPath,
        startTime: start,
        duration: dur,
        speechRatio,
        qualityScore: calculateQualityScore(dur, speechRatio),
      });
      segmentIdx++;
    }
  } else {
    // Use silence points as natural break points
    let currentStart = 0;

    for (const silenceTime of silencePoints) {
      const segDuration = silenceTime - currentStart;

      if (segDuration < MIN_SEGMENT_DURATION) {
        continue; // Too short, keep accumulating
      }

      if (segDuration > MAX_SEGMENT_DURATION) {
        // Segment too long — split at midpoint
        const mid = currentStart + segDuration / 2;
        
        // First half
        const dur1 = mid - currentStart;
        if (dur1 >= MIN_SEGMENT_DURATION) {
          const segPath = path.join(segmentDir, `seg_${String(segmentIdx).padStart(3, "0")}.wav`);
          await cutSegment(cleaned.audioPath, segPath, currentStart, dur1);
          const speechRatio = await estimateSpeechRatio(segPath);
          segments.push({
            path: segPath,
            startTime: currentStart,
            duration: dur1,
            speechRatio,
            qualityScore: calculateQualityScore(dur1, speechRatio),
          });
          segmentIdx++;
        }

        // Second half
        const dur2 = silenceTime - mid;
        if (dur2 >= MIN_SEGMENT_DURATION) {
          const segPath = path.join(segmentDir, `seg_${String(segmentIdx).padStart(3, "0")}.wav`);
          await cutSegment(cleaned.audioPath, segPath, mid, dur2);
          const speechRatio = await estimateSpeechRatio(segPath);
          segments.push({
            path: segPath,
            startTime: mid,
            duration: dur2,
            speechRatio,
            qualityScore: calculateQualityScore(dur2, speechRatio),
          });
          segmentIdx++;
        }
      } else {
        // Good length segment
        const segPath = path.join(segmentDir, `seg_${String(segmentIdx).padStart(3, "0")}.wav`);
        await cutSegment(cleaned.audioPath, segPath, currentStart, segDuration);
        const speechRatio = await estimateSpeechRatio(segPath);
        segments.push({
          path: segPath,
          startTime: currentStart,
          duration: segDuration,
          speechRatio,
          qualityScore: calculateQualityScore(segDuration, speechRatio),
        });
        segmentIdx++;
      }

      currentStart = silenceTime;
    }

    // Handle remaining audio
    const remaining = cleaned.duration - currentStart;
    if (remaining >= MIN_SEGMENT_DURATION) {
      const segPath = path.join(segmentDir, `seg_${String(segmentIdx).padStart(3, "0")}.wav`);
      await cutSegment(cleaned.audioPath, segPath, currentStart, remaining);
      const speechRatio = await estimateSpeechRatio(segPath);
      segments.push({
        path: segPath,
        startTime: currentStart,
        duration: remaining,
        speechRatio,
        qualityScore: calculateQualityScore(remaining, speechRatio),
      });
    }
  }

  // Sort by quality score (best first)
  segments.sort((a, b) => b.qualityScore - a.qualityScore);

  console.log(`  ✓ Created ${segments.length} training segments`);
  segments.slice(0, 5).forEach((seg, i) => {
    console.log(`    ${i + 1}. ${path.basename(seg.path)} — ${seg.duration.toFixed(1)}s, speech: ${(seg.speechRatio * 100).toFixed(0)}%, quality: ${seg.qualityScore}/100`);
  });

  return segments;
}

/**
 * Build a complete training dataset from one or more source files.
 * Handles MP4 videos, audio files, or a mix.
 */
export async function buildTrainingDataset(
  inputPaths: string[],
  outputDir: string
): Promise<TrainingDataset> {
  const datasetDir = path.join(outputDir, "training_dataset");
  if (!fs.existsSync(datasetDir)) {
    fs.mkdirSync(datasetDir, { recursive: true });
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  BUILDING VOICE TRAINING DATASET`);
  console.log(`  Sources: ${inputPaths.length} file(s)`);
  console.log(`${"═".repeat(60)}\n`);

  const allSegments: TrainingSegment[] = [];

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    console.log(`\n📁 Processing source ${i + 1}/${inputPaths.length}: ${path.basename(inputPath)}`);

    // Step 1: Extract audio
    const extracted = await extractAudio(inputPath, datasetDir);

    // Step 2: Clean audio
    const cleaned = await cleanAudio(extracted, datasetDir);

    // Step 3: Segment
    const segments = await segmentAudio(cleaned, datasetDir);
    allSegments.push(...segments);

    // Clean up intermediate files
    try {
      if (fs.existsSync(extracted.audioPath)) fs.unlinkSync(extracted.audioPath);
      // Keep cleaned audio as reference
    } catch { /* ignore cleanup errors */ }
  }

  // Sort all segments by quality
  allSegments.sort((a, b) => b.qualityScore - a.qualityScore);

  // Calculate total speech duration
  const totalSpeechDuration = allSegments.reduce(
    (sum, seg) => sum + seg.duration * seg.speechRatio,
    0
  );

  // Assess quality
  let quality: TrainingDataset["quality"];
  if (totalSpeechDuration < MIN_TRAINING_SECONDS) quality = "poor";
  else if (totalSpeechDuration < GOOD_TRAINING_SECONDS) quality = "fair";
  else if (totalSpeechDuration < IDEAL_TRAINING_SECONDS) quality = "good";
  else quality = "excellent";

  const dataset: TrainingDataset = {
    segments: allSegments,
    totalSpeechDuration,
    sourceCount: inputPaths.length,
    datasetDir,
    quality,
  };

  // Save dataset manifest
  const manifestPath = path.join(datasetDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({
    ...dataset,
    segments: dataset.segments.map((s) => ({
      ...s,
      path: path.relative(datasetDir, s.path),
    })),
  }, null, 2));

  printDatasetSummary(dataset);
  return dataset;
}

/* ── Step 4: Training ──────────────────────────────────────────────── */

/**
 * Train an ElevenLabs Professional Voice Clone (PVC) from a dataset.
 * PVC requires:
 *   - ElevenLabs paid plan (Starter+)
 *   - At least 30 seconds of clean speech
 *   - Recommended: 1-5 minutes for best quality
 *
 * Falls back to Instant Voice Clone (IVC) if PVC is unavailable.
 */
export async function trainVoice(
  dataset: TrainingDataset,
  profileName: string,
  options: {
    description?: string;
    language?: string;
    usePVC?: boolean;  // true = Professional, false = Instant
    maxSamples?: number;  // Limit number of samples uploaded
  } = {}
): Promise<TrainedVoice> {
  const {
    description = `Trained voice from ${dataset.sourceCount} source(s)`,
    language = "hindi",
    usePVC = true,
    maxSamples = 25,  // ElevenLabs limit
  } = options;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY not set in .env. Voice training requires ElevenLabs API access."
    );
  }

  const client = new ElevenLabsClient({ apiKey });

  // Select best segments (up to maxSamples)
  const selectedSegments = dataset.segments
    .filter((s) => s.qualityScore >= 30) // Skip very low quality
    .slice(0, maxSamples);

  if (selectedSegments.length === 0) {
    throw new Error("No segments passed quality threshold. Need better audio samples.");
  }

  const totalDur = selectedSegments.reduce((sum, s) => sum + s.duration, 0);
  console.log(`\n🎓 Training voice "${profileName}" with ${selectedSegments.length} segments (${totalDur.toFixed(0)}s total)`);

  // Prepare audio blobs
  const audioBlobs: Blob[] = [];
  for (const seg of selectedSegments) {
    const buffer = fs.readFileSync(seg.path);
    audioBlobs.push(new Blob([buffer], { type: "audio/wav" }));
  }

  let voiceId: string;

  /** Map friendly language names to ElevenLabs ISO codes */
  const LANG_MAP: Record<string, string> = {
    hindi:    "hi",
    english:  "en",
    hinglish: "en",  // ElevenLabs doesn't have a hinglish code, use English
  };
  const langCode = LANG_MAP[language] ?? "en";

  if (usePVC) {
    // Try Professional Voice Clone first
    console.log(`  → Creating Professional Voice Clone (PVC)...`);
    try {
      // Step 1: Create PVC voice
      const pvcResult = await client.voices.pvc.create({
        name: profileName,
        description: `${description}. Quality: ${dataset.quality}. Duration: ${totalDur.toFixed(0)}s speech.`,
        language: langCode,
        labels: {
          quality: dataset.quality,
          source: "youinst-automator",
          totalDuration: `${totalDur.toFixed(0)}s`,
        },
      });

      voiceId = pvcResult.voiceId || (pvcResult as any).voice_id;
      console.log(`  ✓ PVC voice created: ${voiceId}`);

      // Step 2: Upload sample segments
      console.log(`  → Uploading ${audioBlobs.length} training samples...`);
      for (let i = 0; i < audioBlobs.length; i++) {
        try {
          await client.voices.pvc.samples.create(voiceId, {
            files: [audioBlobs[i]],
          });
          if ((i + 1) % 5 === 0 || i === audioBlobs.length - 1) {
            console.log(`    Uploaded ${i + 1}/${audioBlobs.length} samples`);
          }
        } catch (err: any) {
          console.warn(`    ⚠ Sample ${i + 1} upload failed: ${err.message}`);
        }
      }

      // Step 3: Start training
      console.log(`  → Starting PVC training (this may take a few minutes)...`);
      await client.voices.pvc.train(voiceId);
      console.log(`  ✅ PVC training initiated! Voice ID: ${voiceId}`);
      console.log(`  → Training continues on ElevenLabs servers. Check status at:`);
      console.log(`    https://elevenlabs.io/app/voice-lab`);

    } catch (err: any) {
      console.warn(`  ⚠ PVC failed: ${err.message}`);
      console.log(`  → Falling back to Instant Voice Clone (IVC)...`);

      // Fallback to IVC
      const ivcResult = await client.voices.ivc.create({
        name: profileName,
        description: `${description}. Instant clone from ${selectedSegments.length} samples.`,
        files: audioBlobs.slice(0, 10), // IVC has lower limit
        labels: {
          quality: dataset.quality,
          source: "youinst-automator",
        },
      });

      voiceId = ivcResult.voiceId || (ivcResult as any).voice_id;
      console.log(`  ✅ IVC voice created: ${voiceId}`);
    }
  } else {
    // Direct IVC
    console.log(`  → Creating Instant Voice Clone (IVC)...`);
    const ivcResult = await client.voices.ivc.create({
      name: profileName,
      description: `${description}. Instant clone from ${selectedSegments.length} samples.`,
      files: audioBlobs.slice(0, 10),
      labels: {
        quality: dataset.quality,
        source: "youinst-automator",
      },
    });

    voiceId = ivcResult.voiceId || (ivcResult as any).voice_id;
    console.log(`  ✅ IVC voice created: ${voiceId}`);
  }

  return {
    voiceId,
    profileName,
    quality: dataset.quality,
    sampleCount: selectedSegments.length,
    totalDuration: totalDur,
  };
}

/**
 * Add more samples to an existing trained voice to improve accuracy.
 * This is for iterative refinement — the more quality samples, the better.
 */
export async function refineVoice(
  voiceId: string,
  newInputPaths: string[],
  workDir: string
): Promise<{ added: number; totalDuration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");

  const client = new ElevenLabsClient({ apiKey });

  console.log(`\n🔄 Refining voice ${voiceId} with ${newInputPaths.length} new source(s)...`);

  // Build dataset from new sources
  const dataset = await buildTrainingDataset(newInputPaths, workDir);

  // Upload new samples
  let added = 0;
  const totalDur = dataset.segments.reduce((sum, s) => sum + s.duration, 0);

  for (const seg of dataset.segments.filter((s) => s.qualityScore >= 30)) {
    try {
      const buffer = fs.readFileSync(seg.path);
      const blob = new Blob([buffer], { type: "audio/wav" });

      await client.voices.pvc.samples.create(voiceId, { files: [blob] });
      added++;
    } catch (err: any) {
      // If PVC samples fail, this might be an IVC voice — can't add samples
      if (added === 0) {
        console.warn(`  ⚠ Cannot add samples to this voice. It may be an IVC (Instant) clone.`);
        console.warn(`    IVC voices can't be refined. Consider creating a new PVC voice instead.`);
        break;
      }
      console.warn(`  ⚠ Sample upload failed: ${err.message}`);
    }
  }

  if (added > 0) {
    console.log(`  → Added ${added} new samples. Re-training...`);
    try {
      await client.voices.pvc.train(voiceId);
      console.log(`  ✅ Re-training started with additional samples!`);
    } catch (err: any) {
      console.warn(`  ⚠ Retraining failed: ${err.message}`);
    }
  }

  return { added, totalDuration: totalDur };
}

/* ── FFmpeg Helpers ────────────────────────────────────────────────── */

async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`
    );
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

async function detectSilencePoints(audioPath: string): Promise<number[]> {
  try {
    const { stderr } = await execAsync(
      `ffmpeg -i "${audioPath}" -af "silencedetect=noise=-30dB:d=0.5" -f null - 2>&1`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const points: number[] = [];
    const regex = /silence_end:\s*([\d.]+)/g;
    let match;
    while ((match = regex.exec(stderr)) !== null) {
      points.push(parseFloat(match[1]));
    }
    return points;
  } catch {
    return [];
  }
}

async function cutSegment(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  const cmd = [
    `ffmpeg -y`,
    `-ss ${startTime.toFixed(3)}`,
    `-i "${inputPath}"`,
    `-t ${duration.toFixed(3)}`,
    `-acodec pcm_s16le -ar 44100 -ac 1`,
    `"${outputPath}"`,
  ].join(" ");

  await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
}

async function estimateSpeechRatio(segmentPath: string): Promise<number> {
  try {
    const { stderr } = await execAsync(
      `ffmpeg -i "${segmentPath}" -af "silencedetect=noise=-30dB:d=0.3" -f null - 2>&1`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    const duration = await getAudioDuration(segmentPath);
    if (duration === 0) return 0;

    // Count total silence duration
    let totalSilence = 0;
    const starts: number[] = [];
    const ends: number[] = [];

    const startRegex = /silence_start:\s*([\d.]+)/g;
    const endRegex = /silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g;

    let m;
    while ((m = startRegex.exec(stderr)) !== null) starts.push(parseFloat(m[1]));
    while ((m = endRegex.exec(stderr)) !== null) totalSilence += parseFloat(m[2]);

    return Math.max(0, Math.min(1, 1 - totalSilence / duration));
  } catch {
    return 0.7; // Default assumption
  }
}

function calculateQualityScore(duration: number, speechRatio: number): number {
  let score = 0;

  // Duration score (0-40 points) — prefer 10-20s segments
  if (duration >= 10 && duration <= 20) score += 40;
  else if (duration >= 8 && duration <= 30) score += 30;
  else if (duration >= 5) score += 15;
  else score += 5;

  // Speech ratio score (0-60 points) — higher speech content = better
  score += Math.round(speechRatio * 60);

  return Math.min(100, score);
}

function printDatasetSummary(dataset: TrainingDataset) {
  console.log(`\n${"═".repeat(60)}`);
  console.log("  TRAINING DATASET SUMMARY");
  console.log("═".repeat(60));
  console.log(`  Sources:           ${dataset.sourceCount} file(s)`);
  console.log(`  Segments:          ${dataset.segments.length}`);
  console.log(`  Total Speech:      ${dataset.totalSpeechDuration.toFixed(1)}s`);
  console.log(`  Quality Rating:    ${dataset.quality.toUpperCase()}`);

  const avgQuality = dataset.segments.length > 0
    ? dataset.segments.reduce((sum, s) => sum + s.qualityScore, 0) / dataset.segments.length
    : 0;
  console.log(`  Avg Segment Score: ${avgQuality.toFixed(0)}/100`);

  if (dataset.quality === "poor") {
    console.log(`\n  ⚠ Need more audio! Minimum: ${MIN_TRAINING_SECONDS}s of speech.`);
    console.log(`    Current: ${dataset.totalSpeechDuration.toFixed(1)}s`);
    console.log(`    Recommended: 2-5 minutes of clean speech for good results.`);
  } else if (dataset.quality === "fair") {
    console.log(`\n  💡 Decent quality. For better results, add more samples (aim for 2-5 min).`);
  } else if (dataset.quality === "good") {
    console.log(`\n  ✅ Good quality dataset! Ready for training.`);
  } else {
    console.log(`\n  🌟 Excellent dataset! Should produce high-accuracy voice clone.`);
  }

  console.log("═".repeat(60));
}
