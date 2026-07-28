import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const TYPE_LABELS = { meeting: "Rapat", task: "Tenggat Tugas", reminder: "Pengingat" };

export default function Calendar() {
  const [current, setCurrent] = useState(new Date());
  const [events, setEvents] = useState([]);
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

  return (
    <div>
      <PageHeader title="Kalender" subtitle="Seluruh rapat, tenggat tugas, dan pengingat perusahaan dalam satu tampilan." />

      <div className="flex flex-wrap items-center gap-4 mb-4">
        {Object.entries(TYPE_LABELS).map(([k, v]) => {
          const colors = { meeting: "#4F46E5", task: "#F59E0B", reminder: "#10B981" };
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
    </div>
  );
}
