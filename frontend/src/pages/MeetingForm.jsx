import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Video, Plus, X } from "lucide-react";
import { toast } from "sonner";

const TYPES = ["Internal", "Eksternal", "Online", "Klien", "Review"];
const empty = { title: "", date: "", start_time: "", end_time: "", location: "", meeting_type: "Internal", participants: [], agenda: "" };

function Field({ label, children, required }) {
  return <div className="space-y-1.5"><Label>{label}{required && <span className="text-destructive"> *</span>}</Label>{children}</div>;
}

export default function MeetingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = !!id;
  const [form, setForm] = useState(empty);
  const [participantInput, setParticipantInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setForm({ title: data.title || "", date: data.date || "", start_time: data.start_time || "", end_time: data.end_time || "",
        location: data.location || "", meeting_type: data.meeting_type || "Internal", participants: data.participants || [], agenda: data.agenda || "" });
    } catch (e) { toast.error(apiError(e)); navigate("/meetings"); }
    finally { setLoading(false); }
  }, [id, navigate]);
  useEffect(() => { if (editing) load(); }, [editing, load]);

  const addParticipant = () => {
    const v = participantInput.trim();
    if (v && !form.participants.includes(v)) setForm({ ...form, participants: [...form.participants, v] });
    setParticipantInput("");
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul rapat wajib diisi"); return; }
    setSaving(true);
    try {
      if (editing) { await api.put(`/meetings/${id}`, form); toast.success("Rapat diperbarui"); navigate(`/meetings/${id}`); }
      else { const { data } = await api.post("/meetings", form); toast.success("Rapat dibuat"); navigate(`/meetings/${data.id}`); }
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <button onClick={() => navigate(editing ? `/meetings/${id}` : "/meetings")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="btn-back">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-lg bg-accent flex items-center justify-center"><Video className="h-5 w-5 text-primary" /></div>
          <h1 className="text-2xl font-bold tracking-tight">{editing ? "Ubah Rapat" : "Rapat Baru"}</h1>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button variant="ghost" onClick={() => navigate(editing ? `/meetings/${id}` : "/meetings")} className="rounded-xl">Batal</Button>
          <Button onClick={save} disabled={saving} className="rounded-xl" data-testid="btn-save-meeting">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-lg shadow-soft space-y-4" data-testid="meeting-main-card">
            <h2 className="font-semibold">Informasi Rapat</h2>
            <Field label="Judul Rapat" required><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Rapat Mingguan Tim" data-testid="meeting-title-input" /></Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Jenis Rapat">
                <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v })}>
                  <SelectTrigger data-testid="meeting-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Lokasi / Tautan"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ruang rapat / link meeting" data-testid="meeting-location-input" /></Field>
            </div>
            <Field label="Agenda"><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} rows={5} placeholder="Poin-poin agenda rapat..." data-testid="meeting-agenda-input" /></Field>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-lg shadow-soft space-y-4" data-testid="meeting-schedule-card">
            <h2 className="font-semibold">Jadwal</h2>
            <Field label="Tanggal"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="meeting-date-input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mulai"><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} data-testid="meeting-start-input" /></Field>
              <Field label="Selesai"><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} data-testid="meeting-end-input" /></Field>
            </div>
          </Card>

          <Card className="p-6 rounded-lg shadow-soft space-y-3" data-testid="meeting-participants-card">
            <h2 className="font-semibold">Peserta</h2>
            <div className="flex gap-2">
              <Input value={participantInput} onChange={(e) => setParticipantInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addParticipant())} placeholder="Nama peserta" data-testid="meeting-participant-input" />
              <Button variant="secondary" onClick={addParticipant} className="rounded-xl shrink-0" data-testid="btn-add-participant"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.participants.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-xs font-medium" data-testid={`participant-chip-${i}`}>
                  {p}<button onClick={() => setForm({ ...form, participants: form.participants.filter((_, j) => j !== i) })} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {form.participants.length === 0 && <p className="text-xs text-muted-foreground">Belum ada peserta.</p>}
            </div>
          </Card>

          <Button onClick={save} disabled={saving} className="w-full rounded-xl sm:hidden" data-testid="btn-save-meeting-mobile">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan</Button>
        </div>
      </div>
    </div>
  );
}
