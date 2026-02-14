import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const schedules = await prisma.schedule.findMany({
    include: {
      channel: { select: { name: true, platform: true } },
      niche: { select: { name: true } },
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, nicheId, cronExpr, timezone, videosPerDay } = body;

    if (!channelId || !nicheId || !cronExpr) {
      return NextResponse.json(
        { error: "channelId, nicheId, and cronExpr are required" },
        { status: 400 }
      );
    }

    const schedule = await prisma.schedule.create({
      data: {
        channelId,
        nicheId,
        cronExpr,
        timezone: timezone || "UTC",
        videosPerDay: videosPerDay || 1,
      },
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
