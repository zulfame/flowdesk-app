import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CheckSquare,
  Circle,
  ExternalLink,
  Mail,
  MailOpen,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableCard, SortableHeader, fmtDate } from "@/components/composite/DataTableCard";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const TYPE_META = {
  task: { label: "Tugas", icon: CheckSquare },
  meeting: { label: "Rapat", icon: Video },
  reminder: { label: "Pengingat", icon: Bell },
  info: { label: "Info", icon: Bell },
};
const STATUS_LABELS = { all: "Semua Status", unread: "Belum Dibaca", read: "Sudah Dibaca" };

/** Column factory (module scope — no component defined during render). */
const buildColumns = ({ onToggleRead, onOpen }) => [
  {
    id: "state",
    accessorFn: (n) => (n.is_read ? 1 : 0),
    header: () => <span className="sr-only">Status baca</span>,
    enableSorting: false,
    cell: ({ row }) =>
      row.original.is_read ? (
        <Circle className="size-2 text-muted-foreground/40" aria-label="Sudah dibaca" />
      ) : (
        <Circle className="size-2 fill-primary text-primary" aria-label="Belum dibaca" />
      ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => <SortableHeader column={column}>Notifikasi</SortableHeader>,
    cell: ({ row }) => {
      const n = row.original;
      return (
        <div className="min-w-0 max-w-[32rem]">
          <p className={cn("truncate", n.is_read ? "text-muted-foreground" : "font-semibold")}>
            {n.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">{n.message}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: ({ column }) => <SortableHeader column={column}>Jenis</SortableHeader>,
    cell: ({ row }) => {
      const meta = TYPE_META[row.original.type] || TYPE_META.info;
      const Icon = meta.icon;
      return (
        <Badge variant="outline" className="gap-1 font-normal">
          <Icon className="size-3" aria-hidden="true" /> {meta.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortableHeader column={column}>Waktu</SortableHeader>,
    cell: ({ row }) => <span className="text-muted-foreground">{fmtDate(row.original.created_at)}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Aksi</span>,
    enableSorting: false,
    cell: ({ row }) => {
      const n = row.original;
      return (
        <div className="flex justify-end gap-1">
          {n.link ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Buka tautan"
              onClick={() => onOpen(n)}
              data-testid={`notif-open-${n.id}`}
            >
              <ExternalLink className="size-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={n.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
            onClick={() => onToggleRead(n)}
            data-testid={`notif-toggle-${n.id}`}
          >
            {n.is_read ? <Mail className="size-4" /> : <MailOpen className="size-4" />}
          </Button>
        </div>
      );
    },
  },
];

/** Pusat Notifikasi — DataTableCard mode SERVER (filter status/jenis + pencarian). */
export default function Notifications() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/notifications", {
        params: {
          status,
          type,
          q: query || undefined,
          page: pageIndex + 1,
          page_size: pageSize,
        },
      });
      setRows(data.items || []);
      setTotal(data.total || 0);
      setUnread(data.unread || 0);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [status, type, query, pageIndex, pageSize, tick]);

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const toggleRead = async (n) => {
    try {
      await api.put(`/notifications/${n.id}/${n.is_read ? "unread" : "read"}`);
      setTick((t) => t + 1);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const open = async (n) => {
    if (!n.is_read) {
      try {
        await api.put(`/notifications/${n.id}/read`);
      } catch {
        /* diabaikan: navigasi tetap dilanjutkan */
      }
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await api.put("/notifications/read-all");
      notify.success("Semua notifikasi ditandai sudah dibaca.");
      setTick((t) => t + 1);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const columns = useMemo(
    () => buildColumns({ onToggleRead: toggleRead, onOpen: open }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const filters = (
    <>
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          setPageIndex(0);
        }}
      >
        <SelectTrigger className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-36" data-testid="notif-status-filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={type}
        onValueChange={(v) => {
          setType(v);
          setPageIndex(0);
        }}
      >
        <SelectTrigger className="h-[var(--ctl-h-sm)] w-full text-xs sm:w-36" data-testid="notif-type-filter">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Jenis</SelectItem>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <DataTableCard
        title="Pusat Notifikasi"
        description={unread ? `${unread} notifikasi belum dibaca` : "Semua notifikasi sudah dibaca"}
        onRefresh={load}
        refreshTestId="notifications-refresh"
        headerAction={
          <Button variant="outline" size="sm" onClick={markAll} disabled={!unread} data-testid="btn-mark-all-read">
            <CheckCheck className="size-4" /> Tandai Semua Dibaca
          </Button>
        }
        filters={filters}
        columns={columns}
        data={rows}
        loading={loading}
        search={{
          value: query,
          onChange: (v) => {
            setQuery(v);
            setPageIndex(0);
          },
        }}
        pagination={{
          pageIndex,
          pageSize,
          pageCount: Math.ceil(total / pageSize) || 1,
          totalRows: total,
          onPageChange: setPageIndex,
          onPageSizeChange: (n) => {
            setPageSize(n);
            setPageIndex(0);
          },
        }}
        testid="notifications"
        emptyIcon={Bell}
        emptyTitle="Tidak ada notifikasi"
        emptyDescription={
          status === "unread"
            ? "Tidak ada notifikasi yang belum dibaca."
            : "Notifikasi baru akan muncul di sini."
        }
      />
    </div>
  );
}
