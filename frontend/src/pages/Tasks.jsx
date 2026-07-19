import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader, StatusBadge, PriorityBadge, ProgressBar, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckSquare, Trash2, X, Video } from "lucide-react";
import { toast } from "sonner";

const STATUS_FILTERS = ["Semua", "Pending", "On Progress", "Completed", "Overdue"];
const STATUS_LABEL = { Semua: "Semua", Pending: "Menunggu", "On Progress": "Berjalan", Completed: "Selesai", Overdue: "Terlambat" };

export function TaskDialog({ open, onOpenChange, task, onSaved }) {
  const editing = !!task;
  const [form, setForm] = useState({ title: "", description: "", requester: "", pic: "", priority: "Medium", deadline: "", status: "Pending" });
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title || "", description: task.description || "", requester: task.requester || "",
          pic: task.pic || "", priority: task.priority || "Medium",
          deadline: task.deadline ? task.deadline.slice(0, 10) : "", status: task.status,
        });
        setChecklist(task.checklist || []);
      } else {
        setForm({ title: "", description: "", requester: "", pic: "", priority: "Medium", deadline: "", status: "Pending" });
        setChecklist([]);
      }
      setNewItem("");
    }
  }, [open, task]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setChecklist([...checklist, { text: newItem.trim(), done: false }]);
    setNewItem("");
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    setSaving(true);
    const payload = {
      ...form,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      checklist,
    };
    try {
      if (editing) await api.put(`/tasks/${task.id}`, payload);
      else await api.post("/tasks", payload);
      toast.success(editing ? "Tugas diperbarui" : "Tugas berhasil dibuat");
      onOpenChange(false);
      onSaved && onSaved();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Ubah Tugas" : "Tugas Baru"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Judul *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Siapkan laporan bulanan" data-testid="task-title-input" />
          </div>
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detail pekerjaan..." rows={3} data-testid="task-desc-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Pemohon</Label><Input value={form.requester} onChange={(e) => setForm({ ...form, requester: e.target.value })} placeholder="Nama" data-testid="task-requester-input" /></div>
            <div className="space-y-1.5"><Label>PIC</Label><Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })} placeholder="Penanggung jawab" data-testid="task-pic-input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioritas</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Rendah</SelectItem>
                  <SelectItem value="Medium">Sedang</SelectItem>
                  <SelectItem value="High">Tinggi</SelectItem>
                  <SelectItem value="Urgent">Mendesak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Tenggat</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} data-testid="task-deadline-input" /></div>
          </div>
          {editing && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="task-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Draft", "Pending", "On Progress", "Completed", "Overdue", "Cancelled", "Archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Status & progres dihitung otomatis dari checklist. Ubah manual hanya untuk Draf/Batal/Arsip.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Checklist ({checklist.filter((c) => c.done).length}/{checklist.length})</Label>
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="checkbox" checked={item.done} onChange={() => setChecklist(checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c))} className="h-4 w-4 rounded accent-indigo-600" data-testid={`checklist-toggle-${idx}`} />
                  <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                  <button onClick={() => setChecklist(checklist.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())} placeholder="Tambah item checklist..." data-testid="checklist-input" />
              <Button type="button" variant="secondary" onClick={addItem} data-testid="btn-add-checklist"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={save} disabled={saving} data-testid="btn-save-task">{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("Semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks");
      setTasks(data);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (params.get("new")) { setDialogOpen(true); params.delete("new"); setParams(params, { replace: true }); } }, [params, setParams]);

  const filtered = filter === "Semua" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div>
      <PageHeader title="Manajemen Tugas" subtitle="Setiap tugas mewakili satu permintaan pekerjaan.">
        <Button onClick={() => setDialogOpen(true)} className="rounded-xl" data-testid="btn-tambah-tugas">
          <Plus className="h-4 w-4 mr-1.5" /> Tugas Baru
        </Button>
      </PageHeader>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList className="rounded-xl">
          {STATUS_FILTERS.map((f) => (
            <TabsTrigger key={f} value={f} className="rounded-lg" data-testid={`filter-${f.toLowerCase().replace(/\s/g, "-")}`}>{STATUS_LABEL[f]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-secondary/50 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl shadow-soft">
          <EmptyState icon={CheckSquare} title="Belum ada tugas" description="Buat tugas pertama untuk mulai mengatur pekerjaan Anda." action={<Button onClick={() => setDialogOpen(true)} data-testid="btn-empty-new-task"><Plus className="h-4 w-4 mr-1.5" /> Tugas Baru</Button>} />
        </Card>
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
                  {t.description && <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{t.description}</p>}
                  <div className="flex items-center gap-3 max-w-md">
                    <ProgressBar value={t.progress} className="flex-1" />
                    <span className="text-xs text-muted-foreground font-medium w-9 text-right">{t.progress}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusBadge status={t.status} />
                  {t.pic && <span className="text-xs text-muted-foreground">PIC: {t.pic}</span>}
                  {t.deadline && <span className="text-xs text-muted-foreground">{new Date(t.deadline).toLocaleDateString("id-ID")}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} />
    </div>
  );
}
