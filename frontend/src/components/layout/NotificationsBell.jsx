import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
};

/** NotificationsBell — lonceng header tersambung ke notifikasi asli + penanda belum dibaca. */
export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications", { params: { page_size: 6 } });
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {
      /* lonceng tidak boleh mengganggu; abaikan kegagalan polling */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.is_read) {
      try {
        await api.put(`/notifications/${n.id}/read`);
      } catch {
        /* tetap navigasi walau penandaan gagal */
      }
    }
    load();
    navigate(n.link || "/notifications");
  };

  const markAll = async () => {
    try {
      await api.put("/notifications/read-all");
      notify.success("Semua notifikasi ditandai dibaca.");
      load();
    } catch {
      notify.error("Gagal menandai notifikasi.");
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => {
      setOpen(o);
      if (o) load();
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
          data-testid="notifications-bell"
        >
          <Bell className="size-4" aria-hidden="true" />
          {unread > 0 ? (
            <span
              className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground"
              data-testid="notifications-unread-badge"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" data-testid="notifications-popover">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="font-semibold">Notifikasi</p>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={markAll}
              data-testid="notifications-mark-all"
            >
              <CheckCheck className="size-3.5" /> Tandai dibaca
            </Button>
          ) : null}
        </div>
        <Separator />
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-muted-foreground">Belum ada notifikasi.</p>
          </div>
        ) : (
          <div className="thin-scroll max-h-80 divide-y overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className="flex w-full items-start gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/50"
                data-testid={`notification-item-${n.id}`}
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    n.is_read ? "bg-transparent" : "bg-destructive"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[13px]", !n.is_read && "font-medium")}>
                    {n.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{n.message}</span>
                  <span className="block text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <Separator />
        <div className="flex justify-end px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
            data-testid="notifications-see-all"
          >
            Lihat semua <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
