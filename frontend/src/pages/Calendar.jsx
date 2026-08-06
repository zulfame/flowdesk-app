import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Video,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/composite/EmptyState";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * Monochrome event styling: type is distinguished by fill/outline, never hue
 * (R05). Solid = rapat, outline = tenggat tugas, muted = pengingat/acara.
 */
const TYPE_META = {
  meeting: {
    label: "Rapat",
    icon: Video,
    chip: "bg-primary text-primary-foreground",
    badge: "default",
  },
  task: {
    label: "Tenggat Tugas",
    icon: CheckSquare,
    chip: "border border-foreground/40 bg-background text-foreground",
    badge: "outline",
  },
  reminder: {
    label: "Pengingat",
    icon: Bell,
    chip: "bg-muted text-muted-foreground",
    badge: "secondary",
  },
  event: {
    label: "Acara",
    icon: CalendarDays,
    chip: "border border-dashed border-foreground/40 bg-background text-muted-foreground",
    badge: "outline",
  },
};

const metaOf = (type) => TYPE_META[type] || TYPE_META.event;
const iso = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const longDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString("id-ID", { dateStyle: "full" });
};

/**
 * Calendar — month grid of meetings, task deadlines and reminders.
 * Card wrapper + toolbar (month nav & type filter) + monochrome day grid;
 * a day cell opens a dialog listing its full agenda.
 */
export default function Calendar() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [openDay, setOpenDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/calendar");
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const todayIso = useMemo(() => {
    const now = new Date();
    return iso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const visible = useMemo(
    () => (typeFilter === "all" ? events : events.filter((e) => e.type === typeFilter)),
    [events, typeFilter]
  );

  const byDate = useMemo(() => {
    const map = new Map();
    visible.forEach((event) => {
      const key = (event.date || "").slice(0, 10);
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [visible]);

  const cells = useMemo(() => {
    const leading = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const list = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= days; day += 1) list.push(day);
    return list;
  }, [year, month]);

  const monthCount = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return visible.filter((e) => (e.date || "").startsWith(prefix)).length;
  }, [visible, year, month]);

  const openDayEvents = openDay ? byDate.get(openDay) || [] : [];

  return (
    <div className="space-y-6" data-testid="calendar-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base" data-testid="calendar-title">
              {MONTHS[month]} {year}
            </CardTitle>
            <Badge variant="secondary" className="font-normal" data-testid="calendar-count">
              {monthCount} agenda
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrent(new Date(year, month - 1, 1))}
              aria-label="Bulan sebelumnya"
              data-testid="btn-prev-month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrent(new Date())}
              data-testid="btn-today"
            >
              <CalendarDays className="size-4" /> Hari Ini
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setCurrent(new Date(year, month + 1, 1))}
              aria-label="Bulan berikutnya"
              data-testid="btn-next-month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className={cn("size-3 rounded-sm", meta.chip)} aria-hidden="true" />
                  {meta.label}
                </span>
              ))}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger
                className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
                data-testid="calendar-type-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Agenda</SelectItem>
                {Object.entries(TYPE_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div
              className="flex h-64 items-center justify-center rounded-md border"
              data-testid="calendar-loading"
            >
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-7 border-b bg-muted/50">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1.5 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={`blank-${index}`}
                        className="min-h-[72px] border-b border-r bg-muted/20 last:border-r-0 sm:min-h-[96px]"
                      />
                    );
                  }
                  const dateStr = iso(year, month, day);
                  const dayEvents = byDate.get(dateStr) || [];
                  const isToday = dateStr === todayIso;
                  return (
                    <button
                      type="button"
                      key={dateStr}
                      onClick={() => dayEvents.length && setOpenDay(dateStr)}
                      className={cn(
                        "min-h-[72px] border-b border-r p-1 text-left align-top transition-colors last:border-r-0 sm:min-h-[96px] sm:p-1.5",
                        dayEvents.length ? "hover:bg-accent" : "cursor-default",
                        isToday && "bg-accent/40"
                      )}
                      data-testid={`calendar-day-${day}`}
                    >
                      <span
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded text-xs",
                          isToday
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {day}
                      </span>
                      <span className="mt-1 block space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={`${event.type}-${event.id}`}
                            className={cn(
                              "block truncate rounded px-1 py-0.5 text-[11px] leading-4",
                              metaOf(event.type).chip
                            )}
                            title={event.title}
                            data-testid={`calendar-event-${event.id}`}
                          >
                            {event.title}
                          </span>
                        ))}
                        {dayEvents.length > 2 ? (
                          <span className="block px-1 text-[11px] text-muted-foreground">
                            +{dayEvents.length - 2} lagi
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && monthCount === 0 ? (
            <EmptyState
              variant="no-data"
              icon={CalendarDays}
              title="Tidak ada agenda bulan ini"
              description="Rapat, tenggat tugas, dan pengingat akan tampil otomatis di kalender."
              testid="calendar-empty-state"
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(openDay)} onOpenChange={(open) => !open && setOpenDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{openDay ? longDate(openDay) : ""}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="divide-y rounded-md border" data-testid="calendar-day-agenda">
              {openDayEvents.map((event) => {
                const meta = metaOf(event.type);
                const Icon = meta.icon;
                return (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium" title={event.title}>
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meta.label}
                          {event.time ? ` \u00b7 ${event.time}` : ""}
                        </p>
                      </div>
                    </div>
                    {event.link ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(event.link)}
                        data-testid={`btn-open-event-${event.id}`}
                      >
                        <ArrowUpRight className="size-4" /> Buka
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenDay(null)}>
              <X className="size-4" /> {ACTION.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
