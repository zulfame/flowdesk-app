import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatusBadge, ProgressBar } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckSquare, Video, Bell, FileText, TrendingUp, AlertTriangle, Clock, Plus, ArrowRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

const STAT_CARDS = [
  { key: "total_tasks", label: "Total Tugas", icon: CheckSquare, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
  { key: "on_progress", label: "Sedang Berjalan", icon: TrendingUp, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
  { key: "completed", label: "Selesai", icon: CheckSquare, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
  { key: "overdue_count", label: "Terlambat", icon: AlertTriangle, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30" },
];

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const s = stats || {};

  return (
    <div>
      <PageHeader title={`Halo, ${user?.name?.split(" ")[0] || ""} 👋`} subtitle="Berikut ringkasan pekerjaan Anda hari ini.">
        <Button onClick={() => navigate("/tasks/new")} className="rounded-xl" data-testid="btn-dashboard-new-task">
          <Plus className="h-4 w-4 mr-1.5" /> Tugas Baru
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((c) => (
          <Card key={c.key} className="p-5 rounded-2xl border-border shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 transition-all" data-testid={`stat-${c.key}`}>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-bold mt-4 font-heading">{s[c.key] ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{c.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tasks */}
        <Card className="lg:col-span-2 p-6 rounded-2xl shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">Tugas Terbaru</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/tasks")} className="text-primary" data-testid="link-all-tasks">
              Lihat semua <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {(s.recent_tasks || []).length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Belum ada tugas. Buat tugas pertama Anda!</p>}
            {(s.recent_tasks || []).map((t) => (
              <button key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="w-full text-left p-3.5 rounded-xl border border-border hover:bg-secondary/50 transition-colors" data-testid={`dashboard-task-${t.id}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-medium truncate">{t.title}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={t.progress} className="flex-1" />
                  <span className="text-xs text-muted-foreground font-medium w-9 text-right">{t.progress}%</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Upcoming meetings + activity */}
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl shadow-soft">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Video className="h-5 w-5 text-primary" /> Rapat Mendatang</h2>
            <div className="space-y-3">
              {(s.upcoming_meetings || []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada rapat terjadwal.</p>}
              {(s.upcoming_meetings || []).map((m) => (
                <button key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors" data-testid={`dashboard-meeting-${m.id}`}>
                  <div className="h-10 w-10 rounded-xl bg-accent flex flex-col items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.date} {m.start_time || ""}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft">
            <h2 className="text-lg font-semibold mb-4">Aktivitas Terkini</h2>
            <div className="space-y-3">
              {(s.recent_activity || []).slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.user_name} · {timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))}
              {(s.recent_activity || []).length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Belum ada aktivitas.</p>}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6 rounded-2xl shadow-soft">
          <h2 className="text-lg font-semibold mb-4">Beban Kerja PIC</h2>
          {(s.workload || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Belum ada tugas aktif.</p>
          ) : (
            <div className="space-y-3">
              {s.workload.map((w) => {
                const max = Math.max(...s.workload.map((x) => x.count), 1);
                return (
                  <div key={w.name} data-testid={`workload-${w.name}`}>
                    <div className="flex justify-between text-sm mb-1"><span className="truncate">{w.name}</span><span className="font-semibold">{w.count}</span></div>
                    <div className="bg-secondary rounded-full h-2.5 overflow-hidden"><div className="bg-primary h-full rounded-full transition-all" style={{ width: `${(w.count / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-2xl shadow-soft">
          <h2 className="text-lg font-semibold mb-4">Tren Mingguan</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.trend || []} barGap={4}>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={24} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="created" name="Dibuat" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Selesai" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
