import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Tv2, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await prisma.channel.findMany({
    include: {
      _count: { select: { niches: true, postedVideos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Channels</h2>
          <p className="text-zinc-500 text-sm mt-1">Manage your YouTube & Instagram channels</p>
        </div>
        <Link
          href="/dashboard/channels/new"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Channel
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Tv2 className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No channels configured yet</p>
          <p className="text-zinc-600 text-sm">Add your YouTube or Instagram channel to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((ch) => (
            <div key={ch.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{ch.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    ch.platform === 'youtube' ? 'bg-red-900/30 text-red-400' : 'bg-pink-900/30 text-pink-400'
                  }`}>
                    {ch.platform}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  ch.status === 'active' ? 'bg-green-900/50 text-green-400' :
                  ch.status === 'paused' ? 'bg-amber-900/50 text-amber-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {ch.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Niches</p>
                  <p className="font-medium">{ch._count.niches}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Videos Posted</p>
                  <p className="font-medium">{ch._count.postedVideos}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 mt-4">Created {formatDate(ch.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
