/**
 * Job Logger — Prisma-only job logging functions
 *
 * Extracted from scheduler.ts so that modules (like orchestrator)
 * can log jobs without triggering Redis/BullMQ connections.
 */
import prisma from "./db";

/**
 * Create a new job log entry in the database.
 */
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

/**
 * Update an existing job log entry.
 */
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
