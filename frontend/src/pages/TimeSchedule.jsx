import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canManage } from "@/lib/perms";
import { PageHeader, EmptyState } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { CalendarRange, Plus, Pencil, Trash2, ListChecks, CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const empty = { title: "", event_name: "", section: "", description: "", start_date: "", end_date: "" };

function fmt(d) { return d ? new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"; }

export default function TimeSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [delId, setDelId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/time-schedules"); setItems(data); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s, e) => { e.stopPropagation(); setEditing(s); setForm({ title: s.title, event_name: s.event_name || "", section: s.section || "", description: s.description || "", start_date: s.start_date || "", end_date: s.end_date || "" }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    setSaving(true);
    try {
      if (editing) await api.put(`/time-schedules/${editing.id}`, form);
      else await api.post("/time-schedules", form);
      toast.success("Jadwal disimpan");
      setOpen(false); load();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const remove = async () => { try { await api.delete(`/time-schedules/${delId}`); toast.success("Jadwal dihapus"); setDelId(null); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div>
      <PageHeader title="Time Schedule" subtitle="Rencana kegiatan berbasis linimasa (Gantt) untuk setiap acara.">
        <Button onClick={openNew} className="rounded-xl" data-testid="btn-add-schedule"><Plus className="h-4 w-4 mr-1.5" /> Jadwal</Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="rounded-lg shadow-soft"><EmptyState icon={CalendarRange} title="Belum ada jadwal" description="Buat time schedule untuk memetakan kegiatan dari awal hingga hari-H." action={<Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" /> Jadwal</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id} className="p-5 rounded-lg shadow-soft flex flex-col gap-3 group hover:shadow-soft-lg transition-all cursor-pointer" onClick={() => navigate(`/time-schedule/${s.id}`)} data-testid={`schedule-${s.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug truncate">{s.title}</h3>
                  {s.event_name && <p className="text-sm text-muted-foreground truncate">{s.event_name}</p>}
                </div>
                {canManage(user, s) && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(s, e)} data-testid={`btn-edit-schedule-${s.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDelId(s.id); }} data-testid={`btn-delete-schedule-${s.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
              {s.section && <span className="text-xs px-2 py-1 rounded-full bg-accent text-accent-foreground font-medium w-fit">{s.section}</span>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-auto">
                <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {fmt(s.start_date)} – {fmt(s.end_date)}</span>
                <span className="inline-flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {(s.activities || []).length} kegiatan</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Ubah Jadwal" : "Jadwal Baru"}</DialogTitle><DialogDescription>Isi informasi umum jadwal. Kegiatan ditambahkan di halaman detail.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul Jadwal</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. TS Dekorasi & Dokumentasi" data-testid="schedule-title-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Nama Acara / Event</Label><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} data-testid="schedule-event-input" /></div>
              <div className="space-y-1.5"><Label>Seksi / Panitia</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} data-testid="schedule-section-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tanggal Mulai</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} data-testid="schedule-start-input" /></div>
              <div className="space-y-1.5"><Label>Tanggal Selesai</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} data-testid="schedule-end-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="schedule-desc-input" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} disabled={saving} data-testid="btn-save-schedule">{saving ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)} title="Hapus jadwal?" description="Jadwal beserta seluruh kegiatannya akan dihapus." onConfirm={remove} />
    </div>
  );
}
