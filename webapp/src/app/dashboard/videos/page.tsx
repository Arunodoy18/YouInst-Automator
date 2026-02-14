import prisma from "@/lib/prisma";
import { formatNumber, formatDate } from "@/lib/utils";
import { Video, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const videos = await prisma.renderedVideo.findMany({
    include: {
      script: { include: { niche: true } },
      postedVideos: {
        include: {
          analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
          channel: { select: { name: true, platform: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Videos</h2>
        <p className="text-zinc-500 text-sm mt-1">All generated and posted videos</p>
      </div>

      {videos.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Video className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No videos generated yet</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left py-3 px-4">Topic</th>
                <th className="text-left py-3 px-4">Niche</th>
                <th className="text-right py-3 px-4">Hook Score</th>
                <th className="text-left py-3 px-4">Platform</th>
                <th className="text-right py-3 px-4">Views</th>
                <th className="text-right py-3 px-4">Engagement</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Link</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((vid) => {
                const posted = vid.postedVideos[0];
                const analytics = posted?.analytics?.[0];
                const engagement = analytics && analytics.views > 0
                  ? ((analytics.likes + analytics.comments) / analytics.views * 100).toFixed(1)
                  : "—";

                return (
                  <tr key={vid.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-3 px-4 max-w-xs truncate font-medium">
                      {vid.script?.topic || "—"}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{vid.script?.niche?.name || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`${
                        (vid.script?.hookScore ?? 0) >= 80 ? 'text-green-400' :
                        (vid.script?.hookScore ?? 0) >= 60 ? 'text-amber-400' :
                        'text-zinc-400'
                      }`}>
                        {vid.script?.hookScore || "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {posted ? (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          posted.platform === 'youtube' ? 'bg-red-900/30 text-red-400' : 'bg-pink-900/30 text-pink-400'
                        }`}>
                          {posted.platform}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">{analytics ? formatNumber(analytics.views) : "—"}</td>
                    <td className="py-3 px-4 text-right">{engagement}%</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        vid.status === 'rendered' ? 'bg-green-900/50 text-green-400' :
                        vid.status === 'rendering' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-zinc-700 text-zinc-400'
                      }`}>
                        {posted?.status === 'published' ? 'published' : vid.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{formatDate(vid.createdAt)}</td>
                    <td className="py-3 px-4">
                      {posted?.url ? (
                        <a
                          href={posted.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
