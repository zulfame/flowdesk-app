import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canManage } from "@/lib/perms";
import { PageHeader } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import UserSelect from "@/components/UserSelect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pencil, Trash2, Download, ListChecks, ClipboardCheck, Loader2, ExternalLink, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY_W = 30;
const CAT = {
  pelaksanaan: { label: "Pelaksanaan", bar: "bg-amber-400", chip: "bg-amber-100 text-amber-800" },
  event: { label: "Event", bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-800" },
  libur: { label: "Hari Libur", bar: "bg-rose-400", chip: "bg-rose-100 text-rose-800" },
};
const emptyActivity = { name: "", section: "", pic: null, start_date: "", end_date: "", category: "pelaksanaan", color: "", status: "Rencana", note: "" };
const SWATCHES = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

function autoProgress(a) {
  if (a.status === "Selesai") return 100;
  if (!a.start_date || !a.end_date) return 0;
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const s = new Date(a.start_date + "T00:00:00");
  const e = new Date(a.end_date + "T00:00:00");
  if (today < s) return 0;
  if (today >= e) return 100;
  return Math.round(((today - s) / ((e - s) || 1)) * 100);
}

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function daysBetween(start, end) {
  if (!start || !end) return [];
  const out = []; const d = new Date(start + "T00:00:00"); const e = new Date(end + "T00:00:00");
  if (isNaN(d) || isNaN(e) || e < d) return [];
  let guard = 0;
  while (d <= e && guard < 800) { out.push(new Date(d)); d.setDate(d.getDate() + 1); guard++; }
  return out;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function TimeScheduleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [users, setUsers] = useState([]);
  const [actOpen, setActOpen] = useState(false);
  const [actForm, setActForm] = useState(emptyActivity);
  const [editingAct, setEditingAct] = useState(null);
  const [delAct, setDelAct] = useState(null);
  const [convert, setConvert] = useState(null); // activity being converted
  const [convForm, setConvForm] = useState({ pic: null, priority: "Medium", deadline: "" });
  const [busy, setBusy] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [meta, setMeta] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/time-schedules/${id}`); setS(data); }
    catch (e) { toast.error(apiError(e)); navigate("/time-schedule"); }
  }, [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/users", { params: { all: true } }).then(({ data }) => setUsers(data.items || [])).catch(() => {}); }, []);

  const editable = s && canManage(user, s);

  const persistActivities = async (activities) => {
    setBusy(true);
    try { const { data } = await api.put(`/time-schedules/${id}`, { activities }); setS(data); return true; }
    catch (e) { toast.error(apiError(e)); return false; }
    finally { setBusy(false); }
  };

  const openAddAct = () => { setEditingAct(null); setActForm({ ...emptyActivity, section: s?.section || "" }); setActOpen(true); };
  const openEditAct = (a) => { setEditingAct(a); setActForm({ name: a.name, section: a.section || "", pic: a.pic || null, start_date: a.start_date || "", end_date: a.end_date || "", category: a.category || "pelaksanaan", color: a.color || "", status: a.status || "Rencana", note: a.note || "" }); setActOpen(true); };

  const saveAct = async () => {
    if (!actForm.name.trim()) { toast.error("Nama kegiatan wajib diisi"); return; }
    if (actForm.start_date && actForm.end_date && actForm.end_date < actForm.start_date) { toast.error("Tanggal selesai tidak boleh sebelum tanggal mulai"); return; }
    const list = [...(s.activities || [])];
    if (editingAct) {
      const i = list.findIndex((x) => x.id === editingAct.id);
      list[i] = { ...editingAct, ...actForm };
    } else list.push({ ...actForm });
    if (await persistActivities(list)) { setActOpen(false); toast.success("Kegiatan disimpan"); }
  };

  const removeAct = async () => {
    const list = (s.activities || []).filter((x) => x.id !== delAct.id);
    if (await persistActivities(list)) { setDelAct(null); toast.success("Kegiatan dihapus"); }
  };

  const openConvert = (a) => { setConvert(a); setConvForm({ pic: a.pic || null, priority: "Medium", deadline: a.end_date || "" }); };
  const doConvert = async () => {
    if (!convForm.pic?.name) { toast.error("PIC wajib dipilih"); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/time-schedules/${id}/activities/${convert.id}/convert-task`, convForm);
      toast.success("Tugas berhasil dibuat");
      setConvert(null); await load();
      navigate(`/tasks/${data.task_id}`);
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  const exportXlsx = async () => {
    try {
      const res = await api.get(`/time-schedules/${id}/export`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `${(s.title || "time-schedule").replace(/\s/g, "_")}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (e) { toast.error(apiError(e)); }
  };

  const openMeta = () => { setMeta({ title: s.title, event_name: s.event_name || "", section: s.section || "", start_date: s.start_date || "", end_date: s.end_date || "", description: s.description || "", holidays: (s.holidays || []).join(", "), event_dates: (s.event_dates || []).join(", ") }); setMetaOpen(true); };
  const saveMeta = async () => {
    const parse = (str) => (str || "").split(",").map((x) => x.trim()).filter(Boolean);
    setBusy(true);
    try {
      const { data } = await api.put(`/time-schedules/${id}`, { title: meta.title, event_name: meta.event_name, section: meta.section, start_date: meta.start_date, end_date: meta.end_date, description: meta.description, holidays: parse(meta.holidays), event_dates: parse(meta.event_dates) });
      setS(data); setMetaOpen(false); toast.success("Jadwal diperbarui");
    } catch (e) { toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  if (!s) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const acts = s.activities || [];
  let start = s.start_date, end = s.end_date;
  if (!start || !end) {
    const ds = acts.map((a) => a.start_date).filter(Boolean);
    const de = acts.map((a) => a.end_date).filter(Boolean);
    if (ds.length) start = start || ds.sort()[0];
    if (de.length) end = end || de.sort().slice(-1)[0];
  }
  const days = daysBetween(start, end);
  const holidays = new Set(s.holidays || []);
  const eventDates = new Set(s.event_dates || []);
  const todayKey = ymd(new Date());

  // month header segments
  const months = [];
  days.forEach((d) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = months[months.length - 1];
    if (last && last.key === key) last.count++;
    else months.push({ key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, count: 1 });
  });

  return (
    <div>
      <PageHeader title={s.title} subtitle={[s.event_name, s.section].filter(Boolean).join(" · ") || "Time Schedule"}>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate("/time-schedule")} data-testid="btn-back-schedule"><ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali</Button>
          <Button variant="outline" className="rounded-xl" onClick={exportXlsx} data-testid="btn-export-schedule"><Download className="h-4 w-4 mr-1.5" /> Ekspor Excel</Button>
          {editable && <Button variant="outline" className="rounded-xl" onClick={openMeta} data-testid="btn-edit-schedule-meta"><Settings2 className="h-4 w-4 mr-1.5" /> Pengaturan</Button>}
          {editable && <Button className="rounded-xl" onClick={openAddAct} data-testid="btn-add-activity"><Plus className="h-4 w-4 mr-1.5" /> Kegiatan</Button>}
        </div>
      </PageHeader>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs">
        {Object.entries(CAT).map(([k, v]) => (<span key={k} className="inline-flex items-center gap-1.5"><span className={cn("h-3 w-5 rounded", v.bar)} /> {v.label}</span>))}
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-rose-50 border border-rose-200" /> Kolom Hari Libur</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded ring-2 ring-primary/60" /> Hari Event</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-4 w-0.5 bg-primary" /> Hari ini</span>
      </div>

      {/* Gantt */}
      <Card className="rounded-lg shadow-soft overflow-hidden mb-6" data-testid="gantt-chart">
        {days.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Tentukan Tanggal Mulai & Selesai jadwal (lewat Pengaturan) atau tambahkan kegiatan bertanggal untuk menampilkan linimasa.</div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: 260 + days.length * DAY_W }}>
              {/* Month row */}
              <div className="flex bg-secondary/60">
                <div className="sticky left-0 z-20 bg-secondary/60 border-r border-border shrink-0" style={{ width: 260 }} />
                {months.map((m) => (<div key={m.key} className="text-[11px] font-semibold text-center border-r border-border py-1 shrink-0" style={{ width: m.count * DAY_W }}>{m.label}</div>))}
              </div>
              {/* Day row */}
              <div className="flex border-t border-border bg-secondary/40">
                <div className="sticky left-0 z-20 bg-secondary/40 border-r border-border px-3 py-2 text-xs font-bold shrink-0 flex items-center" style={{ width: 260 }}>Kegiatan</div>
                {days.map((d, i) => {
                  const key = ymd(d); const wknd = d.getDay() === 0 || d.getDay() === 6;
                  return (<div key={i} className={cn("text-[10px] text-center py-2 border-r border-border/60 shrink-0", (holidays.has(key) || wknd) && "bg-rose-50 text-rose-600", eventDates.has(key) && "ring-2 ring-inset ring-primary/50 font-bold", key === todayKey && "border-l-2 border-primary text-primary font-bold")} style={{ width: DAY_W }} title={d.toLocaleDateString("id-ID")}>{d.getDate()}</div>);
                })}
              </div>
              {/* Activity rows */}
              {acts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground border-t border-border">Belum ada kegiatan. {editable && "Klik \"Kegiatan\" untuk menambah."}</div>
              ) : acts.map((a) => (
                <div key={a.id} className="flex border-t border-border group hover:bg-secondary/20" data-testid={`activity-row-${a.id}`}>
                  <div className="sticky left-0 z-10 bg-card group-hover:bg-secondary/20 border-r border-border px-3 py-2 shrink-0 flex items-center justify-between gap-2" style={{ width: 260 }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={a.name}>{a.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.pic?.name || "Tanpa PIC"}{a.task_id && " · ✓ Tugas"}</p>
                    </div>
                    {editable && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Buat tugas" onClick={() => openConvert(a)} disabled={!!a.task_id} data-testid={`btn-convert-activity-${a.id}`}><ClipboardCheck className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAct(a)} data-testid={`btn-edit-activity-${a.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDelAct(a)} data-testid={`btn-delete-activity-${a.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                  {days.map((d, i) => {
                    const key = ymd(d); const wknd = d.getDay() === 0 || d.getDay() === 6;
                    const on = a.start_date && a.end_date && key >= a.start_date && key <= a.end_date;
                    const isStart = key === a.start_date; const isEnd = key === a.end_date;
                    return (
                      <div key={i} className={cn("shrink-0 border-r border-border/40 flex items-center px-0.5", (holidays.has(key) || wknd) && "bg-rose-50/60", eventDates.has(key) && "bg-primary/5", key === todayKey && "border-l-2 border-primary")} style={{ width: DAY_W, height: 44 }}>
                        {on && <div className={cn("h-5 w-full", !a.color && (CAT[a.category]?.bar || CAT.pelaksanaan.bar), isStart && "rounded-l-full ml-0.5", isEnd && "rounded-r-full mr-0.5", key > todayKey && "opacity-40")} style={a.color ? { backgroundColor: a.color } : undefined} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Activity table (mobile-friendly summary) */}
      <Card className="rounded-lg shadow-soft p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-3"><ListChecks className="h-4 w-4 text-primary" /> Daftar Kegiatan ({acts.length})</h3>
        <div className="space-y-2">
          {acts.map((a) => { const prog = autoProgress(a); return (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border" data-testid={`activity-item-${a.id}`}>
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: a.color || undefined }} data-testid={`activity-dot-${a.id}`}>{!a.color && <span className={cn("block h-3 w-3 rounded-full", CAT[a.category]?.bar)} />}</span>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", CAT[a.category]?.chip)}>{CAT[a.category]?.label}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.start_date || "?"} – {a.end_date || "?"} · {a.pic?.name || "Tanpa PIC"} · {a.status}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1.5 flex-1 max-w-[180px] rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${prog}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground tabular-nums" data-testid={`activity-progress-${a.id}`}>{prog}%</span>
                </div>
              </div>
              {a.task_id && <Button variant="ghost" size="sm" className="h-8" onClick={() => navigate(`/tasks/${a.task_id}`)} data-testid={`link-activity-task-${a.id}`}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Tugas</Button>}
            </div>
          ); })}
          {acts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Belum ada kegiatan.</p>}
        </div>
      </Card>

      {/* Activity dialog */}
      <Dialog open={actOpen} onOpenChange={setActOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAct ? "Ubah Kegiatan" : "Kegiatan Baru"}</DialogTitle><DialogDescription>Isi detail kegiatan pada linimasa.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nama Kegiatan</Label><Input value={actForm.name} onChange={(e) => setActForm({ ...actForm, name: e.target.value })} data-testid="activity-name-input" /></div>
            <div className="space-y-1.5"><Label>Seksi / Panitia</Label><Input value={actForm.section} onChange={(e) => setActForm({ ...actForm, section: e.target.value })} data-testid="activity-section-input" /></div>
            <div className="space-y-1.5"><Label>PIC</Label><UserSelect users={users} value={actForm.pic} onChange={(v) => setActForm({ ...actForm, pic: v })} testid="activity-pic-select" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Tanggal Mulai</Label><Input type="date" value={actForm.start_date} onChange={(e) => setActForm({ ...actForm, start_date: e.target.value })} data-testid="activity-start-input" /></div>
              <div className="space-y-1.5"><Label>Tanggal Selesai</Label><Input type="date" value={actForm.end_date} onChange={(e) => setActForm({ ...actForm, end_date: e.target.value })} data-testid="activity-end-input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kategori</Label>
                <Select value={actForm.category} onValueChange={(v) => setActForm({ ...actForm, category: v })}>
                  <SelectTrigger data-testid="activity-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CAT).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={actForm.status} onValueChange={(v) => setActForm({ ...actForm, status: v })}>
                  <SelectTrigger data-testid="activity-status-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Rencana", "Proses", "Selesai"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Warna Bar (opsional)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {SWATCHES.map((c) => (
                  <button key={c} type="button" onClick={() => setActForm({ ...actForm, color: c })} className={cn("h-7 w-7 rounded-full border-2 transition-transform hover:scale-110", actForm.color === c ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }} data-testid={`activity-color-${c}`} />
                ))}
                <input type="color" value={actForm.color || "#f59e0b"} onChange={(e) => setActForm({ ...actForm, color: e.target.value })} className="h-7 w-10 rounded cursor-pointer bg-transparent" data-testid="activity-color-input" />
                {actForm.color && <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setActForm({ ...actForm, color: "" })} data-testid="activity-color-reset">Reset</Button>}
              </div>
              <p className="text-[11px] text-muted-foreground">Kosongkan untuk memakai warna kategori.</p>
            </div>
            <div className="space-y-1.5"><Label>Catatan</Label><Textarea rows={2} value={actForm.note} onChange={(e) => setActForm({ ...actForm, note: e.target.value })} data-testid="activity-note-input" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setActOpen(false)}>Batal</Button><Button onClick={saveAct} disabled={busy} data-testid="btn-save-activity">{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to task dialog */}
      <Dialog open={!!convert} onOpenChange={(v) => !v && setConvert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Buat Tugas dari Kegiatan</DialogTitle><DialogDescription>Kegiatan "{convert?.name}" akan dijadikan tugas dan tertaut ke jadwal ini.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>PIC Tugas</Label><UserSelect users={users} value={convForm.pic} onChange={(v) => setConvForm({ ...convForm, pic: v })} testid="convert-pic-select" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Prioritas</Label>
                <Select value={convForm.priority} onValueChange={(v) => setConvForm({ ...convForm, priority: v })}>
                  <SelectTrigger data-testid="convert-priority-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low", "Medium", "High", "Urgent"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Tenggat</Label><Input type="date" value={convForm.deadline} onChange={(e) => setConvForm({ ...convForm, deadline: e.target.value })} data-testid="convert-deadline-input" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setConvert(null)}>Batal</Button><Button onClick={doConvert} disabled={busy} data-testid="btn-confirm-convert">{busy ? "Memproses..." : "Buat Tugas"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meta / settings dialog */}
      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pengaturan Jadwal</DialogTitle><DialogDescription>Ubah info umum, rentang tanggal, hari libur, dan hari Event.</DialogDescription></DialogHeader>
          {meta && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label>Judul</Label><Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} data-testid="meta-title-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Nama Acara</Label><Input value={meta.event_name} onChange={(e) => setMeta({ ...meta, event_name: e.target.value })} data-testid="meta-event-input" /></div>
                <div className="space-y-1.5"><Label>Seksi / Panitia</Label><Input value={meta.section} onChange={(e) => setMeta({ ...meta, section: e.target.value })} data-testid="meta-section-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Tanggal Mulai</Label><Input type="date" value={meta.start_date} onChange={(e) => setMeta({ ...meta, start_date: e.target.value })} data-testid="meta-start-input" /></div>
                <div className="space-y-1.5"><Label>Tanggal Selesai</Label><Input type="date" value={meta.end_date} onChange={(e) => setMeta({ ...meta, end_date: e.target.value })} data-testid="meta-end-input" /></div>
              </div>
              <div className="space-y-1.5"><Label>Hari Libur (YYYY-MM-DD, pisahkan koma)</Label><Textarea rows={2} value={meta.holidays} onChange={(e) => setMeta({ ...meta, holidays: e.target.value })} placeholder="2025-12-25, 2026-01-01" data-testid="meta-holidays-input" /></div>
              <div className="space-y-1.5"><Label>Hari Event (YYYY-MM-DD, pisahkan koma)</Label><Textarea rows={2} value={meta.event_dates} onChange={(e) => setMeta({ ...meta, event_dates: e.target.value })} data-testid="meta-events-input" /></div>
              <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea rows={2} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} data-testid="meta-desc-input" /></div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setMetaOpen(false)}>Batal</Button><Button onClick={saveMeta} disabled={busy} data-testid="btn-save-meta">{busy ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delAct} onOpenChange={(v) => !v && setDelAct(null)} title="Hapus kegiatan?" description={`Kegiatan "${delAct?.name}" akan dihapus dari jadwal.`} onConfirm={removeAct} />
    </div>
  );
}
