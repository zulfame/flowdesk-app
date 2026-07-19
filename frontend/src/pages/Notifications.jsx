import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { toast } from "sonner";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try { const { data } = await api.get("/notifications"); setItems(data.items); } catch (e) { toast.error(apiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => { try { await api.put(`/notifications/${id}/read`); load(); } catch {} };
  const markAll = async () => { try { await api.put("/notifications/read-all"); toast.success("Semua ditandai dibaca"); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div>
      <PageHeader title="Pusat Notifikasi" subtitle="Semua pemberitahuan penting di satu tempat.">
        <Button variant="secondary" onClick={markAll} className="rounded-xl" data-testid="btn-mark-all-read"><CheckCheck className="h-4 w-4 mr-1.5" /> Tandai Semua Dibaca</Button>
      </PageHeader>

      {items.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={Bell} title="Tidak ada notifikasi" description="Notifikasi baru akan muncul di sini." /></Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} onClick={() => { markRead(n.id); if (n.link) navigate(n.link); }} className={`p-4 rounded-2xl shadow-soft flex items-start gap-3 cursor-pointer hover:bg-secondary/40 transition-colors ${!n.is_read ? "border-l-4 border-l-primary" : ""}`} data-testid={`notification-${n.id}`}>
              <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center shrink-0"><Bell className="h-4 w-4 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium flex items-center gap-2">{n.title} {!n.is_read && <Circle className="h-2 w-2 fill-primary text-primary" />}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
