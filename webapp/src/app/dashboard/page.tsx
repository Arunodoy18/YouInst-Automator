import prisma from "@/lib/prisma";
import { formatNumber, formatDate } from "@/lib/utils";
import { Video, TrendingUp, Zap, BarChart3, Clock, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    totalVideos,
    totalScripts,
    totalPosted,
    recentJobs,
    topVideos,
    recentScripts,
  ] = await Promise.all([
    prisma.renderedVideo.count(),
    prisma.generatedScript.count(),
    prisma.postedVideo.count({ where: { status: "published" } }),
    prisma.jobLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    prisma.postedVideo.findMany({
      where: { status: "published" },
      include: {
        analytics: { orderBy: { fetchedAt: "desc" }, take: 1 },
        renderedVideo: { include: { script: true } },
      },
      orderBy: { postedAt: "desc" },
      take: 5,
    }),
    prisma.generatedScript.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { niche: true },
    }),
  ]);

  const totalViews = await prisma.analytics.aggregate({ _sum: { views: true } });

  return {
    totalVideos,
    totalScripts,
    totalPosted,
    totalViews: totalViews._sum.views || 0,
    recentJobs,
    topVideos,
    recentScripts,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
    { label: "Total Scripts", value: stats.totalScripts, icon: Zap, color: "text-violet-400" },
    { label: "Videos Rendered", value: stats.totalVideos, icon: Video, color: "text-cyan-400" },
    { label: "Videos Posted", value: stats.totalPosted, icon: CheckCircle, color: "text-green-400" },
    { label: "Total Views", value: formatNumber(stats.totalViews), icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-zinc-500 text-sm mt-1">Overview of your AI content pipeline</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-5 bg-zinc-900 rounded-xl border border-zinc-800"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-500 text-sm">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Scripts */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" />
            Recent Scripts
          </h3>
          <div className="space-y-3">
            {stats.recentScripts.length === 0 ? (
              <p className="text-zinc-500 text-sm">No scripts generated yet</p>
            ) : (
              stats.recentScripts.map((script) => (
                <div key={script.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{script.topic}</p>
                    <p className="text-xs text-zinc-500">
                      {script.niche?.name || "—"} · Hook score: {script.hookScore || "—"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    script.status === 'rendered' ? 'bg-green-900/50 text-green-400' :
                    script.status === 'generated' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>
                    {script.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Recent Jobs
          </h3>
          <div className="space-y-3">
            {stats.recentJobs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No jobs run yet</p>
            ) : (
              stats.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                  <div>
                    <p className="text-sm font-medium">{job.jobType}</p>
                    <p className="text-xs text-zinc-500">{formatDate(job.startedAt)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    job.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                    job.status === 'failed' ? 'bg-red-900/50 text-red-400' :
                    'bg-amber-900/50 text-amber-400'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Top Posted Videos */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Recently Posted Videos
        </h3>
        {stats.topVideos.length === 0 ? (
          <p className="text-zinc-500 text-sm">No videos posted yet. Generate your first video!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-2">Topic</th>
                  <th className="text-left py-2">Platform</th>
                  <th className="text-right py-2">Views</th>
                  <th className="text-right py-2">Likes</th>
                  <th className="text-left py-2">Posted</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.topVideos.map((vid) => {
                  const analytics = vid.analytics[0];
                  return (
                    <tr key={vid.id} className="border-b border-zinc-800/50">
                      <td className="py-3 max-w-xs truncate">
                        {vid.renderedVideo?.script?.topic || "—"}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          vid.platform === 'youtube' ? 'bg-red-900/30 text-red-400' : 'bg-pink-900/30 text-pink-400'
                        }`}>
                          {vid.platform}
                        </span>
                      </td>
                      <td className="py-3 text-right">{formatNumber(analytics?.views || 0)}</td>
                      <td className="py-3 text-right">{formatNumber(analytics?.likes || 0)}</td>
                      <td className="py-3 text-zinc-400">
                        {vid.postedAt ? formatDate(vid.postedAt) : "—"}
                      </td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          vid.status === 'published' ? 'bg-green-900/50 text-green-400' : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {vid.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
