import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Note: In production, this calls the engine's orchestrator.
// For the webapp, we create the DB records and optionally trigger
// the pipeline via the BullMQ queue.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nicheId, topic } = body;

    if (!nicheId) {
      return NextResponse.json({ error: "nicheId is required" }, { status: 400 });
    }

    // Ensure user, channel, and niche exist (auto-create for demo)
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: "dashboard@youinst.local", name: "Dashboard User" },
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

    // Create a job log entry to track the pipeline
    const jobLog = await prisma.jobLog.create({
      data: {
        jobType: "full-pipeline",
        status: "queued",
        payload: JSON.stringify({ nicheId, topic, channelId: channel.id }),
      },
    });

    // In full production mode, this would use BullMQ:
    // await addTrendScanJob({ nicheId, nicheDbId: niche.id, seedQueries: [] });
    //
    // For now, return immediately with job ID for the dashboard to poll.
    // The actual pipeline runs via: npx ts-node src/lib/orchestrator.ts

    return NextResponse.json({
      success: true,
      jobId: jobLog.id,
      message: `Pipeline job queued for niche "${nicheId}"${topic ? ` with topic "${topic}"` : ""}`,
      note: "Run 'npx ts-node src/lib/orchestrator.ts' from the engine to execute, or start the workers with 'npx ts-node src/workers/index.ts'",
      nicheId,
      topic: topic || "AI will select",
      channelId: channel.id,
      nicheDbId: niche.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  // Return recent generation jobs
  const jobs = await prisma.jobLog.findMany({
    where: { jobType: "full-pipeline" },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ jobs });
}
