import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's channels first
  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const channelIds = channels.map((c) => c.id);

  const niches = await prisma.niche.findMany({
    where: { channelId: { in: channelIds } },
    include: {
      _count: { select: { scripts: true, trendKeywords: true } },
      channel: { select: { name: true, platform: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ niches });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, channelId } = body;

    if (!name || !channelId) {
      return NextResponse.json(
        { error: "name and channelId are required" },
        { status: 400 }
      );
    }

    const niche = await prisma.niche.create({
      data: { name, channelId },
    });

    return NextResponse.json({ niche }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
