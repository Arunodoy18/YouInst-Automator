import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channels = await prisma.channel.findMany({
    where: { userId: user.id },
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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, platform } = body;

    if (!name || !platform) {
      return NextResponse.json(
        { error: "name and platform are required" },
        { status: 400 }
      );
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
