import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  Clock,
  LifeBuoy,
  ListChecks,
  MapPin,
  Plus,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";
import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge, PRIORITY_META } from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

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
            className={cn(
              "text-base font-semibold tabular-nums",
              tone === "danger" && "text-destructive"
            )}
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

/** Tooltip grafik bertoken (dipakai grafik tiket). */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-2.5 py-1.5 text-xs text-card-foreground shadow-sm">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} tiket</p>
    </div>
  );
}

/** Baris daftar padat — tetap rapi walau isinya ratusan (divide-y + area scroll). */
function ListShell({ children, empty, emptyText, testid }) {
  if (empty)
    return (
      <p className="px-6 py-8 text-center text-muted-foreground" data-testid={`${testid}-empty`}>
        {emptyText}
      </p>
    );
  return (
    <div className="thin-scroll max-h-[26rem] divide-y overflow-y-auto" data-testid={testid}>
      {children}
    </div>
  );
}

/** Dashboard — ringkasan harian: KPI, tenggat terdekat, agenda rapat, tren. */
export default function Dashboard() {
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );

  const d = s || {};
  const todayMeetings = d.today_meetings || [];
  const upcoming = d.upcoming_meetings || [];
  const dueSoon = d.due_soon || [];
  const myTickets = d.my_tickets || [];
  const byCategory = d.tickets_by_category || [];
  const byPriority = (d.tickets_by_priority || []).map((p) => ({
    ...p,
    label: PRIORITY_META[p.label]?.label || p.label,
    chip: PRIORITY_META[p.label]?.chip || "--pr-low",
  }));
  const totalTickets = byCategory.reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          label="Menunggu"
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
        <KpiCard
          label="Tiket"
          value={d.open_tickets ?? 0}
          hint={`${myTickets.length} perlu Anda tangani`}
          icon={LifeBuoy}
          testid="stat-open_tickets"
          onClick={() => navigate("/help-tickets")}
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              Tenggat Terdekat
              <Badge variant="secondary" className="font-normal tabular-nums">
                {dueSoon.length}
              </Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} data-testid="dashboard-refresh">
                <RefreshCw className="size-4" /> {ACTION.refresh}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/tasks/new")}
                data-testid="btn-dashboard-new-task"
              >
                <Plus className="size-4" /> Tugas Baru
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ListShell
              empty={dueSoon.length === 0}
              emptyText="Tidak ada tugas aktif bertenggat. Selamat, meja Anda bersih."
              testid="due-soon"
            >
              {dueSoon.map((t) => {
                const due = dueLabel(t.deadline);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${t.id}`)}
                    className="flex w-full items-center gap-3 px-6 py-2 text-left transition-colors hover:bg-muted/40"
                    data-testid={`due-soon-${t.id}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{t.title}</span>
                      <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                        <CalendarClock className="size-3" aria-hidden="true" />
                        {fmtDay(t.deadline)}
                        {" · "}
                        {t.pic?.name || "Tanpa PIC"}
                      </span>
                    </span>
                    <span className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
                      <Progress value={t.progress} className="h-1.5 flex-1" />
                      <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                        {t.progress}%
                      </span>
                    </span>
                    <span className="hidden w-20 shrink-0 justify-end sm:flex">
                      <PriorityBadge priority={t.priority} />
                    </span>
                    <span className="flex w-[6.5rem] shrink-0 justify-end">
                      <Badge
                        variant="outline"
                        className="state-chip whitespace-nowrap font-medium"
                        style={{ "--chip": `var(${due.chip})` }}
                      >
                        {due.text}
                      </Badge>
                    </span>
                  </button>
                );
              })}
            </ListShell>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/tasks")}
              data-testid="link-all-tasks"
            >
              Lihat semua tugas <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-6">
          {myTickets.length ? (
            <Card data-testid="card-my-tickets">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  Tiket Perlu Ditangani
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {myTickets.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ListShell empty={false} testid="my-tickets">
                  {myTickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/help-tickets/${t.id}`)}
                      className="flex w-full items-center gap-3 px-6 py-2 text-left transition-colors hover:bg-muted/40"
                      data-testid={`dashboard-ticket-${t.id}`}
                    >
                      <LifeBuoy className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{t.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.number} · {t.category}
                          {t.created_by_name ? ` · ${t.created_by_name}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0">
                        <PriorityBadge priority={t.priority} />
                      </span>
                    </button>
                  ))}
                </ListShell>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/help-tickets")}
                  data-testid="link-help-tickets"
                >
                  Semua Tiket <ArrowRight className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Rapat Hari Ini
                <Badge variant="secondary" className="font-normal tabular-nums">
                  {todayMeetings.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ListShell
                empty={todayMeetings.length === 0}
                emptyText="Tidak ada rapat hari ini."
                testid="today-meetings"
              >
                {todayMeetings.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/meetings/${m.id}`)}
                    className="flex w-full items-center gap-3 px-6 py-2 text-left transition-colors hover:bg-muted/40"
                    data-testid={`today-meeting-${m.id}`}
                  >
                    <span className="w-11 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                      {m.start_time || "--:--"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{m.title}</span>
                      <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                        {m.location ? (
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="size-3" aria-hidden="true" /> {m.location}
                          </span>
                        ) : null}
                        <span className="flex items-center gap-1">
                          <Users className="size-3" aria-hidden="true" />
                          {(m.participants || []).length}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </ListShell>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rapat Mendatang</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ListShell
                empty={upcoming.length === 0}
                emptyText="Tidak ada rapat terjadwal."
                testid="upcoming-meetings"
              >
                {upcoming.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => navigate(`/meetings/${m.id}`)}
                    className="flex w-full items-center gap-3 px-6 py-2 text-left transition-colors hover:bg-muted/40"
                    data-testid={`dashboard-meeting-${m.id}`}
                  >
                    <Video className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{m.title}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" aria-hidden="true" />
                        {new Date(m.date).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                        {m.start_time ? ` · ${m.start_time}` : ""}
                      </span>
                    </span>
                  </button>
                ))}
              </ListShell>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/calendar")}
                data-testid="link-calendar"
              >
                Buka Kalender <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tren Mingguan</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
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
              <Bar
                dataKey="created"
                name="Dibuat"
                fill="hsl(var(--muted-foreground))"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="completed"
                name="Selesai"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card data-testid="card-tickets-category">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Tiket Kategori
              <Badge variant="secondary" className="font-normal tabular-nums">
                {totalTickets}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={110}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.08 }} />
                  <Bar
                    dataKey="count"
                    name="Tiket"
                    fill="hsl(var(--muted-foreground))"
                    radius={[0, 3, 3, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[220px] items-center justify-center text-muted-foreground">Belum ada data tiket.</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-tickets-priority">
          <CardHeader>
            <CardTitle className="text-base">Tiket Prioritas</CardTitle>
          </CardHeader>
          <CardContent>
            {totalTickets ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byPriority} margin={{ left: 0, right: 8 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={22}
                  />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "hsl(var(--muted-foreground))", fillOpacity: 0.08 }} />
                  <Bar dataKey="count" name="Tiket" radius={[3, 3, 0, 0]} barSize={36}>
                    {byPriority.map((p) => (
                      <Cell key={p.label} fill={`hsl(var(${p.chip}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-[220px] items-center justify-center text-muted-foreground">Belum ada data tiket.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
