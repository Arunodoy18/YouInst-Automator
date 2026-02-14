import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Overall system health check
  const [
    userCount,
    channelCount,
    scriptCount,
    videoCount,
    postedCount,
    jobCount,
    recentJobs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.channel.count(),
    prisma.generatedScript.count(),
    prisma.renderedVideo.count(),
    prisma.postedVideo.count({ where: { status: "published" } }),
    prisma.jobLog.count(),
    prisma.jobLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { id: true, jobType: true, status: true, startedAt: true, completedAt: true },
    }),
  ]);

  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    counts: {
      users: userCount,
      channels: channelCount,
      scripts: scriptCount,
      renderedVideos: videoCount,
      postedVideos: postedCount,
      jobs: jobCount,
    },
    recentJobs,
  });
}
