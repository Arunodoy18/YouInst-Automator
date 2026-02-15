/**
 * Scheduler — BullMQ queue system + cron-based job scheduling
 *
 * Manages:
 * 1. Video generation queues (one per pipeline stage)
 * 2. Cron-based schedule evaluation
 * 3. Job retry and failure handling
 * 4. Queue health monitoring
 */
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import * as cron from "node-cron";
import prisma from "./db";
import logger from "./logger";

// ── Redis Connection ─────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Use a singleton pattern for the Redis connection to avoid multiple connections
let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    // BullMQ requires maxRetriesPerRequest to be null
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, 
      enableReadyCheck: false,
    });
    connection.on("error", (err: any) => logger.error("Redis connection error", { error: err.message }));
    connection.on("connect", () => logger.info("Redis connected"));
  }
  return connection;
}

// ── Queue Definitions ────────────────────────────────────────────────

export const QUEUE_NAMES = {
  TREND_SCAN: "trend-scan",
  SCRIPT_GEN: "script-generation",
  VIDEO_RENDER: "video-render",
  VIDEO_UPLOAD: "video-upload",
  ANALYTICS_FETCH: "analytics-fetch",
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<string, Queue>();

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getRedisConnection() as any, // Cast to any to bypass version mismatch
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      })
    );
  }
  return queues.get(name)!;
}

// ── Job Payload Types ────────────────────────────────────────────────

export interface TrendScanPayload {
  nicheId: string;
  nicheDbId: string;
  seedQueries: string[];
}

export interface ScriptGenPayload {
  nicheId: string;
  nicheDbId: string;
  topic: string;
  channelId: string;
}

export interface VideoRenderPayload {
  scriptDbId: string;
  fullScript: string;
  topic: string;
}

export interface VideoUploadPayload {
  renderedVideoDbId: string;
  channelId: string;
  platform: "youtube" | "instagram";
  title: string;
  description: string;
  caption?: string;
  tags?: string[];
}

export interface AnalyticsFetchPayload {
  postedVideoDbId: string;
  platform: "youtube" | "instagram";
  platformVideoId: string;
  channelId: string;
}

// ── Add Jobs ─────────────────────────────────────────────────────────

export async function addTrendScanJob(payload: TrendScanPayload): Promise<string> {
  const job = await getQueue(QUEUE_NAMES.TREND_SCAN).add("scan", payload, {
    priority: 1,
  });
  logger.info(`Queued trend scan job: ${job.id}`);
  return job.id!;
}

export async function addScriptGenJob(payload: ScriptGenPayload): Promise<string> {
  const job = await getQueue(QUEUE_NAMES.SCRIPT_GEN).add("generate", payload, {
    priority: 2,
  });
  logger.info(`Queued script generation job: ${job.id}`);
  return job.id!;
}

export async function addVideoRenderJob(payload: VideoRenderPayload): Promise<string> {
  // timeout is not a valid JobOption in recent BullMQ versions
  const job = await getQueue(QUEUE_NAMES.VIDEO_RENDER).add("render", payload, {
    priority: 3,
  });
  logger.info(`Queued video render job: ${job.id}`);
  return job.id!;
}

export async function addVideoUploadJob(payload: VideoUploadPayload): Promise<string> {
  const job = await getQueue(QUEUE_NAMES.VIDEO_UPLOAD).add("upload", payload, {
    priority: 4,
  });
  logger.info(`Queued video upload job: ${job.id}`);
  return job.id!;
}

export async function addAnalyticsFetchJob(payload: AnalyticsFetchPayload): Promise<string> {
  const job = await getQueue(QUEUE_NAMES.ANALYTICS_FETCH).add("fetch", payload, {
    priority: 5,
    delay: 3600_000, // Delay 1 hour after posting to let metrics accumulate
  });
  logger.info(`Queued analytics fetch job: ${job.id}`);
  return job.id!;
}

// ── Job Logging ──────────────────────────────────────────────────────

export async function logJob(
  scheduleId: string | null,
  jobType: string,
  status: "running" | "completed" | "failed",
  payload?: any,
  result?: any,
  errorLog?: string
): Promise<string> {
  const log = await prisma.jobLog.create({
    data: {
      scheduleId,
      jobType,
      status,
      payload: payload ? JSON.stringify(payload) : null,
      result: result ? JSON.stringify(result) : null,
      errorLog: errorLog || null,
      completedAt: status !== "running" ? new Date() : null,
    },
  });
  return log.id;
}

export async function updateJobLog(
  jobLogId: string,
  status: "completed" | "failed",
  result?: any,
  errorLog?: string
): Promise<void> {
  await prisma.jobLog.update({
    where: { id: jobLogId },
    data: {
      status,
      result: result ? JSON.stringify(result) : undefined,
      errorLog: errorLog || undefined,
      completedAt: new Date(),
    },
  });
}

// ── Cron-Based Schedule Evaluator ────────────────────────────────────

let cronTask: cron.ScheduledTask | null = null;

/**
 * Start the schedule evaluator — runs every minute,
 * checks for schedules that need to fire, and enqueues jobs.
 */
export function startScheduleEvaluator(): void {
  if (cronTask) return; // Already running

  logger.info("Starting schedule evaluator (cron)...");

  // Run every minute
  cronTask = cron.schedule("* * * * *", async () => {
    try {
      logger.debug("Checking schedules...");
      const pendingSchedules = await prisma.schedule.findMany({
        where: {
          isActive: true,
          nextRun: { lte: new Date() },
        },
      });

      for (const schedule of pendingSchedules) {
        logger.info(`Processing schedule: ${schedule.id} (Niche: ${schedule.nicheId})`);
        
        // Add job
        await addTrendScanJob({
          nicheId: schedule.nicheId,
          nicheDbId: schedule.nicheId, // Using nicheId as dbId for simplicity in MVP if they match
          seedQueries: [], // Will be populated by niche config via rotation engine
        });

        // Update nextRun
        // Simple logic: add 24h. In prod, use cron parser from schedule.cronExpression
        const nextRun = new Date();
        nextRun.setHours(nextRun.getHours() + 24);
        
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: { 
            lastRun: new Date(),
            nextRun 
          }
        });
      }
    } catch (err: any) {
      logger.error("Schedule evaluator error", { error: err.message });
    }
  });
}

export function stopScheduleEvaluator(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info("Schedule evaluator stopped");
  }
}

/**
 * Gracefully shutdown connections
 */
export async function shutdownScheduler(): Promise<void> {
  stopScheduleEvaluator();
  
  await Promise.all(
    Array.from(queues.values()).map(q => q.close())
  );
  
  if (connection) {
    connection.disconnect();
    connection = null;
  }
  
  logger.info("Scheduler shutdown complete");
}
