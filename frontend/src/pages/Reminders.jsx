import React, { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Trash2, Repeat, Clock, CalendarClock, Mail, Send, Radio, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS = { today: "Hari Ini", tomorrow: "Besok", custom: "Tanggal Khusus", recurring: "Berulang" };
const RECUR_LABELS = { daily: "Harian", weekly: "Mingguan", monthly: "Bulanan" };
const emptyForm = { title: "", description: "", remind_type: "custom", date: "", time: "09:00", recurrence: "daily", broadcast: false, channels: [] };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "-"; }

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [tab, setTab] = useState("active");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/reminders", { params: { status: tab, page_size: 200 } }); setReminders(data.items); }
    catch (e) { toast.error(apiError(e)); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const toggleChannel = (c) => setForm((f) => ({ ...f, channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c] }));

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    let date = form.date;
    const today = new Date();
    if (form.remind_type === "today") date = today.toISOString().slice(0, 10);
    if (form.remind_type === "tomorrow") { today.setDate(today.getDate() + 1); date = today.toISOString().slice(0, 10); }
    if ((form.remind_type === "custom" || form.remind_type === "recurring") && !date) { toast.error("Tanggal wajib diisi"); return; }
    setSaving(true);
    try {
      await api.post("/reminders", {
        title: form.title, description: form.description, remind_type: form.remind_type,
        date, time: form.time, recurrence: form.remind_type === "recurring" ? form.recurrence : null,
        broadcast: form.broadcast, channels: form.broadcast ? form.channels : [],
      });
      toast.success("Pengingat dibuat");
      setOpen(false); setForm(emptyForm); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const toggleDone = async (r) => { try { await api.put(`/reminders/${r.id}`, { done: !r.done }); load(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async () => { try { await api.delete(`/reminders/${delId}`); toast.success("Pengingat dihapus"); setDelId(null); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div>
      <PageHeader title="Ingatkan Saya" subtitle="Pengingat pribadi Anda — bisa dikirim ke email atau Telegram tepat waktu.">
        <Button onClick={() => { setForm(emptyForm); setOpen(true); }} className="rounded-xl" data-testid="btn-add-reminder"><Plus className="h-4 w-4 mr-1.5" /> Pengingat</Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="rounded-xl">
          <TabsTrigger value="active" className="rounded-lg" data-testid="reminder-tab-active">Aktif</TabsTrigger>
          <TabsTrigger value="done" className="rounded-lg" data-testid="reminder-tab-done">Selesai</TabsTrigger>
          <TabsTrigger value="all" className="rounded-lg" data-testid="reminder-tab-all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      {reminders.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={Bell} title="Belum ada pengingat" description="Buat pengingat agar tidak melewatkan hal penting." action={<Button onClick={() => setOpen(true)} className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" /> Pengingat</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.map((r) => (
            <Card key={r.id} className={`p-5 rounded-2xl shadow-soft flex flex-col gap-3 group hover:shadow-soft-lg transition-all ${r.done ? "opacity-70" : ""}`} data-testid={`reminder-${r.id}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleDone(r)} className="shrink-0 mt-0.5" data-testid={`reminder-toggle-${r.id}`}>
                  {r.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold leading-snug ${r.done ? "line-through text-muted-foreground" : ""}`}>{r.title}</p>
                  {r.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                </div>
                <button onClick={() => setDelId(r.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0" data-testid={`btn-delete-reminder-${r.id}`}><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium"><CalendarClock className="h-3 w-3" /> {TYPE_LABELS[r.remind_type]}</span>
                {r.date && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground">{fmtDate(r.date)}</span>}
                {r.time && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground"><Clock className="h-3 w-3" /> {r.time}</span>}
                {r.recurrence && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary text-muted-foreground"><Repeat className="h-3 w-3" /> {RECUR_LABELS[r.recurrence]}</span>}
                {r.broadcast && (r.channels || []).map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {c === "email" ? <Mail className="h-3 w-3" /> : <Send className="h-3 w-3" />} {c === "email" ? "Email" : "Telegram"}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pengingat Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="reminder-title-input" /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} data-testid="reminder-desc-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <Select value={form.remind_type} onValueChange={(v) => setForm({ ...form, remind_type: v })}>
                  <SelectTrigger data-testid="reminder-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Waktu</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} data-testid="reminder-time-input" /></div>
            </div>
            {form.remind_type === "custom" && <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="reminder-date-input" /></div>}
            {form.remind_type === "recurring" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Mulai Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="reminder-date-input" /></div>
                <div className="space-y-1.5">
                  <Label>Pengulangan</Label>
                  <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                    <SelectTrigger data-testid="reminder-recurrence-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(RECUR_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Radio className="h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Broadcast Pengingat</p><p className="text-xs text-muted-foreground">Kirim otomatis saat waktunya tiba</p></div></div>
                <Switch checked={form.broadcast} onCheckedChange={(v) => setForm({ ...form, broadcast: v })} data-testid="reminder-broadcast-switch" />
              </div>
              {form.broadcast && (
                <div className="flex gap-2">
                  {[{ k: "email", label: "Email", icon: Mail }, { k: "telegram", label: "Telegram", icon: Send }].map(({ k, label, icon: Icon }) => (
                    <button key={k} type="button" onClick={() => toggleChannel(k)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors ${form.channels.includes(k) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground"}`} data-testid={`reminder-channel-${k}`}>
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} disabled={saving} data-testid="btn-save-reminder">{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)} title="Hapus pengingat?" description="Pengingat ini akan dihapus permanen." onConfirm={remove} />
    </div>
  );
}
