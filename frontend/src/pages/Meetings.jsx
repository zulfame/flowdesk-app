import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Video, MapPin, Clock, Users2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", date: "", start_time: "", end_time: "", location: "", meeting_type: "Internal", participants: "", agenda: "" });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/meetings"); setMeetings(data); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul rapat wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = { ...form, participants: form.participants.split(",").map((p) => p.trim()).filter(Boolean) };
      const { data } = await api.post("/meetings", payload);
      toast.success("Rapat berhasil dibuat");
      setOpen(false);
      setForm({ title: "", date: "", start_time: "", end_time: "", location: "", meeting_type: "Internal", participants: "", agenda: "" });
      navigate(`/meetings/${data.id}`);
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Kelola Rapat" subtitle="Rapat adalah buku catatan digital, bukan sekadar jadwal.">
        <Button onClick={() => setOpen(true)} className="rounded-xl" data-testid="btn-tambah-rapat"><Plus className="h-4 w-4 mr-1.5" /> Rapat Baru</Button>
      </PageHeader>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-secondary/50 animate-pulse" />)}</div>
      ) : meetings.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={Video} title="Belum ada rapat" description="Buat rapat untuk mencatat agenda, keputusan, dan action item." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Rapat Baru</Button>} /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {meetings.map((m) => (
            <Card key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="p-5 rounded-2xl shadow-soft cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5 transition-all" data-testid={`meeting-card-${m.id}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">{m.meeting_type}</span>
                {(m.action_items || []).length > 0 && <span className="text-xs text-muted-foreground">{m.action_items.length} action item</span>}
              </div>
              <h3 className="font-semibold text-lg mb-3 truncate">{m.title}</h3>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                {m.date && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {new Date(m.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>}
                {(m.start_time || m.end_time) && <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {m.start_time} {m.end_time && `– ${m.end_time}`}</div>}
                {m.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {m.location}</div>}
                {(m.participants || []).length > 0 && <div className="flex items-center gap-2"><Users2 className="h-4 w-4" /> {m.participants.length} peserta</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Rapat Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Rapat Mingguan Tim" data-testid="meeting-title-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="meeting-date-input" /></div>
              <div className="space-y-1.5">
                <Label>Jenis</Label>
                <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v })}>
                  <SelectTrigger data-testid="meeting-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Internal", "Eksternal", "Online", "Klien", "Review"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mulai</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} data-testid="meeting-start-input" /></div>
              <div className="space-y-1.5"><Label>Selesai</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} data-testid="meeting-end-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Lokasi</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ruang rapat / link" data-testid="meeting-location-input" /></div>
            <div className="space-y-1.5"><Label>Peserta (pisahkan dengan koma)</Label><Input value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} placeholder="Budi, Siti, Andi" data-testid="meeting-participants-input" /></div>
            <div className="space-y-1.5"><Label>Agenda</Label><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={3} placeholder="Poin-poin agenda..." data-testid="meeting-agenda-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} data-testid="btn-save-meeting">{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
