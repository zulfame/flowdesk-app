import React, { useCallback, useEffect, useState } from "react";
import {
  Download,
  LogIn,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  ScrollText,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTableCard,
  SortableHeader,
  fmtDate,
} from "@/components/composite/DataTableCard";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";

const ACTION_ICONS = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  restore: RotateCcw,
  login: LogIn,
  logout: LogOut,
  upload: Upload,
  download: Download,
  comment: MessageSquare,
};

const ACTION_LABELS = {
  create: "Buat",
  update: "Ubah",
  delete: "Hapus",
  restore: "Pulihkan",
  login: "Masuk",
  logout: "Keluar",
  upload: "Unggah",
  download: "Unduh",
  comment: "Komentar",
};

const ENTITY_LABELS = {
  task: "Tugas",
  meeting: "Rapat",
  reminder: "Pengingat",
  note: "Catatan",
  user: "Pengguna",
  auth: "Autentikasi",
  settings: "Pengaturan",
  backup: "Backup",
  role: "Peran",
  event: "Acara",
};

/** Monochrome-first badge mapping: only destructive actions get colour. */
const actionVariant = (action) =>
  action === "delete" ? "destructive" : action === "create" ? "default" : "secondary";

/** Column definitions (module scope: stable identity across renders). */
const COLUMNS = [
    {
      accessorKey: "created_at",
      header: ({ column }) => <SortableHeader column={column}>Waktu</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{fmtDate(row.original.created_at)}</span>
      ),
    },
    {
      accessorKey: "user_name",
      header: ({ column }) => <SortableHeader column={column}>Pengguna</SortableHeader>,
      cell: ({ row }) => <span className="font-medium">{row.original.user_name || "\u2014"}</span>,
    },
    {
      accessorKey: "action",
      header: ({ column }) => <SortableHeader column={column}>Aksi</SortableHeader>,
      cell: ({ row }) => {
        const value = row.original.action;
        const Icon = ACTION_ICONS[value] || ScrollText;
        return (
          <Badge variant={actionVariant(value)} className="gap-1 font-normal">
            <Icon className="size-3" aria-hidden="true" />
            {ACTION_LABELS[value] || value}
          </Badge>
        );
      },
    },
    {
      accessorKey: "entity_type",
      header: ({ column }) => <SortableHeader column={column}>Entitas</SortableHeader>,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {ENTITY_LABELS[row.original.entity_type] || row.original.entity_type}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => <SortableHeader column={column}>Deskripsi</SortableHeader>,
      cell: ({ row }) => (
        <span className="block max-w-[28rem] truncate" title={row.original.description}>
          {row.original.description}
        </span>
      ),
    },
];

/**
 * ActivityLog — read-only audit trail rendered with the standard DataTableCard
 * (R47) in SERVER mode: search, entity/action filters and pagination are driven
 * by the API so large logs stay fast.
 */
export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/activity-logs", {
        params: {
          entity_type: entity,
          action,
          q: search || undefined,
          page: pageIndex + 1,
          page_size: pageSize,
        },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [entity, action, search, pageIndex, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Any filter/search change restarts from the first page.
  useEffect(() => {
    setPageIndex(0);
  }, [entity, action, search, pageSize]);

  const filters = (
    <>
      <Select value={entity} onValueChange={setEntity}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
          data-testid="activity-filter-entity"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Entitas</SelectItem>
          {Object.entries(ENTITY_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={action} onValueChange={setAction}>
        <SelectTrigger
          className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-36"
          data-testid="activity-filter-action"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Aksi</SelectItem>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-6" data-testid="activity-page">
      <DataTableCard
        title="Log Aktivitas"
        onRefresh={load}
        refreshTestId="activity-refresh"
        filters={filters}
        columns={COLUMNS}
        data={rows}
        loading={loading}
        searchPlaceholder="Cari deskripsi atau pengguna..."
        search={{ value: search, onChange: setSearch }}
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(total / pageSize) || 1,
          totalRows: total,
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
        testid="activity"
        emptyIcon={ScrollText}
        emptyTitle="Belum ada aktivitas"
        emptyDescription="Setiap aktivitas pada sistem akan tercatat otomatis di sini."
      />
    </div>
  );
}
