/**
 * Voice Cloning & Training CLI
 *
 * Complete voice pipeline: analyze → clone → train → refine → use.
 * Accepts MP4 videos, audio files, or any media with voice.
 *
 * Features:
 *   1. Analyze voice sample → extract pitch, rate, tone, energy
 *   2. Clone voice instantly (ElevenLabs IVC)
 *   3. Train professional voice clone from MP4/audio (ElevenLabs PVC)
 *   4. Refine existing voice with additional samples
 *   5. Fallback Edge TTS profile auto-tuned to match characteristics
 *
 * Usage:
 *   npx ts-node src/cli/clone-voice.ts clone <audio_file> <name> [language]
 *   npx ts-node src/cli/clone-voice.ts train <file1> [file2...] --name <name> [--lang hindi]
 *   npx ts-node src/cli/clone-voice.ts refine <voice_id> <file1> [file2...]
 *   npx ts-node src/cli/clone-voice.ts analyze <audio_file>
 *   npx ts-node src/cli/clone-voice.ts list
 *   npx ts-node src/cli/clone-voice.ts test <profile_id> "text"
 *
 * Examples:
 *   # Quick clone from a single audio file
 *   npx ts-node src/cli/clone-voice.ts clone input/raju_voice.mp3 raju_real hindi
 *
 *   # Train from MP4 video(s) — extracts, cleans, segments, trains
 *   npx ts-node src/cli/clone-voice.ts train input/raju_video.mp4 --name raju_trained --lang hindi
 *   npx ts-node src/cli/clone-voice.ts train input/vid1.mp4 input/vid2.mp4 --name my_voice
 *
 *   # Refine existing voice with more samples
 *   npx ts-node src/cli/clone-voice.ts refine abc123voiceid input/more_audio.mp4
 *
 *   # Analyze voice characteristics
 *   npx ts-node src/cli/clone-voice.ts analyze input/voice.mp3
 */

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import {
  analyzeVoiceSample,
  suggestVoiceProfile,
  VoiceCharacteristics,
} from "../lib/voiceAnalyzer";
import { VOICE_PROFILES, VoiceProfile } from "../lib/tts";
import {
  buildTrainingDataset,
  trainVoice,
  refineVoice,
  extractAudio,
} from "../lib/voiceTrainer";

/* ── Helpers ────────────────────────────────────────────────────────── */

function printBanner() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎙️  Voice Cloning & Analysis Tool
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

function printUsage() {
  console.log(`
Usage:
  npx ts-node src/cli/clone-voice.ts <command> [options]

Commands:
  clone <file> <name> [language]             Quick clone from single audio
  train <files...> --name <n> [--lang hindi]  Full training pipeline (MP4/audio)
  refine <voice_id> <files...>                Add samples to improve existing voice
  analyze <file>                              Analyze voice characteristics
  list                                        List all voice profiles
  test <profile_id> "text"                    Test a voice profile

Supported Formats:
  Video: .mp4, .mkv, .avi, .mov, .webm (audio auto-extracted)
  Audio: .mp3, .wav, .m4a, .ogg, .flac, .aac

Examples:
  Train from MP4 video (extracts voice, cleans, trains):
    npx ts-node src/cli/clone-voice.ts train input/raju.mp4 --name raju_pro --lang hindi

  Train from multiple files for better accuracy:
    npx ts-node src/cli/clone-voice.ts train input/vid1.mp4 input/vid2.mp4 input/audio.mp3 --name my_voice

  Quick clone from audio:
    npx ts-node src/cli/clone-voice.ts clone input/voice.mp3 my_voice hindi

  Improve an existing voice with more samples:
    npx ts-node src/cli/clone-voice.ts refine abc123voiceid input/more.mp4

  Analyze a voice sample:
    npx ts-node src/cli/clone-voice.ts analyze input/voice.mp3
`);
}

/* ── Clone Command ─────────────────────────────────────────────────── */

async function cloneVoice(
  audioPath: string,
  profileName: string,
  language: "english" | "hindi" | "hinglish" = "hindi"
) {
  const absPath = path.resolve(audioPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Audio file not found: ${absPath}`);
    process.exit(1);
  }

  const ext = path.extname(absPath).toLowerCase();
  if (![".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac", ".webm"].includes(ext)) {
    console.error(`❌ Unsupported audio format: ${ext}`);
    console.error("   Supported: .mp3, .wav, .m4a, .ogg, .flac, .aac, .webm");
    process.exit(1);
  }

  const fileSize = fs.statSync(absPath).size;
  console.log(`📁 Audio file: ${path.basename(absPath)} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);

  // Step 1: Analyze the voice
  console.log("\n📊 Step 1/3: Analyzing voice characteristics...");
  const characteristics = await analyzeVoiceSample(absPath);
  const suggestion = suggestVoiceProfile(characteristics, language);

  console.log(`\n💡 Edge TTS Suggestion (fallback):`);
  console.log(`   Voice: ${suggestion.suggestedVoice}`);
  console.log(`   Rate:  ${suggestion.suggestedRate}`);
  console.log(`   Pitch: ${suggestion.suggestedPitch}`);
  console.log(`   Style: ${suggestion.styleDescription}`);
  console.log(`   Match: ${suggestion.matchConfidence}%`);

  // Step 2: Upload to ElevenLabs for voice cloning
  let elevenLabsVoiceId: string | undefined;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (apiKey) {
    console.log("\n🔬 Step 2/3: Creating ElevenLabs voice clone...");
    try {
      const client = new ElevenLabsClient({ apiKey });

      // Read the audio file as a Blob for the API
      const audioBuffer = fs.readFileSync(absPath);
      const audioBlob = new Blob([audioBuffer], { type: `audio/${ext.slice(1)}` });

      console.log(`  → Uploading to ElevenLabs Instant Voice Clone...`);

      const result = await client.voices.ivc.create({
        name: profileName,
        description: `Cloned voice: ${suggestion.styleDescription}. Language: ${language}. Pitch: ~${characteristics.averagePitch}Hz, Energy: ${characteristics.energy}, Rate: ${characteristics.speakingRate}`,
        files: [audioBlob],
        labels: {
          language,
          energy: characteristics.energy,
          tone: characteristics.toneQuality,
          rate: characteristics.speakingRate,
          source: "youinst-automator",
        },
      });

      elevenLabsVoiceId = result.voiceId || (result as any).voice_id;
      console.log(`  ✅ Voice cloned! ID: ${elevenLabsVoiceId}`);
      console.log(`  → You can preview it at: https://elevenlabs.io/app/voice-lab`);
    } catch (err: any) {
      console.warn(`\n  ⚠️  ElevenLabs cloning failed: ${err.message}`);
      if (err.statusCode === 401) {
        console.warn("     → Check your ELEVENLABS_API_KEY in .env");
      } else if (err.statusCode === 422) {
        console.warn("     → Audio may be too short or low quality. Need at least 30s of clean speech.");
      } else if (err.statusCode === 402) {
        console.warn("     → Voice cloning requires an ElevenLabs paid plan.");
      }
      console.warn("     → Falling back to Edge TTS profile based on voice analysis.\n");
    }
  } else {
    console.log("\n⚠️  Step 2/3: Skipped — ELEVENLABS_API_KEY not set in .env");
    console.log("   → Will create Edge TTS profile based on voice analysis only.");
  }

  // Step 3: Register the voice profile
  console.log("\n📝 Step 3/3: Registering voice profile...");

  const profileConfig: VoiceProfile = {
    id: profileName,
    label: `${profileName} (${elevenLabsVoiceId ? "Cloned" : "Matched"})`,
    description: `${elevenLabsVoiceId ? "ElevenLabs cloned" : "Edge TTS matched"} — ${suggestion.styleDescription}`,
    voice: {
      voice: suggestion.suggestedVoice,
      rate: suggestion.suggestedRate,
      pitch: suggestion.suggestedPitch,
    },
    language,
    humanize: suggestion.humanizeSettings,
    ...(elevenLabsVoiceId
      ? {
          elevenlabs: {
            voiceId: elevenLabsVoiceId,
            modelId: "eleven_multilingual_v2",
          },
        }
      : {}),
  };

  // Save to cloned-voices.json for persistence
  const clonedVoicesPath = path.resolve(__dirname, "../../cloned-voices.json");
  let clonedVoices: Record<string, VoiceProfile> = {};

  if (fs.existsSync(clonedVoicesPath)) {
    try {
      clonedVoices = JSON.parse(fs.readFileSync(clonedVoicesPath, "utf-8"));
    } catch {
      clonedVoices = {};
    }
  }

  clonedVoices[profileName] = profileConfig;
  fs.writeFileSync(clonedVoicesPath, JSON.stringify(clonedVoices, null, 2));

  // Also save analysis
  const analysisPath = path.resolve(__dirname, `../../input/${profileName}_analysis.json`);
  if (!fs.existsSync(path.dirname(analysisPath))) {
    fs.mkdirSync(path.dirname(analysisPath), { recursive: true });
  }
  fs.writeFileSync(
    analysisPath,
    JSON.stringify({ characteristics, suggestion, profile: profileConfig }, null, 2)
  );

  // Print the profile config for manual addition to tts.ts
  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅ VOICE PROFILE CREATED SUCCESSFULLY!");
  console.log("═".repeat(60));
  console.log(`  Profile ID:    ${profileName}`);
  console.log(`  ElevenLabs:    ${elevenLabsVoiceId || "N/A (Edge TTS only)"}`);
  console.log(`  Saved to:      cloned-voices.json`);
  console.log(`  Analysis:      input/${profileName}_analysis.json`);

  console.log(`\n  To use in CLI:`);
  console.log(`    npx ts-node src/cli/generate.ts generate tech "Your Topic" ${profileName} ${language}`);

  console.log(`\n  To use in webapp:`);
  console.log(`    Select "${profileName}" from the voice dropdown`);

  if (elevenLabsVoiceId) {
    console.log(`\n  📌 ElevenLabs Voice ID: ${elevenLabsVoiceId}`);
    console.log(`     Model: eleven_multilingual_v2 (supports Hindi + English)`);
    console.log(`     → When ElevenLabs is available, this voice is used.`);
    console.log(`     → When unavailable, falls back to Edge TTS with matched settings.`);
  }

  console.log(`\n${"═".repeat(60)}\n`);

  return profileConfig;
}

/* ── Analyze Command ───────────────────────────────────────────────── */

async function analyzeOnly(audioPath: string) {
  const absPath = path.resolve(audioPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Audio file not found: ${absPath}`);
    process.exit(1);
  }

  const characteristics = await analyzeVoiceSample(absPath);

  console.log("\n💡 PROFILE SUGGESTIONS BY LANGUAGE:");
  for (const lang of ["hindi", "english", "hinglish"] as const) {
    const suggestion = suggestVoiceProfile(characteristics, lang);
    console.log(`\n  ${lang.toUpperCase()}:`);
    console.log(`    Voice: ${suggestion.suggestedVoice}`);
    console.log(`    Rate:  ${suggestion.suggestedRate}`);
    console.log(`    Pitch: ${suggestion.suggestedPitch}`);
    console.log(`    Match: ${suggestion.matchConfidence}%`);
  }

  console.log(`\n  To clone this voice, run:`);
  console.log(`    npx ts-node src/cli/clone-voice.ts clone "${audioPath}" my_voice hindi\n`);
}

/* ── List Command ──────────────────────────────────────────────────── */

function listProfiles() {
  console.log("\n📋 BUILT-IN VOICE PROFILES:");
  console.log("─".repeat(60));

  for (const [id, profile] of Object.entries(VOICE_PROFILES)) {
    const hasEL = profile.elevenlabs ? "🟢 ElevenLabs" : "🔵 Edge TTS";
    console.log(`\n  ${hasEL}  ${id}`);
    console.log(`    Label: ${profile.label}`);
    console.log(`    Voice: ${profile.voice.voice} (rate=${profile.voice.rate}, pitch=${profile.voice.pitch})`);
    console.log(`    Lang:  ${profile.language}`);
    if (profile.elevenlabs) {
      console.log(`    EL ID: ${profile.elevenlabs.voiceId}`);
    }
  }

  // Check for cloned voices
  const clonedVoicesPath = path.resolve(__dirname, "../../cloned-voices.json");
  if (fs.existsSync(clonedVoicesPath)) {
    try {
      const clonedVoices = JSON.parse(fs.readFileSync(clonedVoicesPath, "utf-8"));
      const entries = Object.entries(clonedVoices);

      if (entries.length > 0) {
        console.log(`\n\n🎤 CLONED VOICE PROFILES (cloned-voices.json):`);
        console.log("─".repeat(60));

        for (const [id, profile] of entries) {
          const p = profile as VoiceProfile;
          const hasEL = p.elevenlabs ? "🟢 ElevenLabs" : "🔵 Edge TTS";
          console.log(`\n  ${hasEL}  ${id}`);
          console.log(`    Label: ${p.label}`);
          console.log(`    Voice: ${p.voice.voice} (rate=${p.voice.rate}, pitch=${p.voice.pitch})`);
          console.log(`    Lang:  ${p.language}`);
          if (p.elevenlabs) {
            console.log(`    EL ID: ${p.elevenlabs.voiceId}`);
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  console.log("\n");
}

/* ── Test Command ──────────────────────────────────────────────────── */

async function testVoice(profileId: string, text: string) {
  // Dynamic import to avoid circular deps
  const { generateVoice, getVoiceProfile, loadClonedVoices } = await import("../lib/tts");

  // Load cloned voices first
  loadClonedVoices();

  const profile = getVoiceProfile(profileId);
  console.log(`\n🎙️  Testing voice profile: ${profile.label}`);
  console.log(`   Voice: ${profile.voice.voice}`);
  console.log(`   Rate:  ${profile.voice.rate}`);
  console.log(`   Pitch: ${profile.voice.pitch}`);
  if (profile.elevenlabs) {
    console.log(`   ElevenLabs: ${profile.elevenlabs.voiceId}`);
  }

  const outputDir = path.resolve(__dirname, "../../output/voice-test");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outFile = await generateVoice(text, outputDir, undefined, profileId);
  console.log(`\n✅ Test voice saved: ${outFile}`);
  console.log(`   Play it to hear how it sounds!\n`);
}

/* ── Train Command ─────────────────────────────────────────────────── */

async function handleTrain(args: string[]) {
  // Parse args: <file1> [file2...] --name <name> [--lang <lang>]
  const files: string[] = [];
  let profileName = "";
  let language: "english" | "hindi" | "hinglish" = "hindi";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--name" && args[i + 1]) {
      profileName = args[++i];
    } else if (args[i] === "--lang" && args[i + 1]) {
      language = args[++i] as any;
    } else if (!args[i].startsWith("--")) {
      files.push(args[i]);
    }
  }

  if (files.length === 0 || !profileName) {
    console.error("❌ Missing arguments.");
    console.error("   Usage: train <file1> [file2...] --name <profile_name> [--lang hindi]");
    console.error("   Example: train input/video.mp4 --name raju_pro --lang hindi");
    process.exit(1);
  }

  // Validate all files exist
  for (const f of files) {
    if (!fs.existsSync(path.resolve(f))) {
      console.error(`❌ File not found: ${f}`);
      process.exit(1);
    }
  }

  console.log(`\n🎓 VOICE TRAINING PIPELINE`);
  console.log(`   Name:     ${profileName}`);
  console.log(`   Language: ${language}`);
  console.log(`   Sources:  ${files.length} file(s)`);
  files.forEach((f) => console.log(`     → ${path.basename(f)}`));

  // Step 1: Analyze the first file for voice characteristics
  console.log(`\n📊 Analyzing voice characteristics from first source...`);
  const firstFile = files[0];
  const ext = path.extname(firstFile).toLowerCase();
  const isVideo = [".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv"].includes(ext);

  let analysisPath = firstFile;
  const workDir = path.resolve(`output/voice-training-${profileName}-${Date.now()}`);
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

  // If it's a video, extract audio first for analysis
  if (isVideo) {
    const extracted = await extractAudio(firstFile, workDir);
    analysisPath = extracted.audioPath;
  }

  const characteristics = await analyzeVoiceSample(analysisPath);
  const suggestion = suggestVoiceProfile(characteristics, language);

  // Step 2: Build training dataset
  const dataset = await buildTrainingDataset(files, workDir);

  // Step 3: Train the voice on ElevenLabs
  let trainedVoice;
  try {
    trainedVoice = await trainVoice(dataset, profileName, {
      language,
      description: `${suggestion.styleDescription}. Trained from ${files.length} source(s).`,
      usePVC: true,
    });
  } catch (err: any) {
    console.error(`\n❌ Training failed: ${err.message}`);
    console.log(`\n💡 Creating Edge TTS fallback profile based on voice analysis...`);
  }

  // Step 4: Register as voice profile
  const profileConfig: VoiceProfile = {
    id: profileName,
    label: `${profileName} (${trainedVoice ? "PVC Trained" : "Matched"})`,
    description: `${trainedVoice ? "ElevenLabs PVC trained" : "Edge TTS matched"} — ${suggestion.styleDescription}`,
    voice: {
      voice: suggestion.suggestedVoice,
      rate: suggestion.suggestedRate,
      pitch: suggestion.suggestedPitch,
    },
    language,
    humanize: suggestion.humanizeSettings,
    ...(trainedVoice
      ? {
          elevenlabs: {
            voiceId: trainedVoice.voiceId,
            modelId: "eleven_multilingual_v2",
          },
        }
      : {}),
  };

  // Save to cloned-voices.json
  const clonedVoicesPath = path.resolve(__dirname, "../../cloned-voices.json");
  let clonedVoices: Record<string, VoiceProfile> = {};
  if (fs.existsSync(clonedVoicesPath)) {
    try { clonedVoices = JSON.parse(fs.readFileSync(clonedVoicesPath, "utf-8")); } catch {}
  }
  clonedVoices[profileName] = profileConfig;
  fs.writeFileSync(clonedVoicesPath, JSON.stringify(clonedVoices, null, 2));

  // Save training metadata
  const metaPath = path.join(workDir, "training_result.json");
  fs.writeFileSync(metaPath, JSON.stringify({
    profileName,
    language,
    trainedVoice,
    characteristics,
    suggestion,
    profile: profileConfig,
    sourceFiles: files,
    timestamp: new Date().toISOString(),
  }, null, 2));

  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅ VOICE TRAINING COMPLETE!");
  console.log("═".repeat(60));
  console.log(`  Profile:      ${profileName}`);
  console.log(`  ElevenLabs:   ${trainedVoice?.voiceId || "N/A (Edge TTS fallback)"}`);
  console.log(`  Quality:      ${dataset.quality.toUpperCase()}`);
  console.log(`  Segments:     ${dataset.segments.length}`);
  console.log(`  Speech Time:  ${dataset.totalSpeechDuration.toFixed(1)}s`);
  console.log(`  Training Dir: ${workDir}`);

  if (trainedVoice) {
    console.log(`\n  📌 PVC training runs on ElevenLabs servers.`);
    console.log(`     Check status: https://elevenlabs.io/app/voice-lab`);
    console.log(`     Once ready, generate videos with:`);
  } else {
    console.log(`\n  💡 Using Edge TTS with matched settings:`);
  }
  console.log(`     npx ts-node src/cli/generate.ts generate tech "Your Topic" ${profileName} ${language}`);
  console.log(`\n${"═".repeat(60)}\n`);
}

/* ── Refine Command ────────────────────────────────────────────────── */

async function handleRefine(args: string[]) {
  const voiceId = args[0];
  const files = args.slice(1).filter((a) => !a.startsWith("--"));

  if (!voiceId || files.length === 0) {
    console.error("❌ Missing arguments.");
    console.error("   Usage: refine <voice_id> <file1> [file2...]");
    console.error("   Example: refine abc123 input/more_audio.mp4");
    process.exit(1);
  }

  for (const f of files) {
    if (!fs.existsSync(path.resolve(f))) {
      console.error(`❌ File not found: ${f}`);
      process.exit(1);
    }
  }

  console.log(`\n🔄 VOICE REFINEMENT`);
  console.log(`   Voice ID:   ${voiceId}`);
  console.log(`   New Sources: ${files.length} file(s)`);

  const workDir = path.resolve(`output/voice-refine-${Date.now()}`);
  const result = await refineVoice(voiceId, files, workDir);

  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅ VOICE REFINEMENT COMPLETE!");
  console.log("═".repeat(60));
  console.log(`  Samples Added: ${result.added}`);
  console.log(`  New Duration:  ${result.totalDuration.toFixed(1)}s`);

  if (result.added > 0) {
    console.log(`\n  Re-training in progress on ElevenLabs.`);
    console.log(`  Check: https://elevenlabs.io/app/voice-lab`);
  }
  console.log(`\n${"═".repeat(60)}\n`);
}

/* ── Main ──────────────────────────────────────────────────────────── */

async function main() {
  printBanner();

  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  switch (command) {
    case "clone": {
      const audioFile = args[1];
      const profileName = args[2];
      const language = (args[3] || "hindi") as "english" | "hindi" | "hinglish";

      if (!audioFile || !profileName) {
        console.error("❌ Missing arguments.");
        console.error("   Usage: clone <audio_file> <profile_name> [language]");
        process.exit(1);
      }
      await cloneVoice(audioFile, profileName, language);
      break;
    }

    case "analyze": {
      const audioFile = args[1];
      if (!audioFile) {
        console.error("❌ Missing audio file path.");
        console.error("   Usage: analyze <audio_file>");
        process.exit(1);
      }
      await analyzeOnly(audioFile);
      break;
    }

    case "list": {
      listProfiles();
      break;
    }

    case "test": {
      const profileId = args[1];
      const text = args[2];
      if (!profileId || !text) {
        console.error("❌ Missing arguments.");
        console.error('   Usage: test <profile_id> "sample text"');
        process.exit(1);
      }
      await testVoice(profileId, text);
      break;
    }

    case "train": {
      await handleTrain(args.slice(1));
      break;
    }

    case "refine": {
      await handleRefine(args.slice(1));
      break;
    }

    default: {
      printUsage();
      process.exit(command ? 1 : 0);
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
