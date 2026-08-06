import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, MoreHorizontal, Pencil, Pin, PinOff, Plus, Save, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import RichTextEditor from "@/components/RichTextEditor";
import { DataTableCard, SortableHeader } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

/** Note colours are user DATA (exception E2) — kept as small swatches only. */
const COLORS = {
  default: { label: "Netral", dot: "bg-muted-foreground/40" },
  yellow: { label: "Kuning", dot: "bg-[hsl(45_93%_47%)]" }, // guard-allow (E2: warna sebagai data)
  green: { label: "Hijau", dot: "bg-[hsl(142_71%_40%)]" }, // guard-allow (E2)
  blue: { label: "Biru", dot: "bg-[hsl(217_91%_55%)]" }, // guard-allow (E2)
  pink: { label: "Merah Muda", dot: "bg-[hsl(330_81%_60%)]" }, // guard-allow (E2)
};

const fmtDay = (iso) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "\u2014"
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const plain = (html) =>
  (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ onEdit, onTogglePin, onDelete }) => [
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => {
      const note = row.original;
      const color = COLORS[note.color] || COLORS.default;
      return (
        <div className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", color.dot)} aria-hidden="true" />
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="block max-w-[20rem] truncate text-left font-medium hover:underline"
            title={note.title}
            data-testid={`note-title-${note.id}`}
          >
            {note.title}
          </button>
          {note.pinned ? (
            <Pin className="size-3.5 shrink-0 text-muted-foreground" aria-label="Disematkan" />
          ) : null}
        </div>
      );
    },
  },
  {
    id: "content",
    accessorFn: (n) => plain(n.content),
    header: () => <span>Ringkasan</span>,
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="block max-w-[22rem] truncate text-muted-foreground">
        {getValue() || "Tanpa isi"}
      </span>
    ),
  },
  {
    id: "tags",
    accessorFn: (n) => (n.tags || []).join(", "),
    header: () => <span>Tag</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const tags = row.original.tags || [];
      if (!tags.length) return <span className="text-muted-foreground">{"\u2014"}</span>;
      return (
        <div className="flex items-center gap-1">
          {tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="outline" className="font-normal">
              {t}
            </Badge>
          ))}
          {tags.length > 2 ? (
            <span className="text-xs text-muted-foreground">+{tags.length - 2}</span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => <SortableHeader column={column}>Diperbarui</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{fmtDay(row.original.updated_at)}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const note = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`note-actions-${note.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onEdit(note)} data-testid={`btn-edit-note-${note.id}`}>
                <Pencil aria-hidden="true" /> {ACTION.edit}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(note)} data-testid={`btn-pin-${note.id}`}>
                {note.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                {note.pinned ? "Lepas Sematan" : "Sematkan"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(note)}
                className="text-destructive focus:text-destructive"
                data-testid={`btn-delete-note-${note.id}`}
              >
                <Trash2 aria-hidden="true" /> {ACTION.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

const emptyForm = { title: "", content: "", tags: "", color: "default" };

/** Kelola Catatan — private notes list (R47) + rich-text dialog editor. */
export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notes");
      setNotes(data || []);
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

  const openEdit = (note) => {
    setEditing(note);
    setForm({
      title: note.title || "",
      content: note.content || "",
      tags: (note.tags || []).join(", "),
      color: note.color || "default",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Judul catatan wajib diisi.");
      return;
    }
    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      if (editing) await api.put(`/notes/${editing.id}`, payload);
      else await api.post("/notes", payload);
      notify.success("Catatan disimpan.");
      setOpen(false);
      load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note) => {
    try {
      await api.put(`/notes/${note.id}`, { pinned: !note.pinned });
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/notes/${deleting.id}`);
      notify.success(`Catatan "${deleting.title}" dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const columns = useMemo(
    () => buildColumns({ onEdit: openEdit, onTogglePin: togglePin, onDelete: setDeleting }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="space-y-6" data-testid="notes-page">
      <DataTableCard
        title="Kelola Catatan"
        onRefresh={load}
        refreshTestId="notes-refresh"
        headerAction={
          <Button size="sm" onClick={openNew} data-testid="btn-add-note">
            <Plus className="size-4" /> {ACTION.add}
          </Button>
        }
        columns={columns}
        data={notes}
        loading={loading}
        testid="notes"
        emptyIcon={FileText}
        emptyTitle="Belum ada catatan"
        emptyDescription="Buat catatan untuk menyimpan ide dan referensi penting Anda."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="note-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Catatan" : "Catatan Baru"}</DialogTitle>
            <DialogDescription>Catatan bersifat pribadi, hanya Anda yang melihatnya.</DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="note-title">Judul</Label>
              <Input
                id="note-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="note-title-input"
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label>Isi</Label>
              <RichTextEditor
                value={form.content}
                onChange={(v) => setForm({ ...form, content: v })}
                placeholder="Tulis catatan..."
                minHeight={160}
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="note-tags">Tag</Label>
              <Input
                id="note-tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="pisahkan dengan koma"
                data-testid="note-tags-input"
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label>Warna</Label>
              <div className="flex items-center gap-2">
                {Object.entries(COLORS).map(([key, meta]) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={meta.label}
                    onClick={() => setForm({ ...form, color: key })}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md border transition-colors",
                      form.color === key ? "border-primary" : "border-input"
                    )}
                    data-testid={`note-color-${key}`}
                  >
                    <span className={cn("size-3 rounded-full", meta.dot)} />
                  </button>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              <X className="size-4" /> {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-note">
              <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus catatan?"
        description={`"${deleting?.title || ""}" akan dipindahkan ke Arsip.`}
        onConfirm={doDelete}
        testid="note-delete-confirm"
      />
    </div>
  );
}
