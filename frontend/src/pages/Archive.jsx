import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, RotateCcw, Trash2, Search, ChevronLeft, ChevronRight, Loader2, CheckSquare, Video, FileText, Bell, CalendarClock } from "lucide-react";
import { toast } from "sonner";

const TYPE_META = {
  task: { label: "Tugas", icon: CheckSquare, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30" },
  meeting: { label: "Rapat", icon: Video, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" },
  note: { label: "Catatan", icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30" },
  reminder: { label: "Pengingat", icon: Bell, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" },
  event: { label: "Acara", icon: CalendarClock, color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30" },
};
const PAGE_SIZE = 20;

function fmt(iso) { return iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-"; }

export default function ArchivePage() {
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [restoreT, setRestoreT] = useState(null);
  const [purgeT, setPurgeT] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/archive", { params: { type, q: q || undefined, page, page_size: PAGE_SIZE } });
      setData(data);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [type, q, page]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setPage(1); }, [type, q]);

  const restore = async () => {
    try { await api.post(`/archive/${restoreT.type}/${restoreT.id}/restore`); toast.success("Data dipulihkan"); setRestoreT(null); load(); }
    catch (e) { toast.error(apiError(e)); }
  };
  const purge = async () => {
    try { await api.delete(`/archive/${purgeT.type}/${purgeT.id}`); toast.success("Data dihapus permanen"); setPurgeT(null); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Kelola Arsip" subtitle="Data yang dihapus disimpan di sini dan dapat dipulihkan." />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul data terhapus..." className="pl-9 rounded-xl" data-testid="archive-search" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl" data-testid="archive-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-lg shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={Archive} title="Arsip kosong" description="Tidak ada data terhapus yang cocok." />
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.task;
              const Icon = meta.icon;
              return (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors" data-testid={`archive-row-${item.id}`}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Dihapus {fmt(item.deleted_at)} oleh {item.deleted_by_name}</p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground shrink-0">{meta.label}</span>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setRestoreT(item)} data-testid={`btn-restore-${item.id}`}><RotateCcw className="h-4 w-4" /><span className="hidden sm:inline ml-1">Pulihkan</span></Button>
                    <Button variant="outline" size="sm" className="rounded-lg text-destructive" onClick={() => setPurgeT(item)} data-testid={`btn-purge-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span data-testid="archive-total">{data.total} data terarsip</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="archive-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <span data-testid="archive-page">Hal {data.page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="archive-next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <ConfirmDialog open={!!restoreT} onOpenChange={(v) => !v && setRestoreT(null)} title="Pulihkan data?" destructive={false} confirmText="Pulihkan" description={`"${restoreT?.title}" akan dikembalikan ke daftar aktif.`} onConfirm={restore} />
      <ConfirmDialog open={!!purgeT} onOpenChange={(v) => !v && setPurgeT(null)} title="Hapus permanen?" description={`"${purgeT?.title}" akan dihapus selamanya dan tidak bisa dipulihkan.`} onConfirm={purge} />
    </div>
  );
}
