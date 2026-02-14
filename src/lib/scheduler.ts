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
import cron from "node-cron";
import prisma from "./db";
import logger from "./logger";

// ── Redis Connection ─────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
    connection.on("error", (err) => logger.error("Redis connection error", { error: err.message }));
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
        connection: getRedisConnection(),
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
  const job = await getQueue(QUEUE_NAMES.VIDEO_RENDER).add("render", payload, {
    priority: 3,
    // Rendering is heavy — longer timeout
    timeout: 600_000, // 10 minutes
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

  logger.info("Starting schedule evaluator (runs every minute)");

  cronTask = cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find active schedules where nextRun is in the past (or null = never run)
      const dueSchedules = await prisma.schedule.findMany({
        where: {
          isActive: true,
          OR: [
            { nextRun: { lte: now } },
            { nextRun: null },
          ],
        },
        include: {
          niche: true,
          channel: true,
        },
      });

      for (const schedule of dueSchedules) {
        logger.info(`Schedule ${schedule.id} is due — enqueuing ${schedule.videosPerDay} video(s)`);

        for (let i = 0; i < schedule.videosPerDay; i++) {
          await addTrendScanJob({
            nicheId: schedule.niche.name,
            nicheDbId: schedule.nicheId,
            seedQueries: [], // Trend engine will use niche config seeds
          });
        }

        // Calculate next run from cron expression
        const nextRun = getNextCronDate(schedule.cronExpr);
        await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            lastRun: now,
            nextRun,
          },
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

// ── Queue Health ─────────────────────────────────────────────────────

export interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export async function getQueueHealth(): Promise<QueueHealth[]> {
  const health: QueueHealth[] = [];

  for (const name of Object.values(QUEUE_NAMES)) {
    const q = getQueue(name);
    const counts = await q.getJobCounts();
    health.push({
      name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    });
  }

  return health;
}

// ── Graceful Shutdown ────────────────────────────────────────────────

export async function shutdownQueues(): Promise<void> {
  stopScheduleEvaluator();
  for (const [name, queue] of queues) {
    await queue.close();
    logger.info(`Queue ${name} closed`);
  }
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function getNextCronDate(cronExpr: string): Date {
  // Parse cron expression to get the next run time
  // node-cron doesn't expose next date, so we compute it manually
  const interval = cron.validate(cronExpr) ? parseCronToMs(cronExpr) : 86400_000;
  return new Date(Date.now() + interval);
}

function parseCronToMs(cronExpr: string): number {
  // Simple cron interval estimation (for scheduling purposes)
  const parts = cronExpr.split(" ");
  if (parts.length < 5) return 86400_000; // Default: 24 hours

  const [minute, hour] = parts;

  // "0 9 * * *" = daily at 9am → 24h interval
  if (hour !== "*" && minute !== "*") return 86400_000;
  // "*/30 * * * *" = every 30min
  if (minute.startsWith("*/")) {
    const mins = parseInt(minute.split("/")[1], 10);
    return mins * 60 * 1000;
  }
  // "0 */2 * * *" = every 2 hours
  if (hour.startsWith("*/")) {
    const hrs = parseInt(hour.split("/")[1], 10);
    return hrs * 3600 * 1000;
  }

  return 86400_000; // Default daily
}
