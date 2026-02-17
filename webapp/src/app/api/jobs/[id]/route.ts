import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/[id]
 *
 * Poll the status of a pipeline job by its JobLog ID.
 * Returns the current status, timestamps, result, and error info.
 *
 * Used by the dashboard Generate page to show live progress.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const job = await prisma.jobLog.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Parse result JSON if available
    let result = null;
    if (job.result) {
      try {
        result = JSON.parse(job.result);
      } catch {
        result = job.result;
      }
    }

    // Parse payload JSON
    let payload = null;
    if (job.payload) {
      try {
        payload = JSON.parse(job.payload);
      } catch {
        payload = job.payload;
      }
    }

    // Calculate elapsed time
    const startedAt = job.startedAt;
    const completedAt = job.completedAt;
    const elapsedMs = completedAt
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
      : Date.now() - new Date(startedAt).getTime();

    return NextResponse.json({
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      payload,
      result,
      errorLog: job.errorLog,
      attempts: job.attempts,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      elapsedMs,
      elapsedFormatted: formatElapsed(elapsedMs),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}
