import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const channels = await prisma.channel.findMany({
    include: {
      _count: { select: { niches: true, postedVideos: true, schedules: true } },
      user: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, platform, userId } = body;

    if (!name || !platform) {
      return NextResponse.json(
        { error: "name and platform are required" },
        { status: 400 }
      );
    }

    // Find or create user
    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user) {
      user = await prisma.user.findFirst();
    }
    if (!user) {
      user = await prisma.user.create({
        data: { email: "api@youinst.local", name: "API User" },
      });
    }

    const channel = await prisma.channel.create({
      data: {
        userId: user.id,
        name,
        platform,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
