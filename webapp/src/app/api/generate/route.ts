import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min max for direct execution mode

/**
 * POST /api/generate
 *
 * Triggers the full 13-step autonomous pipeline.
 *
 * Dual-mode execution:
 *   - Redis available → enqueue to BullMQ, workers execute
 *   - Redis unavailable → fire-and-forget direct execution
 *
 * Body: { nicheId: string, topic?: string }
 * Returns: { jobId, status: "running" | "queued" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      nicheId, 
      topic, 
      voiceProfileId, 
      language, 
      visualPreset, 
      hdQuality, 
      psychologyMode, 
      retentionLevel 
    } = body;

    if (!nicheId) {
      return NextResponse.json({ error: "nicheId is required" }, { status: 400 });
    }

    // Get authenticated user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Create job log entry for dashboard polling
    const jobLog = await prisma.jobLog.create({
      data: {
        jobType: "full-pipeline",
        status: "running",
        payload: JSON.stringify({
          nicheId,
          topic,
          channelId: channel.id,
          nicheDbId: niche.id,
          voiceProfileId: voiceProfileId || "raju_hindi",
          language: language || "hindi",
          visualPreset: visualPreset || "auto",
          hdQuality: hdQuality !== false,
          psychologyMode: psychologyMode || "aggressive",
          retentionLevel: retentionLevel || "enhanced",
        }),
      },
    });

    // ── Dual-mode execution ────────────────────────────────────────────
    const redisUrl = process.env.REDIS_URL || "";

    if (redisUrl) {
      // Production mode: enqueue to BullMQ → workers handle it
      try {
        const { addFullPipelineJob } = await import("../../../../../src/lib/scheduler");
        const bullJobId = await addFullPipelineJob({
          nicheId,
          nicheDbId: niche.id,
          channelId: channel.id,
          topic: topic || undefined,
          jobLogId: jobLog.id,
          voiceProfileId: voiceProfileId || "raju_hindi",
          language: language || "hindi",
          visualPreset: visualPreset || undefined,
          hdQuality: hdQuality !== false,
          psychologyMode: psychologyMode || undefined,
          retentionLevel: retentionLevel || undefined,
        });

        if (bullJobId) {
          await prisma.jobLog.update({
            where: { id: jobLog.id },
            data: { status: "queued" },
          });

          return NextResponse.json({
            success: true,
            jobId: jobLog.id,
            mode: "queued",
            status: "queued",
            message: `Pipeline queued (BullMQ job ${bullJobId})`,
            nicheId,
            topic: topic || "AI will select",
          });
        }
      } catch (err: any) {
        console.error("[api/generate] Redis queue failed, falling back to direct:", err.message);
        // Fall through to direct execution
      }
    }

    // Dev mode (or Redis fallback): fire-and-forget direct execution
    const { runFullPipeline } = await import("../../../../../src/lib/orchestrator");

    // Fire and forget — don't await
    runFullPipeline(
      nicheId,
      niche.id,
      channel.id,
      undefined,
      topic || undefined,
      voiceProfileId || "raju_hindi",
      language || undefined,
      {
        visualPreset: visualPreset || undefined,
        hdQuality: hdQuality !== false,
        psychologyMode: psychologyMode || undefined,
        retentionLevel: retentionLevel || undefined,
      }
    )
      .then(async (result) => {
        await prisma.jobLog.update({
          where: { id: jobLog.id },
          data: {
            status: "completed",
            result: JSON.stringify({
              topic: result.topic,
              nicheId: result.nicheId,
              uploads: result.uploads.map((u) => ({ platform: u.platform, url: u.url })),
              scriptDbId: result.scriptDbId,
              renderedVideoDbId: result.renderedVideoDbId,
            }),
            completedAt: new Date(),
          },
        });
      })
      .catch(async (err) => {
        await prisma.jobLog.update({
          where: { id: jobLog.id },
          data: {
            status: "failed",
            errorLog: err.message,
            completedAt: new Date(),
          },
        }).catch(() => {}); // Swallow nested errors
      });

    return NextResponse.json({
      success: true,
      jobId: jobLog.id,
      mode: "direct",
      status: "running",
      message: `Pipeline started directly (no Redis)`,
      nicheId,
      topic: topic || "AI will select",
      voiceProfileId: voiceProfileId || "raju_hindi",
      language: language || "hindi",
      visualPreset: visualPreset || "auto",
      hdQuality: hdQuality !== false,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return recent generation jobs scoped to this user's channels
  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const channelIds = channels.map((c) => c.id);

  const jobs = await prisma.jobLog.findMany({
    where: { jobType: "full-pipeline" },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ jobs });
}
