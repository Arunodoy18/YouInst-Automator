import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const videos = await prisma.renderedVideo.findMany({
    include: {
      script: { include: { niche: { select: { name: true } } } },
      postedVideos: {
        include: {
          analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
          channel: { select: { name: true, platform: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ videos });
}
