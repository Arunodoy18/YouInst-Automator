import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aggregate analytics (global for now — multi-tenant analytics scoping can be refined later)
  const totals = await prisma.analytics.aggregate({
    _sum: { views: true, likes: true, comments: true, shares: true },
    _avg: { retention: true, ctr: true },
  });

  const videoCount = await prisma.postedVideo.count({ where: { status: "published" } });
  const scriptCount = await prisma.generatedScript.count();

  // Per-niche stats
  const nicheScripts = await prisma.generatedScript.groupBy({
    by: ["nicheId"],
    _count: true,
  });

  // Recent analytics snapshots
  const recentAnalytics = await prisma.analytics.findMany({
    orderBy: { fetchedAt: "desc" },
    take: 50,
    include: {
      postedVideo: {
        include: {
          renderedVideo: {
            include: {
              script: { select: { topic: true, nicheId: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    totals: {
      views: totals._sum.views || 0,
      likes: totals._sum.likes || 0,
      comments: totals._sum.comments || 0,
      shares: totals._sum.shares || 0,
      avgRetention: totals._avg.retention || 0,
      avgCtr: totals._avg.ctr || 0,
    },
    videoCount,
    scriptCount,
    nicheScripts,
    recentAnalytics,
  });
}
