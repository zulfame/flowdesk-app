import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2,
  LifeBuoy,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTableCard, SortableHeader, fmtDate } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { TicketStatusBadge, TICKET_STATUS_META } from "@/components/composite/TicketBadges";
import { PriorityBadge, PRIORITY_META } from "@/components/composite/TaskBadges";
import UserSelect from "@/components/UserSelect";
import DocumentManager from "@/components/DocumentManager";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";

const CATEGORIES = [
  "Perangkat Keras",
  "Perangkat Lunak",
  "Jaringan",
  "Operasional",
  "Data & Transaksi",
  "Lainnya",
];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const STATUSES = Object.keys(TICKET_STATUS_META);

const emptyForm = {
  title: "",
  description: "",
  category: "Lainnya",
  priority: "Medium",
  assignee: null,
};

const buildColumns = ({ onOpen, onDelete }) => [
  {
    accessorKey: "number",
    header: ({ column }) => <SortableHeader column={column}>No. Tiket</SortableHeader>,
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onOpen(row.original)}
        className="font-medium hover:underline"
        data-testid={`ticket-number-${row.original.id}`}
      >
        {row.original.number}
      </button>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onOpen(row.original)}
        className="block max-w-[20rem] truncate text-left hover:underline"
        title={row.original.title}
        data-testid={`ticket-title-${row.original.id}`}
      >
        {row.original.title}
      </button>
    ),
  },
  {
    accessorKey: "category",
    header: () => <span>Kategori</span>,
    enableSorting: false,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {row.original.category}
      </Badge>
    ),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <SortableHeader column={column}>Prioritas</SortableHeader>,
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    id: "reporter",
    accessorFn: (t) => t.created_by_name || "",
    header: () => <span>Pelapor</span>,
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() || "\u2014"}</span>
    ),
  },
  {
    id: "assignee",
    accessorFn: (t) => (t.assignee || {}).name || "",
    header: () => <span>Ditujukan</span>,
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{getValue() || "Belum ditujukan"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "updated_at",
    header: ({ column }) => <SortableHeader column={column}>Diperbarui</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{fmtDate(row.original.updated_at)}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const t = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`ticket-actions-${t.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onOpen(t)} data-testid={`btn-detail-ticket-${t.id}`}>
                <LifeBuoy aria-hidden="true" /> {ACTION.detail}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(t)}
                className="text-destructive focus:text-destructive"
                data-testid={`btn-delete-ticket-${t.id}`}
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

/** Tiket Bantuan — daftar tiket (R47) + dialog pengajuan tiket baru. */
export default function HelpTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [scope, setScope] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [users, setUsers] = useState([]);
  const docsRef = useRef(null);
  const draftId = useRef(`draft-${Date.now()}`);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status !== "all") params.status = status;
      if (scope !== "all") params.mine = scope;
      const { data } = await api.get("/help-tickets", { params });
      setTickets(data || []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [status, scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/users?all=true")
      .then(({ data }) => setUsers((data.items || []).filter((u) => u.is_active !== false)))
      .catch(() => setUsers([]));
  }, []);

  const rows = useMemo(
    () => (category === "all" ? tickets : tickets.filter((t) => t.category === category)),
    [tickets, category]
  );

  const openNew = () => {
    setForm(emptyForm);
    setAttachments([]);
    draftId.current = `draft-${Date.now()}`;
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Judul tiket wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post("/help-tickets", { ...form, attachments });
      notify.success(`Tiket ${data.number} berhasil dibuat.`);
      setOpen(false);
      navigate(`/help-tickets/${data.id}`);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/help-tickets/${deleting.id}`);
      notify.success(`Tiket ${deleting.number} dihapus.`);
      setDeleting(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const columns = useMemo(
    () =>
      buildColumns({
        onOpen: (t) => navigate(`/help-tickets/${t.id}`),
        onDelete: setDeleting,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters = (
    <>
      <Select value={scope} onValueChange={setScope}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-44"
          data-testid="ticket-scope-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Tiket</SelectItem>
          <SelectItem value="created">Tiket Saya</SelectItem>
          <SelectItem value="assigned">Ditujukan ke Saya</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
          data-testid="ticket-status-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="open">Masih Terbuka</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-44"
          data-testid="ticket-category-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Kategori</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-6" data-testid="help-tickets-page">
      <DataTableCard
        title="Tiket Bantuan"
        onRefresh={load}
        refreshTestId="tickets-refresh"
        headerAction={
          <Button size="sm" onClick={openNew} data-testid="btn-add-ticket">
            <Plus className="size-4" /> {ACTION.add}
          </Button>
        }
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        testid="tickets"
        emptyIcon={LifeBuoy}
        emptyTitle="Belum ada tiket bantuan"
        emptyDescription="Ajukan tiket untuk meminta bantuan, lalu pantau penanganannya di sini."
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="ticket-dialog">
          <DialogHeader>
            <DialogTitle>Tiket Bantuan Baru</DialogTitle>
            <DialogDescription>
              Jelaskan kendala Anda sejelas mungkin agar penerima tiket cepat menindaklanjuti.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="ticket-title">Judul</Label>
              <Input
                id="ticket-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Printer teller tidak bisa mencetak"
                data-testid="ticket-title-input"
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="ticket-desc">Deskripsi</Label>
              <Textarea
                id="ticket-desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Uraikan kendala, kapan terjadi, dan langkah yang sudah dicoba..."
                data-testid="ticket-desc-input"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-3">
              <div className="space-y-[var(--item-gap)]">
                <Label>Kategori</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger data-testid="ticket-category-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label>Prioritas</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger data-testid="ticket-priority-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_META[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label>Ditujukan</Label>
                <UserSelect
                  users={users}
                  value={form.assignee}
                  onChange={(v) => setForm({ ...form, assignee: v })}
                  placeholder="Pilih penerima..."
                  testid="ticket-assignee"
                />
              </div>
            </div>
            <div className="space-y-[var(--item-gap)]">
              <div className="flex items-center justify-between">
                <Label>Lampiran ({attachments.length})</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => docsRef.current?.addUrl()}
                    data-testid="btn-ticket-doc-url"
                  >
                    <Link2 className="size-4" /> URL
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => docsRef.current?.pickFile()}
                    data-testid="btn-ticket-doc-file"
                  >
                    <Upload className="size-4" /> {ACTION.upload}
                  </Button>
                </div>
              </div>
              <DocumentManager
                ref={docsRef}
                taskId={draftId.current}
                documents={attachments}
                onChange={setAttachments}
                idPrefix="help_ticket"
                label="Lampiran"
                emptyText="Belum ada lampiran"
                canRespond={false}
                hideHeaderTitle
                hideActions
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              <X className="size-4" /> {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-ticket">
              <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Hapus tiket bantuan?"
        description={`Tiket ${deleting?.number || ""} — "${deleting?.title || ""}" akan dihapus.`}
        onConfirm={doDelete}
        testid="ticket-delete-confirm"
      />
    </div>
  );
}
