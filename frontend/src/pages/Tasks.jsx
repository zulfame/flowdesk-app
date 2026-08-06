import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckSquare,
  Copy,
  Eye,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  Video,
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
import { DataTableCard, SortableHeader } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import {
  PriorityBadge,
  ProgressCell,
  StatusBadge,
  PRIORITY_META,
  STATUS_META,
} from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { ACTION } from "@/constants/labels";

const personName = (p) => (typeof p === "string" ? p : p?.name) || "\u2014";

const fmtDay = (iso) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "\u2014"
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const STATUS_OPTIONS = ["Pending", "On Progress", "Completed", "Overdue", "Draft", "Cancelled", "Archived"];
const PRIORITY_OPTIONS = ["Urgent", "High", "Medium", "Low"];

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ user, onOpen, onEdit, onDuplicate, onDelete }) => [
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="block max-w-[22rem] truncate text-left font-medium hover:underline"
          title={row.original.title}
          data-testid={`task-title-${row.original.id}`}
        >
          {row.original.title}
        </button>
        {row.original.meeting_id ? (
          <Video className="size-3.5 shrink-0 text-muted-foreground" aria-label="Dari rapat" />
        ) : null}
      </div>
    ),
  },
  {
    id: "pic",
    accessorFn: (t) => personName(t.pic),
    header: ({ column }) => <SortableHeader column={column}>PIC</SortableHeader>,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <SortableHeader column={column}>Prioritas</SortableHeader>,
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => <SortableHeader column={column}>Tenggat</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{fmtDay(row.original.deadline)}</span>
    ),
  },
  {
    accessorKey: "progress",
    header: ({ column }) => <SortableHeader column={column}>Progres</SortableHeader>,
    cell: ({ row }) => <ProgressCell value={row.original.progress || 0} />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const task = row.original;
      const manage = canManage(user, task);
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`task-actions-${task.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onOpen(task)} data-testid={`btn-detail-${task.id}`}>
                <Eye aria-hidden="true" /> {ACTION.detail}
              </DropdownMenuItem>
              {manage ? (
                <DropdownMenuItem onClick={() => onEdit(task)} data-testid={`btn-edit-${task.id}`}>
                  <Pencil aria-hidden="true" /> {ACTION.edit}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => onDuplicate(task)}
                data-testid={`btn-duplicate-${task.id}`}
              >
                <Copy aria-hidden="true" /> {ACTION.duplicate}
              </DropdownMenuItem>
              {manage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(task)}
                    className="text-destructive focus:text-destructive"
                    data-testid={`btn-delete-${task.id}`}
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

/** Kelola Tugas — list page (R47): DataTableCard in CLIENT mode. */
export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [pic, setPic] = useState("all");
  const [deleting, setDeleting] = useState(null);
  const [tplOpen, setTplOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, u] = await Promise.all([api.get("/tasks"), api.get("/users?all=true")]);
      setTasks(t.data || []);
      setUsers(u.data.items || []);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (status === "all" || t.status === status) &&
          (priority === "all" || t.priority === priority) &&
          (pic === "all" || t.pic?.user_id === pic)
      ),
    [tasks, status, priority, pic]
  );

  const duplicate = async (task) => {
    try {
      const { data } = await api.post(`/tasks/${task.id}/duplicate`);
      notify.success(`Tugas "${task.title}" berhasil diduplikasi.`);
      navigate(`/tasks/${data.id}`);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/tasks/${deleting.id}`);
      notify.success(`Tugas "${deleting.title}" dihapus.`);
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
        onOpen: (t) => navigate(`/tasks/${t.id}`),
        onEdit: (t) => navigate(`/tasks/${t.id}/edit`),
        onDuplicate: duplicate,
        onDelete: setDeleting,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, navigate]
  );

  const filters = (
    <>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-36"
          data-testid="task-status-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-36"
          data-testid="task-priority-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Prioritas</SelectItem>
          {PRIORITY_OPTIONS.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_META[p].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={pic} onValueChange={setPic}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
          data-testid="task-pic-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua PIC</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const headerAction = (
    <>
      <Button variant="outline" size="sm" onClick={() => setTplOpen(true)} data-testid="btn-templates">
        <LayoutTemplate className="size-4" /> Template
      </Button>
      <Button size="sm" onClick={() => navigate("/tasks/new")} data-testid="btn-tambah-tugas">
        <Plus className="size-4" /> {ACTION.add}
      </Button>
    </>
  );

  return (
    <div className="space-y-6 text-sm" data-testid="tasks-page">
      <DataTableCard
        title="Kelola Tugas"
        onRefresh={load}
        refreshTestId="tasks-refresh"
        headerAction={headerAction}
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        testid="tasks"
        emptyIcon={CheckSquare}
        emptyTitle="Belum ada tugas"
        emptyDescription="Buat tugas untuk mulai mencatat permintaan pekerjaan."
      />

      <TemplateDialog open={tplOpen} onOpenChange={setTplOpen} />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus tugas?"
        description={`"${deleting?.title || ""}" akan dipindahkan ke Arsip dan masih bisa dipulihkan.`}
        onConfirm={doDelete}
        testid="task-delete-confirm"
      />
    </div>
  );
}

/** Template picker + creator (Dialog, R40). */
function TemplateDialog({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [items, setItems] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const { data } = await api.get("/tasks/templates/list");
      setTemplates(data || []);
    } catch (err) {
      notify.error(apiError(err));
    }
  }, []);

  useEffect(() => {
    if (open) loadTemplates();
  }, [open, loadTemplates]);

  const use = async (id) => {
    try {
      const { data } = await api.post(`/tasks/templates/${id}/instantiate`);
      notify.success("Tugas dibuat dari template.");
      onOpenChange(false);
      navigate(`/tasks/${data.id}`);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/tasks/templates/${id}`);
      notify.success("Template dihapus.");
      loadTemplates();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const create = async () => {
    if (!name.trim()) {
      notify.error("Nama template wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/tasks/templates", {
        name,
        title: name,
        items: items.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      notify.success("Template disimpan.");
      setName("");
      setItems("");
      loadTemplates();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="template-dialog">
        <DialogHeader>
          <DialogTitle>Template Tugas</DialogTitle>
          <DialogDescription>
            Gunakan template tersimpan atau buat template baru.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="form-dense space-y-4">
          <div className="divide-y rounded-md border">
            {templates.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">
                Belum ada template.
              </p>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-2 p-2"
                  data-testid={`template-${tpl.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(tpl.items || []).length} item tugas
                    </p>
                  </div>
                  <Button size="sm" onClick={() => use(tpl.id)} data-testid={`use-template-${tpl.id}`}>
                    Gunakan
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive"
                    aria-label={ACTION.delete}
                    onClick={() => remove(tpl.id)}
                    data-testid={`del-template-${tpl.id}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="space-y-[var(--field-gap)] border-t pt-4">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="tpl-name">Nama Template</Label>
              <Input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="mis. Onboarding Klien"
                data-testid="template-name-input"
              />
            </div>
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="tpl-items">Item Tugas</Label>
              <Textarea
                id="tpl-items"
                rows={3}
                value={items}
                onChange={(e) => setItems(e.target.value)}
                placeholder={"Satu item per baris"}
                data-testid="template-items-input"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {ACTION.close}
          </Button>
          <Button size="sm" onClick={create} disabled={saving} data-testid="btn-save-template">
            <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
