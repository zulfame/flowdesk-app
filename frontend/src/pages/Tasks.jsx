import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader, StatusBadge, PriorityBadge, ProgressBar, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckSquare, Video } from "lucide-react";
import { toast } from "sonner";

const STATUS_FILTERS = ["Semua", "Pending", "On Progress", "Completed", "Overdue"];
const STATUS_LABEL = { Semua: "Semua", Pending: "Menunggu", "On Progress": "Berjalan", Completed: "Selesai", Overdue: "Terlambat" };

const personName = (p) => (typeof p === "string" ? p : p?.name);

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/tasks"); setTasks(data); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "Semua" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <PageHeader title="Manajemen Tugas" subtitle="Setiap tugas mewakili satu permintaan pekerjaan.">
        <Button onClick={() => navigate("/tasks/new")} className="rounded-xl" data-testid="btn-tambah-tugas"><Plus className="h-4 w-4 mr-1.5" /> Tugas Baru</Button>
      </PageHeader>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="rounded-xl">
          {STATUS_FILTERS.map((f) => <TabsTrigger key={f} value={f} className="rounded-lg" data-testid={`filter-${f.toLowerCase().replace(/\s/g, "-")}`}>{STATUS_LABEL[f]}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-secondary/50 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={CheckSquare} title="Belum ada tugas" description="Buat tugas pertama untuk mulai mengatur pekerjaan Anda." action={<Button onClick={() => navigate("/tasks/new")} data-testid="btn-empty-new-task"><Plus className="h-4 w-4 mr-1.5" /> Tugas Baru</Button>} /></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t) => (
            <Card key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="p-5 rounded-2xl shadow-soft cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5 transition-all" data-testid={`task-card-${t.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-semibold truncate">{t.title}</h3>
                    <PriorityBadge priority={t.priority} />
                    {t.meeting_id && <span className="inline-flex items-center gap-1 text-xs text-primary"><Video className="h-3 w-3" /> Rapat</span>}
                  </div>
                  {personName(t.requester) && <p className="text-xs text-muted-foreground mb-2">Pemberi: {personName(t.requester)}</p>}
                  <div className="flex items-center gap-3 max-w-md">
                    <ProgressBar value={t.progress} className="flex-1" />
                    <span className="text-xs text-muted-foreground font-medium w-9 text-right">{t.progress}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={t.status} />
                  {personName(t.pic) && <span className="text-xs text-muted-foreground">PIC: {personName(t.pic)}</span>}
                  {t.deadline && <span className="text-xs text-muted-foreground">{new Date(t.deadline).toLocaleDateString("id-ID")}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
