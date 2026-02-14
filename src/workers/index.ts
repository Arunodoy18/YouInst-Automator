/**
 * BullMQ Workers — Process queued jobs
 *
 * Starts workers for each pipeline stage that listen to their
 * respective queues and call the appropriate module functions.
 *
 * Usage: npx ts-node src/workers/index.ts
 */
import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import {
  getRedisConnection,
  QUEUE_NAMES,
  TrendScanPayload,
  ScriptGenPayload,
  VideoRenderPayload,
  VideoUploadPayload,
  AnalyticsFetchPayload,
  logJob,
  updateJobLog,
  addScriptGenJob,
  addVideoRenderJob,
  addVideoUploadJob,
  startScheduleEvaluator,
  shutdownQueues,
} from "../lib/scheduler";
import { runTrendScan, getBestKeywords } from "../lib/trendEngine";
import { generateAgentScript, generateTopics } from "../lib/agentBrain";
import { getPerformanceFeedback, fetchAndStoreAnalytics } from "../lib/analyticsTracker";
import { runFullPipeline } from "../lib/orchestrator";
import { getNicheConfig } from "../lib/niches";
import prisma from "../lib/db";
import logger from "../lib/logger";

const connection = getRedisConnection();

// ── Trend Scan Worker ────────────────────────────────────────────────

const trendWorker = new Worker<TrendScanPayload>(
  QUEUE_NAMES.TREND_SCAN,
  async (job: Job<TrendScanPayload>) => {
    const { nicheId, nicheDbId, seedQueries } = job.data;
    const logId = await logJob(null, "trend-scan", "running", job.data);

    try {
      const niche = getNicheConfig(nicheId);
      const queries = seedQueries.length > 0 ? seedQueries : niche.topicSeeds.slice(0, 3);
      await runTrendScan(nicheId, queries);

      // Get best keywords and generate a topic
      const keywords = await getBestKeywords(nicheDbId);
      const feedback = await getPerformanceFeedback(nicheDbId);

      const topics = await generateTopics(
        nicheId,
        keywords,
        feedback.bestTopics.length > 0 ? feedback : undefined,
        1
      );

      const topic = topics[0]?.topic || niche.topicSeeds[0];

      // Find a channel for this niche
      const nicheRecord = await prisma.niche.findUnique({
        where: { id: nicheDbId },
        include: { channel: true },
      });

      if (nicheRecord?.channel) {
        // Enqueue script generation
        await addScriptGenJob({
          nicheId,
          nicheDbId,
          topic,
          channelId: nicheRecord.channel.id,
        });
      }

      await updateJobLog(logId, "completed", { topic, keywords });
      return { topic, keywords };
    } catch (err: any) {
      await updateJobLog(logId, "failed", null, err.message);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ── Script Generation Worker ─────────────────────────────────────────

const scriptWorker = new Worker<ScriptGenPayload>(
  QUEUE_NAMES.SCRIPT_GEN,
  async (job: Job<ScriptGenPayload>) => {
    const { nicheId, nicheDbId, topic, channelId } = job.data;
    const logId = await logJob(null, "script-gen", "running", job.data);

    try {
      const agentScript = await generateAgentScript(topic, nicheId);

      // Store in DB
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

      // Enqueue video rendering
      await addVideoRenderJob({
        scriptDbId: scriptRecord.id,
        fullScript: agentScript.fullScript,
        topic: agentScript.topic,
      });

      await updateJobLog(logId, "completed", { scriptId: scriptRecord.id });
      return { scriptId: scriptRecord.id };
    } catch (err: any) {
      await updateJobLog(logId, "failed", null, err.message);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

// ── Video Render Worker ──────────────────────────────────────────────

const renderWorker = new Worker<VideoRenderPayload>(
  QUEUE_NAMES.VIDEO_RENDER,
  async (job: Job<VideoRenderPayload>) => {
    const { scriptDbId, fullScript, topic } = job.data;
    const logId = await logJob(null, "video-render", "running", job.data);

    try {
      // Import rendering modules
      const { generateVoice } = await import("../lib/tts");
      const { transcribeWithWhisper, groupWordsIntoCaptions } = await import("../lib/whisper");
      const { fetchBackgroundMusic } = await import("../lib/pixabay");
      const { fetchStockVideo } = await import("../lib/stockVideo");
      const { renderVideo } = await import("../lib/videoRenderer");
      const { splitScript } = await import("../lib/scriptSplitter");

      const outputDir = require("path").resolve(__dirname, `../../output/render-${Date.now()}`);
      require("fs").mkdirSync(outputDir, { recursive: true });

      // TTS
      const voicePath = await generateVoice(fullScript, outputDir);

      // Whisper
      const segments = await transcribeWithWhisper(voicePath, outputDir);
      const captions = groupWordsIntoCaptions(segments, 5);

      // Background assets
      const [bgMusicPath, stockVideoPath] = await Promise.all([
        fetchBackgroundMusic(topic, outputDir),
        fetchStockVideo(topic, outputDir),
      ]);

      // Render
      const scenes = splitScript(fullScript);
      const videoPath = await renderVideo(scenes, voicePath, outputDir, {
        captions: captions.length > 0 ? captions : undefined,
        bgMusicPath,
      });

      const fs = require("fs");
      const fileStats = fs.statSync(videoPath);

      // Store in DB
      const videoRecord = await prisma.renderedVideo.create({
        data: {
          scriptId: scriptDbId,
          filePath: videoPath,
          fileSize: fileStats.size,
          voicePath,
          bgMusicPath: bgMusicPath || null,
          captionsJson: JSON.stringify(captions),
          status: "rendered",
        },
      });

      await prisma.generatedScript.update({
        where: { id: scriptDbId },
        data: { status: "rendered" },
      });

      // Find channel to upload
      const script = await prisma.generatedScript.findUnique({
        where: { id: scriptDbId },
        include: { niche: { include: { channel: true } } },
      });

      if (script?.niche?.channel) {
        const { optimizeForAllPlatforms } = await import("../lib/platformOptimizer");
        const optimized = optimizeForAllPlatforms(
          {
            topic: script.topic,
            hook: script.hook,
            mainScript: script.mainScript,
            cta: script.cta,
            fullScript: script.fullScript,
            ytTitle: script.ytTitle || "",
            ytDescription: script.ytDescription || "",
            ytHashtags: JSON.parse(script.ytHashtags || "[]"),
            igCaption: script.igCaption || "",
            igHashtags: JSON.parse(script.igHashtags || "[]"),
            hookScore: script.hookScore || 0,
          },
          script.niche.name
        );

        await addVideoUploadJob({
          renderedVideoDbId: videoRecord.id,
          channelId: script.niche.channel.id,
          platform: script.niche.channel.platform as "youtube" | "instagram",
          title: optimized.youtube.title,
          description: optimized.youtube.description,
          caption: optimized.instagram.caption,
          tags: optimized.youtube.tags,
        });
      }

      await updateJobLog(logId, "completed", { videoId: videoRecord.id, path: videoPath });
      return { videoId: videoRecord.id };
    } catch (err: any) {
      await updateJobLog(logId, "failed", null, err.message);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

// ── Video Upload Worker ──────────────────────────────────────────────

const uploadWorker = new Worker<VideoUploadPayload>(
  QUEUE_NAMES.VIDEO_UPLOAD,
  async (job: Job<VideoUploadPayload>) => {
    const { renderedVideoDbId, channelId, platform, title, description, caption, tags } = job.data;
    const logId = await logJob(null, "video-upload", "running", job.data);

    try {
      const video = await prisma.renderedVideo.findUnique({
        where: { id: renderedVideoDbId },
      });

      if (!video) throw new Error(`Rendered video ${renderedVideoDbId} not found`);

      let platformVideoId = "";
      let url = "";

      if (platform === "youtube") {
        const { uploadToYouTube } = await import("../lib/youtube");
        url = await uploadToYouTube(video.filePath, title, description);
        platformVideoId = url.split("/").pop() || "";
      } else if (platform === "instagram") {
        const { uploadToInstagram, isInstagramConfigured } = await import("../lib/instagram");
        if (isInstagramConfigured()) {
          const result = await uploadToInstagram(video.filePath, caption || description);
          platformVideoId = result.platformVideoId;
          url = result.url;
        }
      }

      // Record posted video
      if (url) {
        const posted = await prisma.postedVideo.create({
          data: {
            renderedVideoId: renderedVideoDbId,
            channelId,
            platform,
            platformVideoId,
            url,
            status: "published",
            postedAt: new Date(),
          },
        });

        // Enqueue analytics fetch
        const { addAnalyticsFetchJob } = await import("../lib/scheduler");
        await addAnalyticsFetchJob({
          postedVideoDbId: posted.id,
          platform,
          platformVideoId,
          channelId,
        });
      }

      await updateJobLog(logId, "completed", { platform, url });
      return { platform, url };
    } catch (err: any) {
      await updateJobLog(logId, "failed", null, err.message);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// ── Analytics Fetch Worker ───────────────────────────────────────────

const analyticsWorker = new Worker<AnalyticsFetchPayload>(
  QUEUE_NAMES.ANALYTICS_FETCH,
  async (job: Job<AnalyticsFetchPayload>) => {
    const { postedVideoDbId } = job.data;
    const logId = await logJob(null, "analytics-fetch", "running", job.data);

    try {
      await fetchAndStoreAnalytics(postedVideoDbId);
      await updateJobLog(logId, "completed", { postedVideoDbId });
      return { success: true };
    } catch (err: any) {
      await updateJobLog(logId, "failed", null, err.message);
      throw err;
    }
  },
  { connection, concurrency: 3 }
);

// ── Worker Event Handlers ────────────────────────────────────────────

const workers = [trendWorker, scriptWorker, renderWorker, uploadWorker, analyticsWorker];

for (const worker of workers) {
  worker.on("completed", (job) => {
    logger.info(`Job ${job.id} completed on queue ${job.queueName}`);
  });
  worker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed on queue ${job?.queueName}: ${err.message}`);
  });
}

// ── Start Workers + Schedule Evaluator ───────────────────────────────

logger.info("All workers started. Listening for jobs…");
logger.info(`Queues: ${Object.values(QUEUE_NAMES).join(", ")}`);

// Start the cron-based schedule evaluator
startScheduleEvaluator();

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("Shutting down workers…");
  for (const worker of workers) {
    await worker.close();
  }
  await shutdownQueues();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down…");
  for (const worker of workers) {
    await worker.close();
  }
  await shutdownQueues();
  process.exit(0);
});
