/**
 * AI Video Orchestrator - Open Source Edition
 * Uses VoiceBox, Golpo, bobaAnime, and Reroll for high-quality video generation
 */

import path from "path";
import fs from "fs";
import { generateVoiceBox, isVoiceBoxInstalled, installVoiceBox } from "./voicebox";
import { generateGolpoVideo, checkGolpoHealth } from "./golpo";
import { generateBobaAnimeVideo, checkBobaAnimeHealth } from "./bobaAnime";
import { enhanceVideoWithReroll, checkRerollHealth } from "./reroll";
import { transcribeWithWhisper } from "./whisper";
import { renderWithCaptions } from "./captionAnimator";

export interface AIVideoOptions {
  script: string;
  topic: string;
  voice?: "default" | string;    // Voice ID or "default"
  style: "general" | "anime" | "cinematic";
  outputDir: string;
  enhance?: boolean;              // Use Reroll for enhancement
  includeSubtitles?: boolean;     // Add animated captions
}

export interface AIVideoResult {
  success: boolean;
  videoPath?: string;
  audioPath?: string;
  error?: string;
  duration?: number;
  fileSize?: number;
}

/**
 * Main orchestration function - generates complete AI video
 */
export async function generateAIVideo(options: AIVideoOptions): Promise<AIVideoResult> {
  console.log("\n🎬 AI Video Generation Pipeline (Open Source Edition)");
  console.log("════════════════════════════════════════════════════");
  console.log(`Topic: ${options.topic}`);
  console.log(`Style: ${options.style}`);
  console.log(`Enhance: ${options.enhance ? "Yes" : "No"}`);
  console.log(`Subtitles: ${options.includeSubtitles ? "Yes" : "No"}`);

  try {
    // Step 1: Check prerequisites
    console.log("\n[1/6] Checking prerequisites...");
    await checkPrerequisites();

    // Step 2: Generate voiceover using VoiceBox
    console.log("\n[2/6] Generating voiceover with VoiceBox...");
    const audioPath = path.join(options.outputDir, "voiceover.wav");
    await generateVoiceBox({
      text: options.script,
      outputPath: audioPath,
      config: {
        emotion: options.style === "anime" ? "excited" : "neutral",
        speed: 1.0,
      },
    });

    // Step 3: Generate base video
    console.log("\n[3/6] Generating video...");
    let videoPath: string;
    
    if (options.style === "anime") {
      // Use bobaAnime for anime style
      videoPath = path.join(options.outputDir, "video_anime.mp4");
      await generateBobaAnimeVideo({
        prompt: options.script,
        style: "seinen",
        motion: "dynamic",
        duration: 30,
      }, videoPath);
    } else {
      // Use Golpo for general/cinematic style
      videoPath = path.join(options.outputDir, "video_base.mp4");
      await generateGolpoVideo({
        script: options.script,
        style: options.style === "cinematic" ? "cinematic" : "realistic",
        aspectRatio: "9:16",
        duration: 30,
      }, videoPath);
    }

    // Step 4: Enhance video with Reroll (optional)
    if (options.enhance) {
      console.log("\n[4/6] Enhancing video with Reroll...");
      const enhancedPath = path.join(options.outputDir, "video_enhanced.mp4");
      await enhanceVideoWithReroll(videoPath, {
        operation: "enhance",
        denoiseLevel: 5,
        sharpenLevel: 3,
      }, enhancedPath);
      videoPath = enhancedPath;
    } else {
      console.log("\n[4/6] Skipping enhancement...");
    }

    // Step 5: Add subtitles (optional)
    let finalVideoPath = videoPath;
    if (options.includeSubtitles) {
      console.log("\n[5/6] Adding subtitles...");
      
      // Transcribe audio with Whisper
      const captions = await transcribeWithWhisper(audioPath, options.outputDir);
      
      // Overlay subtitles using renderWithCaptions
      finalVideoPath = path.join(options.outputDir, "video_with_captions.mp4");
      await renderWithCaptions(
        videoPath,
        audioPath,
        captions,
        options.outputDir,
        { style: { fontSize: 64, accentColor: "#FF6B35" } }
      );
    } else {
      console.log("\n[5/6] Skipping subtitles...");
    }

    // Step 6: Get video info
    console.log("\n[6/6] Finalizing...");
    const stats = fs.statSync(finalVideoPath);
    const fileSize = stats.size;

    console.log("\n✅ Video generation complete!");
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📁 Output: ${finalVideoPath}`);
    console.log(`📦 Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      success: true,
      videoPath: finalVideoPath,
      audioPath,
      fileSize,
    };
  } catch (error: any) {
    console.error(`\n❌ Pipeline failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check that all required tools are available
 */
async function checkPrerequisites(): Promise<void> {
  const checks = [];

  // Check VoiceBox
  const voiceBoxInstalled = await isVoiceBoxInstalled();
  if (!voiceBoxInstalled) {
    console.log("  ⚠️  VoiceBox not installed, installing now...");
    await installVoiceBox();
  } else {
    console.log("  ✓ VoiceBox installed");
  }
  checks.push(voiceBoxInstalled);

  // Check Golpo
  const golpoHealthy = await checkGolpoHealth();
  console.log(`  ${golpoHealthy ? "✓" : "⚠️"} Golpo API ${golpoHealthy ? "connected" : "not configured"}`);
  
  // Check bobaAnime
  const bobaHealthy = await checkBobaAnimeHealth();
  console.log(`  ${bobaHealthy ? "✓" : "⚠️"} bobaAnime API ${bobaHealthy ? "connected" : "not configured"}`);
  
  // Check Reroll
  const rerollHealthy = await checkRerollHealth();
  console.log(`  ${rerollHealthy ? "✓" : "⚠️"} Reroll API ${rerollHealthy ? "connected" : "not configured"}`);

  // At least one video generation API must be available
  if (!golpoHealthy && !bobaHealthy) {
    throw new Error("No video generation API configured (need Golpo or bobaAnime)");
  }
}

/**
 * Quick test function
 */
export async function testAIPipeline(): Promise<void> {
  const testScript = "This is a test of the new AI video generation pipeline using open source tools.";
  const outputDir = path.join(process.cwd(), "output", `test-ai-${Date.now()}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const result = await generateAIVideo({
    script: testScript,
    topic: "Test Video",
    style: "anime",
    outputDir,
    enhance: false,
    includeSubtitles: false,
  });

  if (result.success) {
    console.log(`✅ Test passed! Video: ${result.videoPath}`);
  } else {
    console.error(`❌ Test failed: ${result.error}`);
  }
}
