import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's channels to scope videos
  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const channelIds = channels.map((c) => c.id);

  const videos = await prisma.renderedVideo.findMany({
    where: {
      script: { niche: { channelId: { in: channelIds } } },
    },
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
