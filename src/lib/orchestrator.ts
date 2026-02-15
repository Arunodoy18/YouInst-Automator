/**
 * SaaS Orchestrator — Main autonomous pipeline
 *
 * Intelligent 13-step content generation flow:
 *  1. Fetch performance data (self-learning feedback)
 *  2. Load intelligence config
 *  3. Rotate intelligently (weighted niche selection)
 *  4. Trend scan → discover keywords
 *  5. Generate trending topic
 *  6. Fact-based research → verify data (fallback: generate hooks)
 *  7. Generate fact-verified content (fallback: retention script)
 *  8. Render video (TTS + captions + procedural bg + music)
 *  9. Upload to platforms (YouTube + Instagram)
 * 10. Score retention (AI evaluation, 6 dimensions)
 * 11. Track analytics
 * 12. Feed performance back into system
 * 13. Log results + retention report
 *
 * Can be called from:
 * - CLI (direct invocation)
 * - BullMQ workers (scheduled jobs)
 * - API routes (manual trigger from dashboard)
 */
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs";
import prisma from "./db";
import logger from "./logger";
import { getNicheConfig, NICHE_IDS } from "./niches";
import {
  generateAgentScript,
  generateTopics,
  generateHooks,
  optimizeHook,
  generatePinnedComment,
  type IntelligenceConfig,
  type PsychologyMode,
  type RetentionLevel,
} from "./agentBrain";
import { runTrendScan, getBestKeywords } from "./trendEngine";
import { generateVoice } from "./tts";
import { transcribeWithWhisper, groupWordsIntoCaptions } from "./whisper";
import { fetchBackgroundMusic } from "./pixabay";
import { renderVideo, getAudioDuration } from "./videoRenderer";
import { splitScript } from "./scriptSplitter";
import { selectVisualStrategy } from "./visualSelector";
import { pickBackground } from "./backgroundEngine";
import { composeMotion } from "./motionComposer";
import { renderWithCaptions } from "./captionAnimator";
import { uploadToYouTube } from "./youtube";
import { uploadToTempHost } from "./tempHosting";
import { uploadToInstagram, isInstagramConfigured } from "./instagram";
import { optimizeForAllPlatforms } from "./platformOptimizer";
import { getPerformanceFeedback, fetchAllPendingAnalytics } from "./analyticsTracker";
import { logJob, updateJobLog } from "./jobLogger";
import { isRedisConfigured } from "./scheduler";
import { fetchVerifiedFacts, isResearchError, type VerifiedResearch } from "./factResearch";
import { generateFactContent, type FactBasedContent } from "./factContentEngine";
import { generateProceduralBackground } from "./proceduralBackground";
import { scoreRetention, type RetentionReport } from "./retentionScorer";
import { selectNicheWithRotation, logNicheUsage, backfillNichePerformance } from "./nicheRotation";
import { pickBestTopic } from "./viralScorer";
import { analyzeChannelPerformance, type PerformanceAnalysis } from "./performanceOptimizer";

const OUTPUT_BASE = path.resolve(__dirname, "../../output");

// ── Pipeline Result ──────────────────────────────────────────────────

export interface PipelineResult {
  scriptDbId: string;
  renderedVideoDbId: string;
  uploads: Array<{
    platform: string;
    url: string;
    postedVideoDbId: string;
  }>;
  topic: string;
  nicheId: string;
}

// ── Full Pipeline ────────────────────────────────────────────────────

/**
 * Execute the complete video generation + upload pipeline.
 *
 * @param nicheId - One of the predefined niche IDs (e.g., "ai", "tech")
 * @param nicheDbId - The database Niche record ID
 * @param channelId - The Channel database ID (for uploading + OAuth)
 * @param scheduleId - Optional schedule ID for job logging
 * @param topicOverride - Optional: skip topic generation and use this topic
 */
export async function runFullPipeline(
  nicheId: string,
  nicheDbId: string,
  channelId: string,
  scheduleId?: string,
  topicOverride?: string
): Promise<PipelineResult> {
  const jobLogId = await logJob(scheduleId || null, "full-pipeline", "running", {
    nicheId,
    channelId,
  });

  const runId = `${nicheId}-${Date.now()}`;
  const outputDir = path.resolve(OUTPUT_BASE, runId);
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    // ─── Step 1: Fetch Performance Data + AI Analysis ──────────────
    logger.info(`═══ Pipeline started: ${runId} ═══`);
    logger.info("[1/13] Fetching performance data + running AI analysis…");

    const feedback = await getPerformanceFeedback(nicheDbId);
    logger.info(`Performance feedback: ${feedback.avgViews} avg views, ${feedback.avgEngagement}% engagement`);

    // Run full AI performance analysis (non-blocking — uses cached metrics)
    let perfAnalysis: PerformanceAnalysis | null = null;
    try {
      perfAnalysis = await analyzeChannelPerformance(channelId, 30);
      logger.info(
        `AI analysis: hook ${perfAnalysis.hookEffectiveness.rating} (${perfAnalysis.hookEffectiveness.score}), ` +
        `best niche: ${perfAnalysis.bestPerformingNiche.nicheId}, ` +
        `target pacing: ${perfAnalysis.scriptPacingAdjustment.targetRetentionLevel}, ` +
        `confidence: ${perfAnalysis.confidenceLevel}`
      );
    } catch (err: any) {
      logger.warn(`AI performance analysis failed (non-fatal): ${err.message}`);
    }

    // ─── Step 2: Load Intelligence Config ─────────────────────────
    logger.info("[2/13] Loading intelligence config…");
    const intelConfig = await prisma.contentIntelligenceConfig.findUnique({
      where: { channelId },
    });
    const intelligence: IntelligenceConfig = {
      psychologyMode: (intelConfig?.psychologyMode as PsychologyMode) ?? "aggressive",
      retentionLevel: (intelConfig?.retentionLevel as RetentionLevel) ?? "enhanced",
    };
    logger.info(`Intelligence: mode=${intelligence.psychologyMode}, retention=${intelligence.retentionLevel}, rotation=${intelConfig?.nicheRotationEnabled ?? false}`);

    // Auto-tune retention level from AI analysis when confidence is medium+
    if (perfAnalysis && perfAnalysis.confidenceLevel !== "low") {
      const recommended = perfAnalysis.scriptPacingAdjustment.targetRetentionLevel;
      if (recommended !== intelligence.retentionLevel) {
        logger.info(`AI auto-tune: retention ${intelligence.retentionLevel} → ${recommended} (${perfAnalysis.scriptPacingAdjustment.recommendation})`);
        intelligence.retentionLevel = recommended as RetentionLevel;
      }
    }

    // ─── Step 3: Intelligent Niche Rotation ───────────────────────
    let activeNicheId = nicheId;
    if (intelConfig?.nicheRotationEnabled && !topicOverride) {
      logger.info("[3/13] Running intelligent niche rotation…");
      const rotation = await selectNicheWithRotation(channelId);
      activeNicheId = rotation.selectedNicheId;
      logger.info(`Niche rotated: ${nicheId} → ${activeNicheId} (weights: ${rotation.weights.map(w => `${w.nicheId}:${w.weight}`).join(", ")})`);
    } else {
      logger.info("[3/13] Niche rotation disabled, using: " + nicheId);
    }

    const niche = getNicheConfig(activeNicheId);
    logger.info(`Niche: ${niche.label} | Channel: ${channelId}`);

    // ─── Step 4: Trend Scan ──────────────────────────────────────
    logger.info("[4/13] Running trend scan…");
    await runTrendScan(activeNicheId, nicheDbId, niche.topicSeeds.slice(0, 3));
    const trendKeywords = await getBestKeywords(nicheDbId);

    // ─── Step 5: Generate Trending Topics + Viral Scoring ─────────
    logger.info("[5/13] Generating & scoring trending topics…");

    let topic = topicOverride;
    if (!topic) {
      const topics = await generateTopics(
        activeNicheId,
        trendKeywords,
        feedback.bestTopics.length > 0 ? feedback : undefined,
        5
      );

      // Score all candidates across 7 viral dimensions and pick the best
      const candidateTopics = topics.map((t) => t.topic);
      try {
        const best = await pickBestTopic(candidateTopics, activeNicheId, "Both");
        topic = best.topic;
        logger.info(`Viral scorer picked: "${topic}" (score ${best.score}) — ${best.reason}`);
      } catch (scorerErr: any) {
        logger.warn(`Viral scorer failed (${scorerErr.message}), falling back to viralScore sort`);
        topic = topics.sort((a, b) => b.viralScore - a.viralScore)[0]?.topic || niche.topicSeeds[0];
      }
    }
    logger.info(`Topic selected: "${topic}"`);

    // ─── Step 6: Fact-Based Research ──────────────────────────────
    logger.info("[6/13] Running fact-based research agent…");
    let factResearch: VerifiedResearch | null = null;
    let factContent: FactBasedContent | null = null;

    try {
      const researchResult = await fetchVerifiedFacts(topic, niche.label);
      if (!isResearchError(researchResult)) {
        factResearch = researchResult;
        logger.info(`Fact research verified ${factResearch.items.length} items: ${factResearch.items.map(i => i.name).join(", ")}`);

        // ─── Step 7: Generate Fact-Verified Content ───────────────
        logger.info("[7/13] Generating fact-verified content…");
        factContent = await generateFactContent(factResearch, activeNicheId, intelligence);
        logger.info(`Fact content: hook="${factContent.hook}" | ${factContent.script.length} script lines | hookScore=${factContent.hookScore}`);
      } else {
        logger.warn(`[6/13] Fact research returned error: ${researchResult.error} — falling back to standard generation`);
      }
    } catch (err: any) {
      logger.warn(`[6/13] Fact research failed: ${err.message} — falling back to standard generation`);
    }

    // Build the agentScript object (from fact engine or fallback)
    let agentScript: import("./agentBrain").AgentScript;

    if (factContent) {
      // Use fact-verified content
      agentScript = {
        topic: factContent.topic,
        hook: factContent.hook,
        mainScript: factContent.mainScript,
        cta: factContent.cta,
        fullScript: factContent.fullScript,
        ytTitle: factContent.ytTitle,
        ytDescription: factContent.ytDescription,
        ytHashtags: factContent.ytHashtags,
        igCaption: factContent.igCaption,
        igHashtags: factContent.igHashtags,
        hookScore: factContent.hookScore,
      };
      logger.info("Using FACT-VERIFIED content pipeline");
    } else {
      // Fallback: original hook + script generation
      logger.info("[6/13] Generating hooks (fallback)…");
      const hooks = await generateHooks(topic, activeNicheId, "Both", intelligence.psychologyMode);
      const bestHook = hooks[0];
      logger.info(`Best hook (score ${bestHook?.score}): "${bestHook?.hook}"`);

      logger.info("[7/13] Generating retention-optimized script (fallback)…");
      agentScript = await generateAgentScript(topic, activeNicheId, {
        useHookGenerator: false,
        platform: "Both",
        intelligence,
      });

      // Swap in the best hook if it scores higher
      if (bestHook && bestHook.score > (agentScript.hookScore || 0)) {
        agentScript.hook = bestHook.hook;
        agentScript.hookScore = bestHook.score;
        agentScript.fullScript = `${bestHook.hook} ${agentScript.mainScript} ${agentScript.cta}`;
        logger.info("Hook upgraded from dedicated generator");
      }
    }

    // Further optimize if still below threshold
    if (agentScript.hookScore < 75) {
      logger.info("Hook score below 75, running optimizer…");
      const improved = await optimizeHook(agentScript.hook, topic, activeNicheId);
      if (improved.score > agentScript.hookScore) {
        agentScript.hook = improved.hook;
        agentScript.hookScore = improved.score;
        agentScript.fullScript = `${improved.hook} ${agentScript.mainScript} ${agentScript.cta}`;
      }
    }

    // Store script in DB
    const scriptRecord = await prisma.generatedScript.create({
      data: {
        nicheId: nicheDbId,
        topic: agentScript.topic,
        hook: agentScript.hook,
        mainScript: agentScript.mainScript,
        cta: agentScript.cta,
        fullScript: agentScript.fullScript,
        ytTitle: agentScript.ytTitle,
        ytDescription: agentScript.ytDescription,
        ytHashtags: JSON.stringify(agentScript.ytHashtags),
        igCaption: agentScript.igCaption,
        igHashtags: JSON.stringify(agentScript.igHashtags),
        hookScore: agentScript.hookScore,
        status: "generated",
      },
    });

    logger.info(`Script generated: "${topic}" (hook score: ${agentScript.hookScore})`);

    // ─── Step 8: Render Video (TTS + Captions + Assets) ────────
    logger.info("[8/13] Rendering video…");
    logger.info("  [8a] Generating voice-over…");
    const voicePath = await generateVoice(agentScript.fullScript, outputDir);

    logger.info("  [8b] Transcribing for word-level captions…");
    const segments = await transcribeWithWhisper(voicePath, outputDir);
    const captions = groupWordsIntoCaptions(segments, 5);
    logger.info(`Created ${captions.length} timed captions`);

    logger.info("  [8c] Selecting visual strategy + fetching background…");
    const visualStrategy = selectVisualStrategy(
      activeNicheId,
      topic,
      intelligence.psychologyMode
    );
    logger.info(
      `  Visual: mode=${visualStrategy.mode}, intensity=${visualStrategy.motionIntensity}, accent=${visualStrategy.accentColor}`
    );

    const [bgMusicPath, backgroundPath] = await Promise.all([
      fetchBackgroundMusic(topic, outputDir),
      pickBackground(visualStrategy.mode, topic, outputDir),
    ]);

    // ── Resolve background: stock/local → procedural loop → Remotion fallback ──
    let videoPath: string;
    let resolvedBackground = backgroundPath;

    // If no stock/local background, generate a procedural seamless loop
    if (!resolvedBackground) {
      logger.info("  [8d] No stock background — generating procedural loop…");
      try {
        resolvedBackground = await generateProceduralBackground(
          outputDir,
          visualStrategy.mode,
          { dimFactor: 0.35 }
        );
        logger.info(`  → Procedural loop generated: ${path.basename(resolvedBackground)}`);
      } catch (err: any) {
        logger.warn(`  → Procedural generation failed: ${err.message}`);
      }
    }

    if (resolvedBackground) {
      logger.info("  [8d] Hybrid render: motion → captions → audio…");
      const audioDuration = await getAudioDuration(voicePath);
      const processedBg = await composeMotion(
        resolvedBackground,
        audioDuration,
        outputDir,
        {
          intensity: visualStrategy.motionIntensity,
          patternInterruptSec: visualStrategy.patternInterruptSec,
        }
      );
      videoPath = await renderWithCaptions(
        processedBg,
        voicePath,
        captions,
        outputDir,
        {
          bgMusicPath,
          style: { accentColor: visualStrategy.accentColor },
        }
      );
    } else {
      logger.info("  [8d] Remotion fallback render…");
      const scenes = splitScript(agentScript.fullScript);
      videoPath = await renderVideo(scenes, voicePath, outputDir, {
        captions: captions.length > 0 ? captions : undefined,
        bgMusicPath,
      });
    }

    const fileStats = fs.statSync(videoPath);

    // Store rendered video in DB
    const videoRecord = await prisma.renderedVideo.create({
      data: {
        scriptId: scriptRecord.id,
        filePath: videoPath,
        fileSize: fileStats.size,
        voicePath,
        bgMusicPath: bgMusicPath || null,
        captionsJson: JSON.stringify(captions),
        status: "rendered",
      },
    });

    await prisma.generatedScript.update({
      where: { id: scriptRecord.id },
      data: { status: "rendered" },
    });

    logger.info(`Video rendered: ${videoPath} (${(fileStats.size / 1024 / 1024).toFixed(1)} MB)`);

    // ─── Step 9: Upload to Platforms ─────────────────────────
    logger.info("[9/13] Optimizing + uploading to platforms…");
    const optimized = optimizeForAllPlatforms(agentScript, activeNicheId);
    const uploads: PipelineResult["uploads"] = [];

    // Get channel info for platform routing
    const channel = await prisma.channel.findUnique({ where: { id: channelId } });

    // ── Helper: run with timeout ──
    const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)),
      ]);

    // ── Helper: enqueue analytics (no-op without Redis) ──
    const enqueueAnalytics = async (postedVideoDbId: string, platform: "youtube" | "instagram", platformVideoId: string) => {
      if (!isRedisConfigured()) return;
      try {
        const { addAnalyticsFetchJob } = await import("./scheduler");
        await addAnalyticsFetchJob({ postedVideoDbId, platform, platformVideoId, channelId });
      } catch (err: any) {
        logger.warn(`Analytics job skipped: ${err.message}`);
      }
    };

    // ── Upload functions ──
    const uploadYouTube = async () => {
      if (channel?.platform !== "youtube" && channel?.platform) return;
      try {
        logger.info("Uploading to YouTube…");
        const ytUrl = await withTimeout(
          uploadToYouTube(videoPath, optimized.youtube.title, optimized.youtube.description),
          300_000, "YouTube upload"
        );
        const ytVideoId = ytUrl.split("/").pop() || "";
        const postedVideo = await prisma.postedVideo.create({
          data: {
            renderedVideoId: videoRecord.id, channelId, platform: "youtube",
            platformVideoId: ytVideoId, url: ytUrl, status: "published", postedAt: new Date(),
          },
        });
        uploads.push({ platform: "youtube", url: ytUrl, postedVideoDbId: postedVideo.id });
        await enqueueAnalytics(postedVideo.id, "youtube", ytVideoId);
        logger.info(`YouTube upload complete: ${ytUrl}`);
      } catch (err: any) {
        logger.error(`YouTube upload failed: ${err.message}`);
        await prisma.postedVideo.create({
          data: { renderedVideoId: videoRecord.id, channelId, platform: "youtube", status: "failed", errorLog: err.message },
        });
      }
    };

    const uploadInstagram = async () => {
      if (!((channel?.platform === "instagram" || channel?.platform === "youtube") && isInstagramConfigured())) return;
      try {
        logger.info("Uploading to Instagram…");
        let publicVideoUrl = videoPath;
        if (!videoPath.startsWith('http')) {
          try {
            logger.info(`Hosting video temporarily for Instagram ingestion...`);
            publicVideoUrl = await withTimeout(uploadToTempHost(videoPath), 120_000, "Temp hosting");
          } catch (hostErr: any) {
            logger.error(`Failed to host video for Instagram: ${hostErr.message}`);
          }
        }
        const igResult = await withTimeout(
          uploadToInstagram(publicVideoUrl, optimized.instagram.caption),
          300_000, "Instagram upload"
        );
        const postedVideo = await prisma.postedVideo.create({
          data: {
            renderedVideoId: videoRecord.id, channelId, platform: "instagram",
            platformVideoId: igResult.platformVideoId, url: igResult.url, status: "published", postedAt: new Date(),
          },
        });
        uploads.push({ platform: "instagram", url: igResult.url, postedVideoDbId: postedVideo.id });
        await enqueueAnalytics(postedVideo.id, "instagram", igResult.platformVideoId);
        logger.info(`Instagram upload complete: ${igResult.url}`);
      } catch (err: any) {
        logger.error(`Instagram upload failed: ${err.message}`);
      }
    };

    // Run uploads in parallel for speed
    await Promise.allSettled([uploadYouTube(), uploadInstagram()]);

    // ─── Step 10: Retention Scoring ──────────────────────────
    logger.info("[10/13] Scoring content retention…");
    let retentionReport: RetentionReport | null = null;
    try {
      retentionReport = await scoreRetention({
        hook: agentScript.hook,
        script: agentScript.fullScript,
        visual_pacing: `Mode: ${visualStrategy.mode}, Intensity: ${visualStrategy.motionIntensity}, Style: ${visualStrategy.captionStyle}, Accent: ${visualStrategy.accentColor}`,
        cta: agentScript.cta,
        topic,
        niche: activeNicheId,
      });
      logger.info(`Retention score: ${retentionReport.retention_score}/100`);
      if (retentionReport.weak_points.length > 0) {
        logger.info(`Weak points: ${retentionReport.weak_points.join("; ")}`);
      }
      if (retentionReport.recommended_changes_for_next_video.length > 0) {
        logger.info(`Next video improvements: ${retentionReport.recommended_changes_for_next_video.join("; ")}`);
      }
    } catch (err: any) {
      logger.warn(`Retention scoring failed (non-fatal): ${err.message}`);
    }

    // ─── Step 11: Track Analytics ───────────────────────────
    logger.info("[11/13] Enqueuing analytics tracking…");
    // Analytics jobs are already enqueued per-upload above (1hr delay)
    // Log niche usage for rotation engine
    await logNicheUsage(channelId, activeNicheId);

    // ─── Step 12: Feed Performance Back ───────────────────────
    logger.info("[12/13] Backfilling performance data…");
    try {
      await backfillNichePerformance(channelId);
    } catch (err: any) {
      logger.warn("Performance backfill failed (non-fatal)", { error: err.message });
    }

    // ─── Step 13: Log Results ─────────────────────────────
    logger.info("[13/13] Logging final results…");
    await updateJobLog(jobLogId, "completed", {
      topic,
      nicheId: activeNicheId,
      psychologyMode: intelligence.psychologyMode,
      retentionLevel: intelligence.retentionLevel,
      scriptId: scriptRecord.id,
      videoId: videoRecord.id,
      uploads: uploads.map((u) => u.url),
      retentionScore: retentionReport ? {
        score: retentionReport.retention_score,
        breakdown: retentionReport.breakdown,
        weakPoints: retentionReport.weak_points,
        improvements: retentionReport.improvement_suggestions,
        nextVideoChanges: retentionReport.recommended_changes_for_next_video,
      } : null,
      performanceInsights: perfAnalysis ? {
        hookRating: perfAnalysis.hookEffectiveness.rating,
        hookScore: perfAnalysis.hookEffectiveness.score,
        bestNiche: perfAnalysis.bestPerformingNiche.nicheId,
        improvements: perfAnalysis.improvements,
        targetPacing: perfAnalysis.scriptPacingAdjustment.targetRetentionLevel,
        confidence: perfAnalysis.confidenceLevel,
      } : null,
    });

    const result: PipelineResult = {
      scriptDbId: scriptRecord.id,
      renderedVideoDbId: videoRecord.id,
      uploads,
      topic,
      nicheId: activeNicheId,
    };

    logger.info(`═══ Pipeline completed: ${runId} ═══`);
    logger.info(`Topic: "${topic}" | Niche: ${activeNicheId} | Mode: ${intelligence.psychologyMode} | Retention: ${intelligence.retentionLevel} | Uploads: ${uploads.length}`);

    return result;
  } catch (err: any) {
    logger.error(`Pipeline failed: ${err.message}`, { stack: err.stack });
    await updateJobLog(jobLogId, "failed", null, err.message);
    throw err;
  }
}

// ── CLI Entry Point ──────────────────────────────────────────────────

/**
 * Run pipeline from CLI with minimal setup.
 * Usage: npx ts-node src/lib/orchestrator.ts <nicheId> [topic]
 */
async function cliMain() {
  const nicheId = process.argv[2];
  const topicOverride = process.argv[3];

  if (!nicheId || !NICHE_IDS.includes(nicheId)) {
    console.error(`Usage: npx ts-node src/lib/orchestrator.ts <nicheId> [topic]`);
    console.error(`Available niches: ${NICHE_IDS.join(", ")}`);
    process.exit(1);
  }

  // Auto-create a default niche + channel for CLI usage
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: "cli@youinst.local", name: "CLI User" },
    });
  }

  let channel = await prisma.channel.findFirst({ where: { userId: user.id } });
  if (!channel) {
    channel = await prisma.channel.create({
      data: {
        userId: user.id,
        name: "Default Channel",
        platform: "youtube",
      },
    });
  }

  let niche = await prisma.niche.findFirst({
    where: { channelId: channel.id, name: nicheId },
  });
  if (!niche) {
    niche = await prisma.niche.create({
      data: { channelId: channel.id, name: nicheId },
    });
  }

  console.log(`\nYouInst SaaS Pipeline`);
  console.log(`════════════════════════════════════════`);
  console.log(`Niche: ${nicheId} | Channel: ${channel.name}`);
  if (topicOverride) console.log(`Topic: "${topicOverride}"`);
  console.log();

  const result = await runFullPipeline(
    nicheId,
    niche.id,
    channel.id,
    undefined,
    topicOverride
  );

  console.log(`\n════════════════════════════════════════`);
  console.log(`Pipeline complete!`);
  console.log(`   Topic: "${result.topic}"`);
  for (const upload of result.uploads) {
    console.log(`   ${upload.platform}: ${upload.url}`);
  }
  console.log(`════════════════════════════════════════\n`);
}

// Run if called directly
if (require.main === module) {
  cliMain()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\n\u274c Pipeline failed:", err.message);
      process.exit(1);
    });
}
