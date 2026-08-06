import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Circle,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableCard, SortableHeader } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const TYPE_LABELS = {
  today: "Hari Ini",
  tomorrow: "Besok",
  custom: "Tanggal Khusus",
  recurring: "Berulang",
};
const RECUR_LABELS = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" };
const OFFSET_LABELS = {
  "10m": "10 menit sebelum (default)",
  "1h": "1 jam sebelum",
  "1d": "1 hari sebelum",
  custom: "Waktu khusus",
};
const STATUS_LABELS = { active: "Aktif", done: "Selesai", all: "Semua" };

const emptyForm = {
  title: "",
  description: "",
  remind_type: "custom",
  date: "",
  time: "09:00",
  recurrence: "daily",
  broadcast: false,
  channels: [],
  broadcast_offset: "10m",
  broadcast_custom_date: "",
  broadcast_custom_time: "09:00",
};

const fmtDay = (d) =>
  d
    ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "\u2014";

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ onToggle, onDelete }) => [
  {
    id: "done",
    accessorFn: (r) => (r.done ? 1 : 0),
    header: () => <span className="sr-only">Selesai</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      return (
        <button
          type="button"
          onClick={() => onToggle(r)}
          aria-label={r.done ? "Tandai belum selesai" : "Tandai selesai"}
          data-testid={`reminder-toggle-${r.id}`}
        >
          {r.done ? (
            <CheckCircle2 className="size-4 text-success" />
          ) : (
            <Circle className="size-4 text-muted-foreground" />
          )}
        </button>
      );
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p
          className={cn(
            "max-w-[20rem] truncate font-medium",
            row.original.done && "text-muted-foreground line-through"
          )}
          title={row.original.title}
        >
          {row.original.title}
        </p>
        {row.original.description ? (
          <p className="max-w-[20rem] truncate text-xs text-muted-foreground">
            {row.original.description}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "remind_type",
    header: ({ column }) => <SortableHeader column={column}>Jenis</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {TYPE_LABELS[row.original.remind_type] || "\u2014"}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column}>Tanggal</SortableHeader>,
    cell: ({ row }) => <span className="text-muted-foreground">{fmtDay(row.original.date)}</span>,
  },
  {
    accessorKey: "time",
    header: () => <span>Jam</span>,
    enableSorting: false,
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.time || "\u2014"}</span>,
  },
  {
    accessorKey: "recurrence",
    header: () => <span>Pengulangan</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {RECUR_LABELS[row.original.recurrence] || "\u2014"}
      </span>
    ),
  },
  {
    id: "broadcast",
    accessorFn: (r) => (r.broadcast ? (r.channels || []).join(",") : ""),
    header: () => <span>Broadcast</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      if (!r.broadcast || !(r.channels || []).length)
        return <span className="text-muted-foreground">{"\u2014"}</span>;
      return (
        <div className="flex items-center gap-1">
          {r.channels.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 font-normal">
              {c === "email" ? <Mail className="size-3" /> : <MessageCircle className="size-3" />}
              {c === "email" ? "Email" : "WhatsApp"}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Aksi baris"
              data-testid={`reminder-actions-${row.original.id}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => onDelete(row.original)}
              className="text-destructive focus:text-destructive"
              data-testid={`btn-delete-reminder-${row.original.id}`}
            >
              <Trash2 aria-hidden="true" /> {ACTION.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];

/** Ingatkan Saya — private reminders list (R47) + create dialog. */
export default function Reminders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("active");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reminders", { params: { status, page_size: 200 } });
      setRows(data.items || []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [status, tick]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleChannel = (c) =>
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c],
    }));

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Judul pengingat wajib diisi.");
      return;
    }
    let date = form.date;
    const today = new Date();
    if (form.remind_type === "today") date = today.toISOString().slice(0, 10);
    if (form.remind_type === "tomorrow") {
      today.setDate(today.getDate() + 1);
      date = today.toISOString().slice(0, 10);
    }
    if ((form.remind_type === "custom" || form.remind_type === "recurring") && !date) {
      notify.error("Tanggal pengingat wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/reminders", {
        title: form.title,
        description: form.description,
        remind_type: form.remind_type,
        date,
        time: form.time,
        recurrence: form.remind_type === "recurring" ? form.recurrence : null,
        broadcast: form.broadcast,
        channels: form.broadcast ? form.channels : [],
        broadcast_offset: form.broadcast ? form.broadcast_offset : "10m",
        broadcast_at:
          form.broadcast && form.broadcast_offset === "custom" && form.broadcast_custom_date
            ? `${form.broadcast_custom_date}T${form.broadcast_custom_time}:00`
            : null,
      });
      notify.success("Pengingat dibuat.");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (r) => {
    try {
      await api.put(`/reminders/${r.id}`, { done: !r.done });
      setTick((t) => t + 1);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/reminders/${deleting.id}`);
      notify.success(`Pengingat "${deleting.title}" dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const columns = useMemo(
    () => buildColumns({ onToggle: toggleDone, onDelete: setDeleting }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters = (
    <Select value={status} onValueChange={setStatus}>
      <SelectTrigger
        className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-36"
        data-testid="reminder-status-filter"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6" data-testid="reminders-page">
      <DataTableCard
        title="Ingatkan Saya"
        onRefresh={load}
        refreshTestId="reminders-refresh"
        headerAction={
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
            data-testid="btn-add-reminder"
          >
            <Plus className="size-4" /> {ACTION.add}
          </Button>
        }
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        testid="reminders"
        emptyIcon={Bell}
        emptyTitle="Belum ada pengingat"
        emptyDescription="Buat pengingat agar tidak melewatkan hal penting."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="reminder-dialog">
          <DialogHeader>
            <DialogTitle>Pengingat Baru</DialogTitle>
            <DialogDescription>Atur waktu pengingat dan kanal broadcast bila perlu.</DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="rm-title">Judul</Label>
              <Input
                id="rm-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="reminder-title-input"
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="rm-desc">Deskripsi</Label>
              <Textarea
                id="rm-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="reminder-desc-input"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label>Jenis</Label>
                <Select
                  value={form.remind_type}
                  onValueChange={(v) => setForm({ ...form, remind_type: v })}
                >
                  <SelectTrigger data-testid="reminder-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="rm-time">Jam</Label>
                <Input
                  id="rm-time"
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  data-testid="reminder-time-input"
                />
              </div>
            </div>
            {form.remind_type === "custom" || form.remind_type === "recurring" ? (
              <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="rm-date">
                    {form.remind_type === "recurring" ? "Mulai Tanggal" : "Tanggal"}
                  </Label>
                  <Input
                    id="rm-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    data-testid="reminder-date-input"
                  />
                </div>
                {form.remind_type === "recurring" ? (
                  <div className="space-y-[var(--item-gap)]">
                    <Label>Pengulangan</Label>
                    <Select
                      value={form.recurrence}
                      onValueChange={(v) => setForm({ ...form, recurrence: v })}
                    >
                      <SelectTrigger data-testid="reminder-recurrence-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(RECUR_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Broadcast Pengingat</p>
                  <p className="text-xs text-muted-foreground">
                    Kirim otomatis ke email / WhatsApp Anda saat waktunya tiba.
                  </p>
                </div>
                <Switch
                  checked={form.broadcast}
                  onCheckedChange={(v) => setForm({ ...form, broadcast: v })}
                  data-testid="reminder-broadcast-switch"
                />
              </div>
              {form.broadcast ? (
                <>
                  <div className="flex gap-2">
                    {[
                      { k: "email", label: "Email", icon: Mail },
                      { k: "whatsapp", label: "WhatsApp", icon: MessageCircle },
                    ].map(({ k, label, icon: Icon }) => (
                      <Button
                        key={k}
                        type="button"
                        size="sm"
                        variant={form.channels.includes(k) ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => toggleChannel(k)}
                        data-testid={`reminder-channel-${k}`}
                      >
                        <Icon className="size-4" /> {label}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-[var(--item-gap)]">
                    <Label>Waktu Kirim Broadcast</Label>
                    <Select
                      value={form.broadcast_offset}
                      onValueChange={(v) => setForm({ ...form, broadcast_offset: v })}
                    >
                      <SelectTrigger data-testid="reminder-broadcast-offset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OFFSET_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.broadcast_offset === "custom" ? (
                    <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
                      <div className="space-y-[var(--item-gap)]">
                        <Label htmlFor="rm-bc-date">Tanggal Kirim</Label>
                        <Input
                          id="rm-bc-date"
                          type="date"
                          value={form.broadcast_custom_date}
                          onChange={(e) =>
                            setForm({ ...form, broadcast_custom_date: e.target.value })
                          }
                          data-testid="reminder-broadcast-date"
                        />
                      </div>
                      <div className="space-y-[var(--item-gap)]">
                        <Label htmlFor="rm-bc-time">Jam Kirim</Label>
                        <Input
                          id="rm-bc-time"
                          type="time"
                          value={form.broadcast_custom_time}
                          onChange={(e) =>
                            setForm({ ...form, broadcast_custom_time: e.target.value })
                          }
                          data-testid="reminder-broadcast-time"
                        />
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-reminder">
              <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus pengingat?"
        description={`"${deleting?.title || ""}" akan dihapus permanen.`}
        onConfirm={doDelete}
        testid="reminder-delete-confirm"
      />
    </div>
  );
}
