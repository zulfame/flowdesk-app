import React, { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Plus, Trash2, Repeat, CalendarClock } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS = { today: "Hari Ini", tomorrow: "Besok", custom: "Tanggal Khusus", recurring: "Berulang" };

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", remind_type: "custom", date: "", recurrence: "daily" });

  const load = useCallback(async () => {
    try { const { data } = await api.get("/reminders"); setReminders(data); } catch (e) { toast.error(apiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    let date = form.date;
    const today = new Date();
    if (form.remind_type === "today") date = today.toISOString().slice(0, 10);
    if (form.remind_type === "tomorrow") { today.setDate(today.getDate() + 1); date = today.toISOString().slice(0, 10); }
    try {
      await api.post("/reminders", { ...form, date, recurrence: form.remind_type === "recurring" ? form.recurrence : null });
      toast.success("Pengingat dibuat");
      setOpen(false); setForm({ title: "", description: "", remind_type: "custom", date: "", recurrence: "daily" });
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const toggle = async (r) => {
    try { await api.put(`/reminders/${r.id}`, { done: !r.done }); load(); } catch (e) { toast.error(apiError(e)); }
  };
  const remove = async (id) => {
    try { await api.delete(`/reminders/${id}`); toast.success("Pengingat dihapus"); load(); } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div>
      <PageHeader title="Pengingat" subtitle="Jangan lewatkan hal penting — hari ini, besok, atau berulang.">
        <Button onClick={() => setOpen(true)} className="rounded-xl" data-testid="btn-add-reminder"><Plus className="h-4 w-4 mr-1.5" /> Pengingat</Button>
      </PageHeader>

      {reminders.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={Bell} title="Belum ada pengingat" description="Buat pengingat untuk tetap di atas segala hal." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Pengingat</Button>} /></Card>
      ) : (
        <div className="grid gap-3">
          {reminders.map((r) => (
            <Card key={r.id} className="p-4 rounded-2xl shadow-soft flex items-center gap-4" data-testid={`reminder-${r.id}`}>
              <input type="checkbox" checked={r.done} onChange={() => toggle(r)} className="h-5 w-5 rounded accent-indigo-600 shrink-0" data-testid={`reminder-toggle-${r.id}`} />
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${r.done ? "line-through text-muted-foreground" : ""}`}>{r.title}</p>
                {r.description && <p className="text-sm text-muted-foreground truncate">{r.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {TYPE_LABELS[r.remind_type]}</span>
                  {r.date && <span>{new Date(r.date).toLocaleDateString("id-ID")}</span>}
                  {r.recurrence && <span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> {r.recurrence}</span>}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => remove(r.id)} data-testid={`btn-delete-reminder-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pengingat Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="reminder-title-input" /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} data-testid="reminder-desc-input" /></div>
            <div className="space-y-1.5">
              <Label>Jenis</Label>
              <Select value={form.remind_type} onValueChange={(v) => setForm({ ...form, remind_type: v })}>
                <SelectTrigger data-testid="reminder-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.remind_type === "custom" && <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="reminder-date-input" /></div>}
            {form.remind_type === "recurring" && (
              <div className="space-y-1.5">
                <Label>Pengulangan</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger data-testid="reminder-recurrence-select"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem></SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} data-testid="btn-save-reminder">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
