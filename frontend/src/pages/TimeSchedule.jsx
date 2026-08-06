import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange, Eye, MoreHorizontal, Pencil, Plus, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableCard, SortableHeader } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { ACTION } from "@/constants/labels";

const emptyForm = {
  title: "",
  event_name: "",
  section: "",
  description: "",
  start_date: "",
  end_date: "",
};

const fmtDay = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "\u2014";

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ user, onOpen, onEdit, onDelete }) => [
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onOpen(row.original)}
        className="block max-w-[20rem] truncate text-left font-medium hover:underline"
        title={row.original.title}
        data-testid={`schedule-title-${row.original.id}`}
      >
        {row.original.title}
      </button>
    ),
  },
  {
    accessorKey: "event_name",
    header: ({ column }) => <SortableHeader column={column}>Acara</SortableHeader>,
    cell: ({ row }) => (
      <span className="block max-w-[14rem] truncate text-muted-foreground">
        {row.original.event_name || "\u2014"}
      </span>
    ),
  },
  {
    accessorKey: "section",
    header: ({ column }) => <SortableHeader column={column}>Seksi</SortableHeader>,
    cell: ({ row }) =>
      row.original.section ? (
        <Badge variant="outline" className="font-normal">
          {row.original.section}
        </Badge>
      ) : (
        <span className="text-muted-foreground">{"\u2014"}</span>
      ),
  },
  {
    accessorKey: "start_date",
    header: ({ column }) => <SortableHeader column={column}>Periode</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {fmtDay(row.original.start_date)} {"\u2013"} {fmtDay(row.original.end_date)}
      </span>
    ),
  },
  {
    id: "activities",
    accessorFn: (s) => (s.activities || []).length,
    header: ({ column }) => <SortableHeader column={column}>Kegiatan</SortableHeader>,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()} kegiatan</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const s = row.original;
      const manage = canManage(user, s);
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`schedule-actions-${s.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onOpen(s)} data-testid={`btn-detail-schedule-${s.id}`}>
                <Eye aria-hidden="true" /> {ACTION.detail}
              </DropdownMenuItem>
              {manage ? (
                <>
                  <DropdownMenuItem onClick={() => onEdit(s)} data-testid={`btn-edit-schedule-${s.id}`}>
                    <Pencil aria-hidden="true" /> {ACTION.edit}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(s)}
                    className="text-destructive focus:text-destructive"
                    data-testid={`btn-delete-schedule-${s.id}`}
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

/** Time Schedule — schedule list (R47); timeline (Gantt) lives on the detail page. */
export default function TimeSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/time-schedules");
      setRows(data || []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      title: s.title || "",
      event_name: s.event_name || "",
      section: s.section || "",
      description: s.description || "",
      start_date: s.start_date || "",
      end_date: s.end_date || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Judul jadwal wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (editing) await api.put(`/time-schedules/${editing.id}`, form);
      else await api.post("/time-schedules", form);
      notify.success("Jadwal disimpan.");
      setOpen(false);
      load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/time-schedules/${deleting.id}`);
      notify.success(`Jadwal "${deleting.title}" dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const columns = useMemo(
    () =>
      buildColumns({
        user,
        onOpen: (s) => navigate(`/time-schedule/${s.id}`),
        onEdit: openEdit,
        onDelete: setDeleting,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, navigate]
  );

  return (
    <div className="space-y-6" data-testid="time-schedule-page">
      <DataTableCard
        title="Time Schedule"
        onRefresh={load}
        refreshTestId="schedules-refresh"
        headerAction={
          <Button size="sm" onClick={openNew} data-testid="btn-add-schedule">
            <Plus className="size-4" /> {ACTION.add}
          </Button>
        }
        columns={columns}
        data={rows}
        loading={loading}
        testid="schedules"
        emptyIcon={CalendarRange}
        emptyTitle="Belum ada jadwal"
        emptyDescription="Buat time schedule untuk memetakan kegiatan dari awal hingga hari-H."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="schedule-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Jadwal" : "Jadwal Baru"}</DialogTitle>
            <DialogDescription>
              Isi informasi umum jadwal. Kegiatan ditambahkan di halaman linimasa.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="ts-title">Judul Jadwal</Label>
              <Input
                id="ts-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="mis. TS Dekorasi & Dokumentasi"
                data-testid="schedule-title-input"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="ts-event">Nama Acara</Label>
                <Input
                  id="ts-event"
                  value={form.event_name}
                  onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                  data-testid="schedule-event-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="ts-section">Seksi / Panitia</Label>
                <Input
                  id="ts-section"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  data-testid="schedule-section-input"
                />
              </div>
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="ts-start">Tanggal Mulai</Label>
                <Input
                  id="ts-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  data-testid="schedule-start-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="ts-end">Tanggal Selesai</Label>
                <Input
                  id="ts-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  data-testid="schedule-end-input"
                />
              </div>
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="ts-desc">Deskripsi</Label>
              <Textarea
                id="ts-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid="schedule-desc-input"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-schedule">
              <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus jadwal?"
        description={`"${deleting?.title || ""}" beserta seluruh kegiatannya akan dipindahkan ke Arsip.`}
        onConfirm={doDelete}
        testid="schedule-delete-confirm"
      />
    </div>
  );
}
