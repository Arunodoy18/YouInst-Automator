import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Calendar, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const schedules = await prisma.schedule.findMany({
    include: {
      channel: { select: { name: true, platform: true } },
      niche: { select: { name: true } },
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedules</h2>
          <p className="text-zinc-500 text-sm mt-1">Automated content generation schedules (BullMQ + cron)</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <Calendar className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No schedules configured</p>
          <p className="text-zinc-600 text-sm">Create a schedule to automate daily video generation</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800 bg-zinc-900/50">
                <th className="text-left py-3 px-4">Channel</th>
                <th className="text-left py-3 px-4">Niche</th>
                <th className="text-left py-3 px-4">Cron</th>
                <th className="text-left py-3 px-4">Timezone</th>
                <th className="text-right py-3 px-4">Videos/Day</th>
                <th className="text-left py-3 px-4">Last Run</th>
                <th className="text-left py-3 px-4">Next Run</th>
                <th className="text-right py-3 px-4">Jobs</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-3 px-4 font-medium">{s.channel?.name || "—"}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.niche?.name || "—"}</td>
                  <td className="py-3 px-4">
                    <code className="text-xs bg-zinc-800 px-2 py-1 rounded">{s.cronExpr}</code>
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{s.timezone}</td>
                  <td className="py-3 px-4 text-right">{s.videosPerDay}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.lastRun ? formatDate(s.lastRun) : "Never"}</td>
                  <td className="py-3 px-4 text-zinc-400">{s.nextRun ? formatDate(s.nextRun) : "—"}</td>
                  <td className="py-3 px-4 text-right">{s._count.jobs}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      s.isActive ? 'bg-green-900/50 text-green-400' : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {s.isActive ? "active" : "paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Info */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="font-semibold mb-3">How Scheduling Works</h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-zinc-400">
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="font-medium text-zinc-200 mb-1">1. Cron Expression</p>
            <p>Define when videos generate using standard cron syntax. E.g. <code className="text-xs bg-zinc-800 px-1">0 9 * * *</code> = daily at 9am</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="font-medium text-zinc-200 mb-1">2. BullMQ Queue</p>
            <p>Jobs are queued in Redis and processed by dedicated workers with retry logic and failure handling.</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg">
            <p className="font-medium text-zinc-200 mb-1">3. Full Pipeline</p>
            <p>Each job triggers: Trend Scan → Script → TTS → Whisper → Render → Upload automatically.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
