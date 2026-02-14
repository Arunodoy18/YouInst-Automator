import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const niches = await prisma.niche.findMany({
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
