/**
 * Voice Analyzer Engine
 *
 * Analyzes audio samples to extract voice characteristics:
 *  - Fundamental frequency (pitch) → maps to TTS pitch parameter
 *  - Speaking rate (words per minute) → maps to TTS rate parameter
 *  - Energy/loudness profile → maps to intensity setting
 *  - Tonal quality (bright/warm/deep) → maps to voice selection
 *
 * Uses ffmpeg silencedetect + astats filters for analysis.
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

/* ── Types ──────────────────────────────────────────────────────────── */

export interface VoiceCharacteristics {
  /** Average fundamental frequency in Hz (male: 85-180, female: 165-255) */
  averagePitch: number;
  /** Pitch range (variation) in Hz — higher = more expressive */
  pitchRange: number;
  /** Estimated speaking rate: slow / normal / fast / very_fast */
  speakingRate: "slow" | "normal" | "fast" | "very_fast";
  /** Voice energy: calm / moderate / energetic / intense */
  energy: "calm" | "moderate" | "energetic" | "intense";
  /** Tonal quality based on frequency analysis */
  toneQuality: "deep" | "warm" | "neutral" | "bright" | "sharp";
  /** Duration of the sample in seconds */
  sampleDuration: number;
  /** RMS loudness level (dB) */
  rmsLevel: number;
  /** Peak loudness level (dB) */
  peakLevel: number;
  /** Number of silence gaps detected (correlates with speaking pace) */
  silenceGaps: number;
  /** Raw analysis data */
  raw: {
    meanFrequency: number;
    minFrequency: number;
    maxFrequency: number;
    meanRms: number;
    peakRms: number;
    duration: number;
    silences: number;
  };
}

export interface VoiceProfileSuggestion {
  /** Suggested Edge TTS voice name */
  suggestedVoice: string;
  /** Suggested rate adjustment */
  suggestedRate: string;
  /** Suggested pitch adjustment */
  suggestedPitch: string;
  /** Suggested language */
  suggestedLanguage: "english" | "hindi" | "hinglish";
  /** How well the TTS can approximate this voice (0-100) */
  matchConfidence: number;
  /** Description of the voice style */
  styleDescription: string;
  /** Humanization recommendations */
  humanizeSettings: {
    breathPauses: boolean;
    fillers: boolean;
    rateVariation: boolean;
  };
}

/* ── Edge TTS Voice Database ──────────────────────────────────────── */

const EDGE_VOICES = {
  // Indian male voices
  "hi-IN-MadhurNeural": { gender: "male", basePitch: 140, lang: "hindi", style: "youthful" },
  "en-IN-PrabhatNeural": { gender: "male", basePitch: 130, lang: "english", style: "warm" },
  // Indian female voices
  "hi-IN-SwaraNeural": { gender: "female", basePitch: 210, lang: "hindi", style: "authoritative" },
  "en-IN-NeerjaNeural": { gender: "female", basePitch: 220, lang: "english", style: "warm" },
  // Additional voices for variety
  "en-US-GuyNeural": { gender: "male", basePitch: 120, lang: "english", style: "deep" },
  "en-US-JennyNeural": { gender: "female", basePitch: 200, lang: "english", style: "bright" },
};

/* ── Core Analysis ─────────────────────────────────────────────────── */

/**
 * Analyze a voice sample audio file and extract characteristics.
 * Works with .mp3, .wav, .m4a, .ogg, .flac —any format ffmpeg supports.
 */
export async function analyzeVoiceSample(
  audioPath: string
): Promise<VoiceCharacteristics> {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Voice sample not found: ${audioPath}`);
  }

  console.log(`\n🔍 Analyzing voice sample: ${path.basename(audioPath)}`);

  // 1. Get audio stats (RMS, peak, duration)
  const stats = await getAudioStats(audioPath);

  // 2. Estimate fundamental frequency using ffmpeg's astats + frequency analysis
  const frequency = await estimatePitch(audioPath);

  // 3. Detect silence gaps (speaking pace indicator)
  const silences = await detectSilences(audioPath);

  // 4. Classify characteristics
  const averagePitch = frequency.mean;
  const pitchRange = frequency.max - frequency.min;

  // Classify speaking rate from silence gaps + duration
  const gapDensity = silences / stats.duration;
  let speakingRate: VoiceCharacteristics["speakingRate"];
  if (gapDensity > 0.3) speakingRate = "slow";
  else if (gapDensity > 0.15) speakingRate = "normal";
  else if (gapDensity > 0.08) speakingRate = "fast";
  else speakingRate = "very_fast";

  // Classify energy from RMS level
  let energy: VoiceCharacteristics["energy"];
  if (stats.rmsDb < -30) energy = "calm";
  else if (stats.rmsDb < -22) energy = "moderate";
  else if (stats.rmsDb < -15) energy = "energetic";
  else energy = "intense";

  // Classify tone quality from pitch
  let toneQuality: VoiceCharacteristics["toneQuality"];
  if (averagePitch < 100) toneQuality = "deep";
  else if (averagePitch < 140) toneQuality = "warm";
  else if (averagePitch < 190) toneQuality = "neutral";
  else if (averagePitch < 240) toneQuality = "bright";
  else toneQuality = "sharp";

  const result: VoiceCharacteristics = {
    averagePitch,
    pitchRange,
    speakingRate,
    energy,
    toneQuality,
    sampleDuration: stats.duration,
    rmsLevel: stats.rmsDb,
    peakLevel: stats.peakDb,
    silenceGaps: silences,
    raw: {
      meanFrequency: frequency.mean,
      minFrequency: frequency.min,
      maxFrequency: frequency.max,
      meanRms: stats.rmsDb,
      peakRms: stats.peakDb,
      duration: stats.duration,
      silences,
    },
  };

  printAnalysis(result);
  return result;
}

/**
 * Suggest the best Edge TTS voice profile settings to approximate a voice.
 */
export function suggestVoiceProfile(
  characteristics: VoiceCharacteristics,
  preferredLanguage: "english" | "hindi" | "hinglish" = "hindi"
): VoiceProfileSuggestion {
  const { averagePitch, speakingRate, energy, toneQuality, pitchRange } = characteristics;

  // Determine gender from pitch
  const isMale = averagePitch < 190;
  const isFemale = !isMale;

  // Find best matching Edge TTS voice
  let bestVoice = isMale ? "hi-IN-MadhurNeural" : "hi-IN-SwaraNeural";
  let bestDiff = Infinity;

  for (const [voiceName, voiceData] of Object.entries(EDGE_VOICES)) {
    // Filter by gender
    if (isMale && voiceData.gender === "female") continue;
    if (isFemale && voiceData.gender === "male") continue;

    // Filter by language preference
    if (preferredLanguage === "hindi" && voiceData.lang === "english" && voiceName.includes("US")) continue;
    if (preferredLanguage === "english" && voiceData.lang === "hindi") continue;

    const pitchDiff = Math.abs(voiceData.basePitch - averagePitch);
    if (pitchDiff < bestDiff) {
      bestDiff = pitchDiff;
      bestVoice = voiceName;
    }
  }

  // Calculate rate adjustment
  const baseVoice = EDGE_VOICES[bestVoice as keyof typeof EDGE_VOICES];
  let ratePercent = 0;
  switch (speakingRate) {
    case "slow": ratePercent = -5; break;
    case "normal": ratePercent = 0; break;
    case "fast": ratePercent = 8; break;
    case "very_fast": ratePercent = 15; break;
  }

  // Energy affects rate too
  if (energy === "energetic" || energy === "intense") ratePercent += 3;

  // Calculate pitch adjustment
  const pitchDelta = Math.round(averagePitch - baseVoice.basePitch);
  const pitchHz = Math.max(-10, Math.min(10, Math.round(pitchDelta / 10)));

  // Confidence based on how close the match is
  const matchConfidence = Math.max(20, 100 - Math.round(bestDiff / 2));

  // Style description
  const styleDesc = [
    energy === "intense" ? "High-energy" : energy === "energetic" ? "Energetic" : energy === "calm" ? "Calm" : "Moderate",
    toneQuality,
    isMale ? "male" : "female",
    `voice (${speakingRate} pace)`,
    pitchRange > 60 ? "with high expressiveness" : pitchRange > 30 ? "with moderate expressiveness" : "with steady tone",
  ].join(" ");

  return {
    suggestedVoice: bestVoice,
    suggestedRate: `${ratePercent >= 0 ? "+" : ""}${ratePercent}%`,
    suggestedPitch: `${pitchHz >= 0 ? "+" : ""}${pitchHz}Hz`,
    suggestedLanguage: preferredLanguage,
    matchConfidence,
    styleDescription: styleDesc,
    humanizeSettings: {
      breathPauses: energy !== "calm", // Calm voices sound better without aggressive pausing
      fillers: preferredLanguage !== "english", // Hindi/Hinglish benefit from fillers
      rateVariation: pitchRange > 40, // Expressive voices should have rate variation
    },
  };
}

/* ── FFmpeg Analysis Helpers ───────────────────────────────────────── */

async function getAudioStats(audioPath: string): Promise<{
  duration: number;
  rmsDb: number;
  peakDb: number;
}> {
  try {
    const cmd = `ffmpeg -i "${audioPath}" -af "astats=metadata=1:reset=1" -f null - 2>&1`;
    const { stderr } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
    const output = stderr || "";

    // Parse duration
    const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    let duration = 30;
    if (durMatch) {
      duration =
        parseInt(durMatch[1]) * 3600 +
        parseInt(durMatch[2]) * 60 +
        parseInt(durMatch[3]) +
        parseInt(durMatch[4]) / 100;
    }

    // Parse RMS level
    const rmsMatch = output.match(/RMS level dB:\s*(-?[\d.]+)/);
    const rmsDb = rmsMatch ? parseFloat(rmsMatch[1]) : -20;

    // Parse peak level
    const peakMatch = output.match(/Peak level dB:\s*(-?[\d.]+)/);
    const peakDb = peakMatch ? parseFloat(peakMatch[1]) : -3;

    console.log(`  ✓ Duration: ${duration.toFixed(1)}s | RMS: ${rmsDb.toFixed(1)}dB | Peak: ${peakDb.toFixed(1)}dB`);
    return { duration, rmsDb, peakDb };
  } catch {
    console.warn("  ⚠ Audio stats extraction failed, using defaults");
    return { duration: 30, rmsDb: -20, peakDb: -3 };
  }
}

async function estimatePitch(audioPath: string): Promise<{
  mean: number;
  min: number;
  max: number;
}> {
  try {
    // Use ffmpeg to extract frequency components via volumedetect + band-pass analysis
    // We'll do a rough pitch estimate by analyzing different frequency bands

    const bands = [
      { freq: 100, label: "bass" },
      { freq: 150, label: "low" },
      { freq: 200, label: "mid-low" },
      { freq: 250, label: "mid" },
      { freq: 300, label: "mid-high" },
    ];

    let peakEnergy = 0;
    let peakFreq = 150;
    const energies: number[] = [];

    for (const band of bands) {
      // Band-pass filter around each frequency
      const bw = 40; // bandwidth
      const low = band.freq - bw;
      const high = band.freq + bw;
      const cmd = `ffmpeg -i "${audioPath}" -af "highpass=f=${low},lowpass=f=${high},volumedetect" -f null - 2>&1`;
      const { stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
      const output = stderr || "";

      const meanMatch = output.match(/mean_volume:\s*(-?[\d.]+)/);
      const meanVol = meanMatch ? parseFloat(meanMatch[1]) : -100;
      energies.push(meanVol);

      if (meanVol > peakEnergy) {
        peakEnergy = meanVol;
        peakFreq = band.freq;
      }
    }

    // Estimate pitch range from energy distribution
    const activeFreqs = bands.filter((_, i) => energies[i] > peakEnergy - 10).map((b) => b.freq);
    const minFreq = Math.min(...activeFreqs, peakFreq - 30);
    const maxFreq = Math.max(...activeFreqs, peakFreq + 30);

    console.log(`  ✓ Estimated pitch: ~${peakFreq}Hz (range: ${minFreq}-${maxFreq}Hz)`);
    return { mean: peakFreq, min: minFreq, max: maxFreq };
  } catch {
    console.warn("  ⚠ Pitch estimation failed, using defaults (male voice ~150Hz)");
    return { mean: 150, min: 100, max: 200 };
  }
}

async function detectSilences(audioPath: string): Promise<number> {
  try {
    const cmd = `ffmpeg -i "${audioPath}" -af "silencedetect=noise=-30dB:d=0.3" -f null - 2>&1`;
    const { stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
    const output = stderr || "";

    const silences = (output.match(/silence_start/g) || []).length;
    console.log(`  ✓ Silence gaps detected: ${silences}`);
    return silences;
  } catch {
    console.warn("  ⚠ Silence detection failed, using default");
    return 5;
  }
}

/* ── Pretty Print ──────────────────────────────────────────────────── */

function printAnalysis(c: VoiceCharacteristics) {
  console.log(`\n${"═".repeat(60)}`);
  console.log("  VOICE ANALYSIS RESULTS");
  console.log("═".repeat(60));
  console.log(`  Pitch:         ~${c.averagePitch}Hz (${c.toneQuality})`);
  console.log(`  Pitch Range:   ${c.pitchRange}Hz (${c.pitchRange > 60 ? "very expressive" : c.pitchRange > 30 ? "expressive" : "steady"})`);
  console.log(`  Speaking Rate:  ${c.speakingRate}`);
  console.log(`  Energy:         ${c.energy}`);
  console.log(`  Tone Quality:   ${c.toneQuality}`);
  console.log(`  Duration:       ${c.sampleDuration.toFixed(1)}s`);
  console.log(`  RMS Level:      ${c.rmsLevel.toFixed(1)}dB`);
  console.log(`  Peak Level:     ${c.peakLevel.toFixed(1)}dB`);
  console.log(`  Silence Gaps:   ${c.silenceGaps}`);
  console.log("═".repeat(60));
}
