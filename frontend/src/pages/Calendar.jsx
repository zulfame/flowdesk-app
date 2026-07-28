import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const TYPE_LABELS = { meeting: "Rapat", task: "Tenggat Tugas", reminder: "Pengingat", event: "Acara" };

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", description: "" });
  const navigate = useNavigate();

  const load = () => api.get("/calendar").then(({ data }) => setEvents(data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsFor = (day) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === ds);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const saveEvent = async () => {
    if (!form.title.trim() || !form.date) { toast.error("Judul dan tanggal wajib diisi"); return; }
    try {
      await api.post("/events", { ...form, date: form.date });
      toast.success("Acara ditambahkan");
      setOpen(false); setForm({ title: "", date: "", description: "" });
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  return (
    <div>
      <PageHeader title="Kalender" subtitle="Rapat, tenggat tugas, pengingat, dan acara dalam satu tampilan.">
        <Button onClick={() => setOpen(true)} className="rounded-xl" data-testid="btn-add-event"><Plus className="h-4 w-4 mr-1.5" /> Acara</Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        {Object.entries(TYPE_LABELS).map(([k, v]) => {
          const colors = { meeting: "#4F46E5", task: "#F59E0B", reminder: "#10B981", event: "#8B5CF6" };
          return <div key={k} className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[k] }} /> {v}</div>;
        })}
      </div>

      <Card className="p-4 sm:p-6 rounded-lg shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">{MONTHS[month]} {year}</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" onClick={() => setCurrent(new Date(year, month - 1, 1))} data-testid="btn-prev-month"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrent(new Date())} data-testid="btn-today">Hari Ini</Button>
            <Button variant="secondary" size="icon" onClick={() => setCurrent(new Date(year, month + 1, 1))} data-testid="btn-next-month"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {DAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = eventsFor(day);
            const isToday = ds === todayStr;
            return (
              <div key={i} className={`min-h-[84px] sm:min-h-[104px] rounded-xl border p-1.5 sm:p-2 ${isToday ? "border-primary bg-accent/50" : "border-border"}`} data-testid={`calendar-day-${day}`}>
                <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <button key={idx} onClick={() => e.link && navigate(e.link)} className="w-full text-left text-[10px] sm:text-xs px-1.5 py-0.5 rounded truncate text-white font-medium" style={{ background: e.color }} data-testid={`calendar-event-${e.id}`} title={e.title}>
                      {e.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} lagi</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Acara</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="event-title-input" /></div>
            <div className="space-y-1.5"><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="event-date-input" /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="event-desc-input" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={saveEvent} data-testid="btn-save-event">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
