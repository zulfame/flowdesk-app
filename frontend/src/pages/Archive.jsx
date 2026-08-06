import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive as ArchiveIcon,
  Bell,
  CalendarClock,
  CheckSquare,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  DataTableCard,
  SortableHeader,
  fmtDate,
} from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";

const TYPE_META = {
  task: { label: "Tugas", icon: CheckSquare },
  meeting: { label: "Rapat", icon: Video },
  note: { label: "Catatan", icon: FileText },
  reminder: { label: "Pengingat", icon: Bell },
  event: { label: "Acara", icon: CalendarClock },
};

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ onRestore, onPurge }) => [
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => {
      const meta = TYPE_META[row.original.type] || TYPE_META.task;
      const Icon = meta.icon;
      return (
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40">
            <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
          </span>
          <span className="block max-w-[24rem] truncate font-medium" title={row.original.title}>
            {row.original.title}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column}>Jenis</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {(TYPE_META[row.original.type] || TYPE_META.task).label}
      </Badge>
    ),
  },
  {
    accessorKey: "deleted_at",
    header: ({ column }) => <SortableHeader column={column}>Dihapus</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{fmtDate(row.original.deleted_at)}</span>
    ),
  },
  {
    accessorKey: "deleted_by_name",
    header: ({ column }) => <SortableHeader column={column}>Oleh</SortableHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.deleted_by_name || "\u2014"}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`archive-actions-${item.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onRestore(item)} data-testid={`btn-restore-${item.id}`}>
                <RotateCcw aria-hidden="true" /> {ACTION.restore}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onPurge(item)}
                className="text-destructive focus:text-destructive"
                data-testid={`btn-purge-${item.id}`}
              >
                <Trash2 aria-hidden="true" /> Hapus Permanen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

/**
 * Archive — soft-deleted records with restore / permanent delete (R47).
 * DataTableCard in SERVER mode (search, type filter and pagination via API).
 */
export default function ArchivePage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [restoring, setRestoring] = useState(null);
  const [purging, setPurging] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/archive", {
        params: { type, q: search || undefined, page: pageIndex + 1, page_size: pageSize },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [type, search, pageIndex, pageSize]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPageIndex(0);
  }, [type, search, pageSize]);

  const doRestore = async () => {
    try {
      await api.post(`/archive/${restoring.type}/${restoring.id}/restore`);
      notify.success(`"${restoring.title}" berhasil dipulihkan.`);
      setRestoring(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const doPurge = async () => {
    try {
      await api.delete(`/archive/${purging.type}/${purging.id}`);
      notify.success(`"${purging.title}" dihapus permanen.`);
      setPurging(null);
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const columns = useMemo(
    () => buildColumns({ onRestore: setRestoring, onPurge: setPurging }),
    []
  );

  const filters = (
    <Select value={type} onValueChange={setType}>
      <SelectTrigger
        className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
        data-testid="archive-type-filter"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Jenis</SelectItem>
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <SelectItem key={key} value={key}>
            {meta.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6" data-testid="archive-page">
      <DataTableCard
        title="Kelola Arsip"
        onRefresh={load}
        refreshTestId="archive-refresh"
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        search={{ value: search, onChange: setSearch }}
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(total / pageSize) || 1,
          totalRows: total,
          onPageChange: setPageIndex,
          onPageSizeChange: setPageSize,
        }}
        testid="archive"
        emptyIcon={ArchiveIcon}
        emptyTitle="Arsip kosong"
        emptyDescription="Data yang dihapus akan muncul di sini dan masih bisa dipulihkan."
      />

      <ConfirmDeleteDialog
        open={Boolean(restoring)}
        onOpenChange={(open) => !open && setRestoring(null)}
        title="Pulihkan data?"
        description={`"${restoring?.title || ""}" akan dikembalikan ke daftar aktif.`}
        confirmLabel={ACTION.restore}
        destructive={false}
        icon={RotateCcw}
        onConfirm={doRestore}
        testid="archive-restore-confirm"
      />

      <ConfirmDeleteDialog
        open={Boolean(purging)}
        onOpenChange={(open) => !open && setPurging(null)}
        title="Hapus permanen?"
        description={`"${purging?.title || ""}" akan dihapus selamanya dan tidak dapat dipulihkan.`}
        onConfirm={doPurge}
        testid="archive-purge-confirm"
      />
    </div>
  );
}
