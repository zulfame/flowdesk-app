import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarRange,
  ClipboardCheck,
  Download,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserSelect from "@/components/UserSelect";
import { DataTableCard, SortableHeader } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { PRIORITY_META } from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const DAY_W = 26;
const NAME_W = 240;
const ROW_H = 36;

/** Category defaults stay monochrome; per-activity `color` is user DATA (E2). */
const CAT = {
  pelaksanaan: { label: "Pelaksanaan", bar: "bg-foreground/70" },
  event: { label: "Event", bar: "bg-foreground" },
  libur: { label: "Hari Libur", bar: "bg-muted-foreground/40" },
};
const STATUSES = ["Rencana", "Proses", "Selesai"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const SWATCHES = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"]; // guard-allow (E2: warna kegiatan = data)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const emptyActivity = {
  name: "",
  section: "",
  pic: null,
  start_date: "",
  end_date: "",
  category: "pelaksanaan",
  color: "",
  status: "Rencana",
  note: "",
};

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function daysBetween(start, end) {
  if (!start || !end) return [];
  const out = [];
  const d = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(e.getTime()) || e < d) return [];
  let guard = 0;
  while (d <= e && guard < 800) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
    guard += 1;
  }
  return out;
}

function autoProgress(a) {
  if (a.status === "Selesai") return 100;
  if (!a.start_date || !a.end_date) return 0;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`);
  const s = new Date(`${a.start_date}T00:00:00`);
  const e = new Date(`${a.end_date}T00:00:00`);
  if (today < s) return 0;
  if (today >= e) return 100;
  return Math.round(((today - s) / (e - s || 1)) * 100);
}

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ editable, onEdit, onDelete, onConvert, onOpenTask }) => [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Kegiatan</SortableHeader>,
    cell: ({ row }) => {
      const a = row.original;
      return (
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2 shrink-0 rounded-full", !a.color && (CAT[a.category]?.bar || CAT.pelaksanaan.bar))}
            style={a.color ? { backgroundColor: a.color } : undefined}
            data-testid={`activity-dot-${a.id}`}
          />
          <span className="block max-w-[18rem] truncate font-medium" title={a.name}>
            {a.name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => <SortableHeader column={column}>Kategori</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {CAT[row.original.category]?.label || row.original.category}
      </Badge>
    ),
  },
  {
    id: "pic",
    accessorFn: (a) => a.pic?.name || "",
    header: ({ column }) => <SortableHeader column={column}>PIC</SortableHeader>,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() || "Tanpa PIC"}</span>
    ),
  },
  {
    accessorKey: "start_date",
    header: ({ column }) => <SortableHeader column={column}>Periode</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.start_date || "?"} {"\u2013"} {row.original.end_date || "?"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant={row.original.status === "Selesai" ? "default" : "secondary"} className="font-normal">
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "progress",
    accessorFn: (a) => autoProgress(a),
    header: ({ column }) => <SortableHeader column={column}>Progres</SortableHeader>,
    cell: ({ row }) => {
      const p = autoProgress(row.original);
      return (
        <div className="flex items-center gap-2">
          <Progress value={p} className="h-1.5 w-16" />
          <span className="w-8 text-right text-xs text-muted-foreground" data-testid={`activity-progress-${row.original.id}`}>
            {p}%
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const a = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`activity-actions-${a.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {a.task_id ? (
                <DropdownMenuItem onClick={() => onOpenTask(a)} data-testid={`link-activity-task-${a.id}`}>
                  <ExternalLink aria-hidden="true" /> Buka Tugas
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => onConvert(a)}
                  disabled={!editable}
                  data-testid={`btn-convert-activity-${a.id}`}
                >
                  <ClipboardCheck aria-hidden="true" /> Buat Tugas
                </DropdownMenuItem>
              )}
              {editable ? (
                <>
                  <DropdownMenuItem onClick={() => onEdit(a)} data-testid={`btn-edit-activity-${a.id}`}>
                    <Pencil aria-hidden="true" /> {ACTION.edit}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(a)}
                    className="text-destructive focus:text-destructive"
                    data-testid={`btn-delete-activity-${a.id}`}
                  >
                    <Trash2 aria-hidden="true" /> {ACTION.delete}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

/** Linimasa Time Schedule — Gantt monokrom + daftar kegiatan (DataTableCard). */
export default function TimeScheduleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actOpen, setActOpen] = useState(false);
  const [actForm, setActForm] = useState(emptyActivity);
  const [editingAct, setEditingAct] = useState(null);
  const [delAct, setDelAct] = useState(null);
  const [convert, setConvert] = useState(null);
  const [convForm, setConvForm] = useState({ pic: null, priority: "Medium", deadline: "" });
  const [metaOpen, setMetaOpen] = useState(false);
  const [meta, setMeta] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/time-schedules/${id}`);
      setS(data);
    } catch (err) {
      notify.error(apiError(err));
      navigate("/time-schedule");
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/users", { params: { all: true } })
      .then(({ data }) => setUsers(data.items || []))
      .catch(() => {});
  }, []);

  const editable = Boolean(s && canManage(user, s));

  const persistActivities = async (activities) => {
    setBusy(true);
    try {
      const { data } = await api.put(`/time-schedules/${id}`, { activities });
      setS(data);
      return true;
    } catch (err) {
      notify.error(apiError(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openAddAct = () => {
    setEditingAct(null);
    setActForm({ ...emptyActivity, section: s?.section || "" });
    setActOpen(true);
  };
  const openEditAct = (a) => {
    setEditingAct(a);
    setActForm({
      name: a.name,
      section: a.section || "",
      pic: a.pic || null,
      start_date: a.start_date || "",
      end_date: a.end_date || "",
      category: a.category || "pelaksanaan",
      color: a.color || "",
      status: a.status || "Rencana",
      note: a.note || "",
    });
    setActOpen(true);
  };

  const saveAct = async () => {
    if (!actForm.name.trim()) {
      notify.error("Nama kegiatan wajib diisi.");
      return;
    }
    if (actForm.start_date && actForm.end_date && actForm.end_date < actForm.start_date) {
      notify.error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }
    const list = [...(s.activities || [])];
    if (editingAct) {
      const i = list.findIndex((x) => x.id === editingAct.id);
      list[i] = { ...editingAct, ...actForm };
    } else list.push({ ...actForm });
    if (await persistActivities(list)) {
      setActOpen(false);
      notify.success("Kegiatan disimpan.");
    }
  };

  const removeAct = async () => {
    const list = (s.activities || []).filter((x) => x.id !== delAct.id);
    if (await persistActivities(list)) {
      setDelAct(null);
      notify.success("Kegiatan dihapus.");
    }
  };

  const doConvert = async () => {
    if (!convForm.pic?.name) {
      notify.error("PIC tugas wajib dipilih.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/time-schedules/${id}/activities/${convert.id}/convert-task`, convForm);
      notify.success("Tugas berhasil dibuat dari kegiatan.");
      setConvert(null);
      await load();
      navigate(`/tasks/${data.task_id}`);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const exportXlsx = async () => {
    try {
      const res = await api.get(`/time-schedules/${id}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(s.title || "time-schedule").replace(/\s/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const openMeta = () => {
    setMeta({
      title: s.title,
      event_name: s.event_name || "",
      section: s.section || "",
      start_date: s.start_date || "",
      end_date: s.end_date || "",
      description: s.description || "",
      holidays: (s.holidays || []).join(", "),
      event_dates: (s.event_dates || []).join(", "),
    });
    setMetaOpen(true);
  };

  const saveMeta = async () => {
    const parse = (str) => (str || "").split(",").map((x) => x.trim()).filter(Boolean);
    setBusy(true);
    try {
      const { data } = await api.put(`/time-schedules/${id}`, {
        title: meta.title,
        event_name: meta.event_name,
        section: meta.section,
        start_date: meta.start_date,
        end_date: meta.end_date,
        description: meta.description,
        holidays: parse(meta.holidays),
        event_dates: parse(meta.event_dates),
      });
      setS(data);
      setMetaOpen(false);
      notify.success("Jadwal diperbarui.");
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () =>
      buildColumns({
        editable,
        onEdit: openEditAct,
        onDelete: setDelAct,
        onConvert: (a) => {
          setConvert(a);
          setConvForm({ pic: a.pic || null, priority: "Medium", deadline: a.end_date || "" });
        },
        onOpenTask: (a) => navigate(`/tasks/${a.task_id}`),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable, navigate]
  );

  if (!s)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );

  const acts = s.activities || [];
  let start = s.start_date;
  let end = s.end_date;
  if (!start || !end) {
    const ds = acts.map((a) => a.start_date).filter(Boolean);
    const de = acts.map((a) => a.end_date).filter(Boolean);
    if (ds.length) start = start || ds.sort()[0];
    if (de.length) end = end || de.sort().slice(-1)[0];
  }
  const days = daysBetween(start, end);
  const holidays = new Set(s.holidays || []);
  const eventDates = new Set(s.event_dates || []);
  const todayKey = ymd(new Date());

  const months = [];
  days.forEach((d) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.count += 1;
    else months.push({ key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, count: 1 });
  });

  return (
    <div className="space-y-6" data-testid="time-schedule-detail-page">
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base">{s.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {[s.event_name, s.section].filter(Boolean).join(" · ") || "Time Schedule"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/time-schedule")} data-testid="btn-back-schedule">
              <ArrowLeft className="size-4" /> {ACTION.back}
            </Button>
            <Button variant="outline" size="sm" onClick={exportXlsx} data-testid="btn-export-schedule">
              <Download className="size-4" /> {ACTION.export}
            </Button>
            {editable ? (
              <>
                <Button variant="outline" size="sm" onClick={openMeta} data-testid="btn-edit-schedule-meta">
                  <Settings2 className="size-4" /> Pengaturan
                </Button>
                <Button size="sm" onClick={openAddAct} data-testid="btn-add-activity">
                  <Plus className="size-4" /> Kegiatan
                </Button>
              </>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Linimasa</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {Object.entries(CAT).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn("h-2.5 w-4 rounded-sm", v.bar)} /> {v.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm border bg-muted" /> Libur / akhir pekan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm bg-accent ring-1 ring-primary/50" /> Hari Event
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-0.5 bg-primary" /> Hari ini
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {days.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground" data-testid="gantt-empty">
              Tentukan Tanggal Mulai & Selesai jadwal (lewat Pengaturan) atau tambahkan kegiatan bertanggal
              untuk menampilkan linimasa.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border" data-testid="gantt-chart">
              <div style={{ minWidth: NAME_W + days.length * DAY_W }}>
                <div className="flex bg-muted/60">
                  <div
                    className="sticky left-0 z-20 shrink-0 border-r bg-muted/60"
                    style={{ width: NAME_W }}
                  />
                  {months.map((m) => (
                    <div
                      key={m.key}
                      className="shrink-0 border-r py-1 text-center text-[11px] font-medium"
                      style={{ width: m.count * DAY_W }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="flex border-t bg-muted/40">
                  <div
                    className="sticky left-0 z-20 flex shrink-0 items-center border-r bg-muted/40 px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    style={{ width: NAME_W }}
                  >
                    Kegiatan
                  </div>
                  {days.map((d, i) => {
                    const key = ymd(d);
                    const wknd = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "shrink-0 border-r py-1.5 text-center text-[10px] text-muted-foreground",
                          (holidays.has(key) || wknd) && "bg-muted",
                          eventDates.has(key) && "bg-accent font-semibold text-accent-foreground",
                          key === todayKey && "border-l-2 border-l-primary font-semibold text-foreground"
                        )}
                        style={{ width: DAY_W }}
                        title={d.toLocaleDateString("id-ID")}
                      >
                        {d.getDate()}
                      </div>
                    );
                  })}
                </div>
                {acts.length === 0 ? (
                  <p className="border-t p-6 text-center text-muted-foreground">
                    Belum ada kegiatan pada jadwal ini.
                  </p>
                ) : (
                  acts.map((a) => (
                    <div key={a.id} className="group flex border-t hover:bg-muted/30" data-testid={`activity-row-${a.id}`}>
                      <div
                        className="sticky left-0 z-10 flex shrink-0 items-center border-r bg-card px-3 group-hover:bg-muted/30"
                        style={{ width: NAME_W, height: ROW_H }}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium" title={a.name}>
                            {a.name}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {a.pic?.name || "Tanpa PIC"}
                            {a.task_id ? " · Tugas dibuat" : ""}
                          </p>
                        </div>
                      </div>
                      {days.map((d, i) => {
                        const key = ymd(d);
                        const wknd = d.getDay() === 0 || d.getDay() === 6;
                        const on = a.start_date && a.end_date && key >= a.start_date && key <= a.end_date;
                        const isStart = key === a.start_date;
                        const isEnd = key === a.end_date;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex shrink-0 items-center border-r px-px",
                              (holidays.has(key) || wknd) && "bg-muted/70",
                              eventDates.has(key) && "bg-accent/60",
                              key === todayKey && "border-l-2 border-l-primary"
                            )}
                            style={{ width: DAY_W, height: ROW_H }}
                          >
                            {on ? (
                              <div
                                className={cn(
                                  "h-4 w-full",
                                  !a.color && (CAT[a.category]?.bar || CAT.pelaksanaan.bar),
                                  isStart && "ml-0.5 rounded-l-full",
                                  isEnd && "mr-0.5 rounded-r-full",
                                  key > todayKey && "opacity-40"
                                )}
                                style={a.color ? { backgroundColor: a.color } : undefined}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DataTableCard
        title={`Daftar Kegiatan (${acts.length})`}
        onRefresh={load}
        refreshTestId="activities-refresh"
        headerAction={
          editable ? (
            <Button size="sm" onClick={openAddAct} data-testid="btn-add-activity-table">
              <Plus className="size-4" /> {ACTION.add}
            </Button>
          ) : null
        }
        columns={columns}
        data={acts}
        loading={false}
        testid="activities"
        emptyIcon={CalendarRange}
        emptyTitle="Belum ada kegiatan"
        emptyDescription="Tambahkan kegiatan untuk mengisi linimasa jadwal ini."
      />

      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="activity-dialog">
          <DialogHeader>
            <DialogTitle>{editingAct ? "Ubah Kegiatan" : "Kegiatan Baru"}</DialogTitle>
            <DialogDescription>Isi detail kegiatan pada linimasa.</DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="act-name">Nama Kegiatan</Label>
              <Input
                id="act-name"
                value={actForm.name}
                onChange={(e) => setActForm({ ...actForm, name: e.target.value })}
                data-testid="activity-name-input"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="act-section">Seksi / Panitia</Label>
                <Input
                  id="act-section"
                  value={actForm.section}
                  onChange={(e) => setActForm({ ...actForm, section: e.target.value })}
                  data-testid="activity-section-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label>PIC</Label>
                <UserSelect
                  users={users}
                  value={actForm.pic}
                  onChange={(v) => setActForm({ ...actForm, pic: v })}
                  placeholder="Pilih PIC..."
                  testid="activity-pic-select"
                />
              </div>
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="act-start">Tanggal Mulai</Label>
                <Input
                  id="act-start"
                  type="date"
                  value={actForm.start_date}
                  onChange={(e) => setActForm({ ...actForm, start_date: e.target.value })}
                  data-testid="activity-start-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="act-end">Tanggal Selesai</Label>
                <Input
                  id="act-end"
                  type="date"
                  value={actForm.end_date}
                  onChange={(e) => setActForm({ ...actForm, end_date: e.target.value })}
                  data-testid="activity-end-input"
                />
              </div>
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label>Kategori</Label>
                <Select value={actForm.category} onValueChange={(v) => setActForm({ ...actForm, category: v })}>
                  <SelectTrigger data-testid="activity-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAT).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label>Status</Label>
                <Select value={actForm.status} onValueChange={(v) => setActForm({ ...actForm, status: v })}>
                  <SelectTrigger data-testid="activity-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label>Warna Bar</Label>
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Warna ${c}`}
                    onClick={() => setActForm({ ...actForm, color: c })}
                    className={cn(
                      "size-6 rounded-full border-2",
                      actForm.color === c ? "border-foreground" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    data-testid={`activity-color-${c}`}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Warna kustom"
                  value={actForm.color || SWATCHES[7]}
                  onChange={(e) => setActForm({ ...actForm, color: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded bg-transparent"
                  data-testid="activity-color-input"
                />
                {actForm.color ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActForm({ ...actForm, color: "" })}
                    data-testid="activity-color-reset"
                  >
                    {ACTION.reset}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">Kosongkan untuk memakai warna kategori.</p>
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="act-note">Catatan</Label>
              <Textarea
                id="act-note"
                rows={2}
                value={actForm.note}
                onChange={(e) => setActForm({ ...actForm, note: e.target.value })}
                data-testid="activity-note-input"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActOpen(false)}>
              <X className="size-4" /> {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={saveAct} disabled={busy} data-testid="btn-save-activity">
              {busy ? ACTION.saving : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(convert)} onOpenChange={(v) => !v && setConvert(null)}>
        <DialogContent className="sm:max-w-md" data-testid="convert-activity-dialog">
          <DialogHeader>
            <DialogTitle>Buat Tugas dari Kegiatan</DialogTitle>
            <DialogDescription>
              Kegiatan "{convert?.name}" akan menjadi tugas yang tertaut ke jadwal ini.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label>PIC Tugas</Label>
              <UserSelect
                users={users}
                value={convForm.pic}
                onChange={(v) => setConvForm({ ...convForm, pic: v })}
                placeholder="Pilih PIC..."
                testid="convert-pic-select"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label>Prioritas</Label>
                <Select value={convForm.priority} onValueChange={(v) => setConvForm({ ...convForm, priority: v })}>
                  <SelectTrigger data-testid="convert-priority-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((k) => (
                      <SelectItem key={k} value={k}>
                        {PRIORITY_META[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="conv-deadline">Tenggat</Label>
                <Input
                  id="conv-deadline"
                  type="date"
                  value={convForm.deadline}
                  onChange={(e) => setConvForm({ ...convForm, deadline: e.target.value })}
                  data-testid="convert-deadline-input"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvert(null)}>
              <X className="size-4" /> {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={doConvert} disabled={busy} data-testid="btn-confirm-convert">
              <ClipboardCheck className="size-4" /> Buat Tugas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="meta-dialog">
          <DialogHeader>
            <DialogTitle>Pengaturan Jadwal</DialogTitle>
            <DialogDescription>Ubah info umum, rentang tanggal, hari libur, dan hari Event.</DialogDescription>
          </DialogHeader>
          {meta ? (
            <DialogBody className="form-dense space-y-[var(--field-gap)]">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meta-title">Judul</Label>
                <Input
                  id="meta-title"
                  value={meta.title}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                  data-testid="meta-title-input"
                />
              </div>
              <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="meta-event">Nama Acara</Label>
                  <Input
                    id="meta-event"
                    value={meta.event_name}
                    onChange={(e) => setMeta({ ...meta, event_name: e.target.value })}
                    data-testid="meta-event-input"
                  />
                </div>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="meta-section">Seksi / Panitia</Label>
                  <Input
                    id="meta-section"
                    value={meta.section}
                    onChange={(e) => setMeta({ ...meta, section: e.target.value })}
                    data-testid="meta-section-input"
                  />
                </div>
              </div>
              <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="meta-start">Tanggal Mulai</Label>
                  <Input
                    id="meta-start"
                    type="date"
                    value={meta.start_date}
                    onChange={(e) => setMeta({ ...meta, start_date: e.target.value })}
                    data-testid="meta-start-input"
                  />
                </div>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="meta-end">Tanggal Selesai</Label>
                  <Input
                    id="meta-end"
                    type="date"
                    value={meta.end_date}
                    onChange={(e) => setMeta({ ...meta, end_date: e.target.value })}
                    data-testid="meta-end-input"
                  />
                </div>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meta-holidays">Hari Libur</Label>
                <Textarea
                  id="meta-holidays"
                  rows={2}
                  value={meta.holidays}
                  onChange={(e) => setMeta({ ...meta, holidays: e.target.value })}
                  placeholder="2026-12-25, 2027-01-01"
                  data-testid="meta-holidays-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meta-events">Hari Event</Label>
                <Textarea
                  id="meta-events"
                  rows={2}
                  value={meta.event_dates}
                  onChange={(e) => setMeta({ ...meta, event_dates: e.target.value })}
                  placeholder="2026-06-25"
                  data-testid="meta-events-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="meta-desc">Deskripsi</Label>
                <Textarea
                  id="meta-desc"
                  rows={2}
                  value={meta.description}
                  onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                  data-testid="meta-desc-input"
                />
              </div>
            </DialogBody>
          ) : null}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMetaOpen(false)}>
              <X className="size-4" /> {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={saveMeta} disabled={busy} data-testid="btn-save-meta">
              {busy ? ACTION.saving : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(delAct)}
        onOpenChange={(v) => !v && setDelAct(null)}
        title="Hapus kegiatan?"
        description={`Kegiatan "${delAct?.name || ""}" akan dihapus dari jadwal ini.`}
        onConfirm={removeAct}
        testid="activity-delete-confirm"
      />
    </div>
  );
}
