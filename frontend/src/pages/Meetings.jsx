import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2, Video } from "lucide-react";

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
import { DataTableCard, SortableHeader } from "@/components/composite/DataTableCard";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { ACTION } from "@/constants/labels";

const TYPES = ["Internal", "Eksternal", "Online", "Klien", "Review"];

const fmtDay = (iso) => {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "\u2014"
    : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
};

const timeRange = (m) => {
  if (!m.start_time && !m.end_time) return "\u2014";
  return m.end_time ? `${m.start_time || "?"} \u2013 ${m.end_time}` : m.start_time;
};

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ user, onOpen, onEdit, onDelete }) => [
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Judul</SortableHeader>,
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onOpen(row.original)}
        className="block max-w-[22rem] truncate text-left font-medium hover:underline"
        title={row.original.title}
        data-testid={`meeting-title-${row.original.id}`}
      >
        {row.original.title}
      </button>
    ),
  },
  {
    accessorKey: "meeting_type",
    header: ({ column }) => <SortableHeader column={column}>Jenis</SortableHeader>,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal">
        {row.original.meeting_type || "\u2014"}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: ({ column }) => <SortableHeader column={column}>Tanggal</SortableHeader>,
    cell: ({ row }) => <span className="text-muted-foreground">{fmtDay(row.original.date)}</span>,
  },
  {
    id: "time",
    accessorFn: (m) => timeRange(m),
    header: () => <span>Waktu</span>,
    enableSorting: false,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
  },
  {
    accessorKey: "location",
    header: ({ column }) => <SortableHeader column={column}>Lokasi</SortableHeader>,
    cell: ({ row }) => (
      <span className="block max-w-[14rem] truncate text-muted-foreground">
        {row.original.location || "\u2014"}
      </span>
    ),
  },
  {
    id: "participants",
    accessorFn: (m) => (m.participants || []).length,
    header: ({ column }) => <SortableHeader column={column}>Peserta</SortableHeader>,
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()} orang</span>,
  },
  {
    id: "action_items",
    accessorFn: (m) => (m.action_items || []).length,
    header: ({ column }) => <SortableHeader column={column}>Item Aksi</SortableHeader>,
    cell: ({ row }) => {
      const items = row.original.action_items || [];
      const done = items.filter((i) => i.done).length;
      return (
        <span className="text-muted-foreground">
          {items.length ? `${done}/${items.length}` : "\u2014"}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const meeting = row.original;
      const manage = canManage(user, meeting);
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Aksi baris"
                data-testid={`meeting-actions-${meeting.id}`}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onOpen(meeting)} data-testid={`btn-detail-${meeting.id}`}>
                <Eye aria-hidden="true" /> {ACTION.detail}
              </DropdownMenuItem>
              {manage ? (
                <>
                  <DropdownMenuItem onClick={() => onEdit(meeting)} data-testid={`btn-edit-${meeting.id}`}>
                    <Pencil aria-hidden="true" /> {ACTION.edit}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(meeting)}
                    className="text-destructive focus:text-destructive"
                    data-testid={`btn-delete-${meeting.id}`}
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

/** Kelola Rapat — list page (R47): DataTableCard in CLIENT mode. */
export default function Meetings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/meetings");
      setMeetings(data || []);
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
    () => meetings.filter((m) => type === "all" || m.meeting_type === type),
    [meetings, type]
  );

  const doDelete = async () => {
    try {
      await api.delete(`/meetings/${deleting.id}`);
      notify.success(`Rapat "${deleting.title}" dihapus.`);
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
        onOpen: (m) => navigate(`/meetings/${m.id}`),
        onEdit: (m) => navigate(`/meetings/${m.id}/edit`),
        onDelete: setDeleting,
      }),
    [user, navigate]
  );

  const filters = (
    <Select value={type} onValueChange={setType}>
      <SelectTrigger
        className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-40"
        data-testid="meeting-type-filter"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Jenis</SelectItem>
        {TYPES.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6" data-testid="meetings-page">
      <DataTableCard
        title="Kelola Rapat"
        onRefresh={load}
        refreshTestId="meetings-refresh"
        headerAction={
          <Button size="sm" onClick={() => navigate("/meetings/new")} data-testid="btn-tambah-rapat">
            <Plus className="size-4" /> {ACTION.add}
          </Button>
        }
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        testid="meetings"
        emptyIcon={Video}
        emptyTitle="Belum ada rapat"
        emptyDescription="Buat rapat untuk mencatat agenda, keputusan, dan item aksi."
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Hapus rapat?"
        description={`"${deleting?.title || ""}" akan dipindahkan ke Arsip dan masih bisa dipulihkan.`}
        onConfirm={doDelete}
        testid="meeting-delete-confirm"
      />
    </div>
  );
}
