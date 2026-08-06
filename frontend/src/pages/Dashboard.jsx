import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckSquare,
  Clock,
  ListChecks,
  MapPin,
  Plus,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge, StatusBadge } from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
};

const dayDiff = (iso) => {
  const start = new Date(new Date().toDateString());
  const end = new Date(new Date(iso).toDateString());
  return Math.round((end - start) / 86400000);
};

const dueLabel = (iso) => {
  const d = dayDiff(iso);
  if (d < 0) return { text: `Lewat ${Math.abs(d)} hari`, chip: "--st-overdue" };
  if (d === 0) return { text: "Hari ini", chip: "--st-overdue" };
  if (d === 1) return { text: "Besok", chip: "--st-pending" };
  if (d <= 3) return { text: `${d} hari lagi`, chip: "--st-pending" };
  if (d <= 7) return { text: `${d} hari lagi`, chip: "--st-progress" };
  return { text: `${d} hari lagi`, chip: "--st-done" };
};

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "\u2014";

function KpiCard({ label, value, hint, icon: Icon, tone, testid, onClick }) {
  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:border-foreground/30 hover:bg-muted/40"
      )}
      data-testid={testid}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p
            className={cn("text-base font-semibold tabular-nums", tone === "danger" && "text-destructive")}
          >
            {value}
          </p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}

/** Dashboard — ringkasan harian: KPI, tenggat terdekat, rapat hari ini, aktivitas. */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/dashboard/stats");
      setS(data);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !s)
    return (
      <div className="space-y-6" data-testid="dashboard-loading">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const d = s || {};
  const todayMeetings = d.today_meetings || [];
  const dueSoon = d.due_soon || [];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">
              Halo, {user?.name?.split(" ")[0] || "Rekan"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              {todayMeetings.length
                ? `${todayMeetings.length} rapat hari ini`
                : "Tidak ada rapat hari ini"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} data-testid="dashboard-refresh">
              <RefreshCw className="size-4" /> {ACTION.refresh}
            </Button>
            <Button size="sm" onClick={() => navigate("/tasks/new")} data-testid="btn-dashboard-new-task">
              <Plus className="size-4" /> Tugas Baru
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tugas Aktif"
          value={d.active_tasks ?? 0}
          hint={`${d.on_progress ?? 0} sedang berjalan`}
          icon={CheckSquare}
          testid="stat-active_tasks"
          onClick={() => navigate("/tasks")}
        />
        <KpiCard
          label="Terlambat"
          value={d.overdue_count ?? 0}
          hint="Perlu tindakan segera"
          icon={AlertTriangle}
          tone={d.overdue_count ? "danger" : undefined}
          testid="stat-overdue_count"
          onClick={() => navigate("/tasks")}
        />
        <KpiCard
          label="Menunggu Persetujuan"
          value={d.awaiting_approval ?? 0}
          hint="Item selesai dari PIC"
          icon={ListChecks}
          testid="stat-awaiting_approval"
          onClick={() => navigate("/tasks")}
        />
        <KpiCard
          label="Selesai"
          value={d.completed ?? 0}
          hint={`dari ${d.total_tasks ?? 0} total tugas`}
          icon={CheckSquare}
          testid="stat-completed"
          onClick={() => navigate("/tasks")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tenggat Terdekat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dueSoon.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground" data-testid="due-soon-empty">
                Tidak ada tugas aktif bertenggat. Selamat, meja Anda bersih.
              </p>
            ) : (
              dueSoon.map((t) => {
                const due = dueLabel(t.deadline);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className="flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
                    data-testid={`due-soon-${t.id}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                      <Badge
                        variant="outline"
                        className={due.chip ? "state-chip font-medium" : "font-normal text-muted-foreground"}
                        style={due.chip ? { "--chip": `var(${due.chip})` } : undefined}
                      >
                        {due.text}
                      </Badge>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" /> {fmtDay(t.deadline)}
                      </span>
                      <span className="truncate">{t.pic?.name || "Tanpa PIC"}</span>
                      <Progress value={t.progress} className="h-1.5 w-20" />
                      <span className="tabular-nums">{t.progress}%</span>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate("/tasks")} data-testid="link-all-tasks">
              Lihat semua tugas <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rapat Hari Ini ({todayMeetings.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todayMeetings.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground" data-testid="today-meetings-empty">
                  Tidak ada rapat hari ini.
                </p>
              ) : (
                todayMeetings.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/meetings/${m.id}`)}
                    className="flex w-full items-start gap-3 rounded-md border p-2 text-left transition-colors hover:bg-muted/40"
                    data-testid={`today-meeting-${m.id}`}
                  >
                    <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md border bg-muted/40 py-1 text-xs font-medium tabular-nums">
                      {m.start_time || "--:--"}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium">{m.title}</p>
                      <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                        {m.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" /> {m.location}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Users className="size-3" /> {(m.participants || []).length}
                        </span>
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rapat Mendatang</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(d.upcoming_meetings || []).length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">Tidak ada rapat terjadwal.</p>
              ) : (
                (d.upcoming_meetings || []).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/meetings/${m.id}`)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/40"
                    data-testid={`dashboard-meeting-${m.id}`}
                  >
                    <Video className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.title}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {new Date(m.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                        {m.start_time ? ` · ${m.start_time}` : ""}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate("/calendar")} data-testid="link-calendar">
                Buka Kalender <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beban Kerja PIC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(d.workload || []).length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Belum ada tugas aktif.</p>
            ) : (
              d.workload.map((w) => {
                const max = Math.max(...d.workload.map((x) => x.count), 1);
                return (
                  <div key={w.name} className="space-y-1" data-testid={`workload-${w.name}`}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate">{w.name}</span>
                      <span className="font-semibold tabular-nums">{w.count}</span>
                    </div>
                    <Progress value={(w.count / max) * 100} className="h-1.5" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aktivitas Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="thin-scroll max-h-64 space-y-3 overflow-y-auto pr-1">
              {(d.recent_activity || []).length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">Belum ada aktivitas.</p>
              ) : (
                (d.recent_activity || []).slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.user_name} · {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate("/notifications")} data-testid="link-notifications">
              <Bell className="size-4" /> Notifikasi
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Mingguan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.trend || []} barGap={4}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={22}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 12,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="created" name="Dibuat" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="Selesai" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tugas Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(d.recent_tasks || []).length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Belum ada tugas. Buat tugas pertama Anda.
            </p>
          ) : (
            (d.recent_tasks || []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/tasks/${t.id}`)}
                className="flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/40"
                data-testid={`dashboard-task-${t.id}`}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                <Progress value={t.progress} className="h-1.5 w-24" />
                <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                  {t.progress}%
                </span>
                <StatusBadge status={t.status} />
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
