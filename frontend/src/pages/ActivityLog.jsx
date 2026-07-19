import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Plus, Pencil, Trash2, RotateCcw, LogIn, LogOut, Upload, Download, MessageSquare, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const ACTION_ICONS = { create: Plus, update: Pencil, delete: Trash2, restore: RotateCcw, login: LogIn, logout: LogOut, upload: Upload, download: Download, comment: MessageSquare };
const ACTION_COLORS = {
  create: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30", update: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",
  delete: "text-rose-600 bg-rose-50 dark:bg-rose-900/30", restore: "text-amber-600 bg-amber-50 dark:bg-amber-900/30",
  login: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30", logout: "text-slate-600 bg-slate-100 dark:bg-slate-800",
  upload: "text-purple-600 bg-purple-50 dark:bg-purple-900/30", comment: "text-amber-600 bg-amber-50 dark:bg-amber-900/30",
};
const ENTITY_LABELS = { task: "Tugas", meeting: "Rapat", reminder: "Pengingat", note: "Catatan", user: "Pengguna", auth: "Autentikasi", settings: "Pengaturan", backup: "Backup", role: "Peran", event: "Acara" };
const ACTION_LABELS = { create: "Buat", update: "Ubah", delete: "Hapus", restore: "Pulihkan", login: "Masuk", logout: "Keluar", upload: "Unggah", download: "Unduh", comment: "Komentar" };
const PAGE_SIZE = 25;

function fmt(iso) { return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }); }

export default function ActivityLog() {
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/activity-logs", { params: { entity_type: entity, action, q: q || undefined, page, page_size: PAGE_SIZE } });
      setData(data);
    } catch {} finally { setLoading(false); }
  }, [entity, action, q, page]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setPage(1); }, [entity, action, q]);

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Log Aktivitas" subtitle="Jejak audit lengkap dari seluruh aktivitas sistem." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari deskripsi atau pengguna..." className="pl-9 rounded-xl" data-testid="activity-search" />
        </div>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-full sm:w-40 rounded-xl" data-testid="activity-filter-entity"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Entitas</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full sm:w-36 rounded-xl" data-testid="activity-filter-action"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-2xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={ScrollText} title="Belum ada aktivitas" description="Aktivitas sistem akan tercatat di sini." />
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((log) => {
              const Icon = ACTION_ICONS[log.action] || ScrollText;
              return (
                <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors" data-testid={`log-${log.id}`}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${ACTION_COLORS[log.action] || "text-slate-600 bg-slate-100 dark:bg-slate-800"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{log.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground/70">{log.user_name}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{fmt(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span data-testid="activity-total">{data.total} aktivitas</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="activity-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <span data-testid="activity-page">Hal {data.page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="activity-next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
