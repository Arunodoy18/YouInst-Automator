/**
 * Scheduler — BullMQ queue system + cron-based job scheduling
 *
 * Manages:
 * 1. Video generation queues (one per pipeline stage)
 * 2. Cron-based schedule evaluation
 * 3. Job retry and failure handling
 * 4. Queue health monitoring
 *
 * Redis is OPTIONAL — when REDIS_URL is not set or Redis is unreachable,
 * all queue functions gracefully no-op. The pipeline runs synchronously.
 */
import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import * as cron from "node-cron";
import prisma from "./db";
import logger from "./logger";

// ── Redis Connection (fully lazy — no connection on module load) ─────

const REDIS_URL = process.env.REDIS_URL || "";

let connection: IORedis | null = null;
let redisAvailable = false;
let redisChecked = false;

/**
 * Returns true if REDIS_URL is configured.
 */
export function isRedisConfigured(): boolean {
  return !!REDIS_URL;
}

/**
 * Check if Redis is actually reachable. Caches the result.
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (!isRedisConfigured()) return false;
  if (redisChecked) return redisAvailable;

  try {
    const testConn = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 3000,
      retryStrategy() { return null; }, // No retries for test
    });
    await testConn.connect();
    await testConn.ping();
    testConn.disconnect();
    redisAvailable = true;
  } catch {
    redisAvailable = false;
  }
  redisChecked = true;
  return redisAvailable;
}

export function getRedisConnection(): IORedis {
  if (!connection) {
    if (!REDIS_URL) throw new Error("REDIS_URL not configured");
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,          // NO auto-connect on construction
      retryStrategy(times: number) {
        if (times > 3) return null;
        return Math.min(times * 500, 2000);
      },
    });
    connection.on("error", (err: any) => {
      if ((connection as any)?.__errorLogged) return;
      if (connection) (connection as any).__errorLogged = true;
      logger.error("Redis connection error", { error: err.message });
    });
    connection.on("connect", () => {
      if (connection) (connection as any).__errorLogged = false;
      logger.info("Redis connected");
    });
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

// ── Add Jobs (all guard against missing Redis) ──────────────────────

export async function addTrendScanJob(payload: TrendScanPayload): Promise<string | null> {
  if (!isRedisConfigured()) { logger.debug("Redis not configured, skipping trend scan queue"); return null; }
  const job = await getQueue(QUEUE_NAMES.TREND_SCAN).add("scan", payload, { priority: 1 });
  logger.info(`Queued trend scan job: ${job.id}`);
  return job.id!;
}

export async function addScriptGenJob(payload: ScriptGenPayload): Promise<string | null> {
  if (!isRedisConfigured()) { logger.debug("Redis not configured, skipping script gen queue"); return null; }
  const job = await getQueue(QUEUE_NAMES.SCRIPT_GEN).add("generate", payload, { priority: 2 });
  logger.info(`Queued script generation job: ${job.id}`);
  return job.id!;
}

export async function addVideoRenderJob(payload: VideoRenderPayload): Promise<string | null> {
  if (!isRedisConfigured()) { logger.debug("Redis not configured, skipping video render queue"); return null; }
  const job = await getQueue(QUEUE_NAMES.VIDEO_RENDER).add("render", payload, { priority: 3 });
  logger.info(`Queued video render job: ${job.id}`);
  return job.id!;
}

export async function addVideoUploadJob(payload: VideoUploadPayload): Promise<string | null> {
  if (!isRedisConfigured()) { logger.debug("Redis not configured, skipping video upload queue"); return null; }
  const job = await getQueue(QUEUE_NAMES.VIDEO_UPLOAD).add("upload", payload, { priority: 4 });
  logger.info(`Queued video upload job: ${job.id}`);
  return job.id!;
}

export async function addAnalyticsFetchJob(payload: AnalyticsFetchPayload): Promise<string | null> {
  if (!isRedisConfigured()) { logger.debug("Redis not configured, skipping analytics queue"); return null; }
  const job = await getQueue(QUEUE_NAMES.ANALYTICS_FETCH).add("fetch", payload, {
    priority: 5,
    delay: 3600_000,
  });
  logger.info(`Queued analytics fetch job: ${job.id}`);
  return job.id!;
}

// ── Job Logging (re-exported from jobLogger for backward compatibility) ──

export { logJob, updateJobLog } from "./jobLogger";

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
