import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Video, MapPin, Clock, Users2, CalendarDays, Search, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_STYLES = {
  Internal: "bg-indigo-500", Eksternal: "bg-amber-500", Online: "bg-emerald-500", Klien: "bg-rose-500", Review: "bg-violet-500",
};

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/meetings"); setMeetings(data); }
    catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => meetings.filter((m) =>
    (typeFilter === "all" || m.meeting_type === typeFilter) &&
    (!q || m.title?.toLowerCase().includes(q.toLowerCase()) || (m.location || "").toLowerCase().includes(q.toLowerCase()))
  ), [meetings, q, typeFilter]);

  return (
    <div>
      <PageHeader title="Kelola Rapat" subtitle="Rapat adalah buku catatan digital, bukan sekadar jadwal.">
        <Button onClick={() => navigate("/meetings/new")} className="rounded-xl" data-testid="btn-tambah-rapat"><Plus className="h-4 w-4 mr-1.5" /> Rapat Baru</Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul atau lokasi rapat..." className="pl-9 rounded-xl" data-testid="meeting-search" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl" data-testid="meeting-type-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {Object.keys(TYPE_STYLES).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="h-44 rounded-lg bg-secondary/50 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-lg shadow-soft"><EmptyState icon={Video} title="Belum ada rapat" description="Buat rapat untuk mencatat agenda, keputusan, dan action item." action={<Button onClick={() => navigate("/meetings/new")}><Plus className="h-4 w-4 mr-1.5" /> Rapat Baru</Button>} /></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const total = (m.action_items || []).length;
            const done = (m.action_items || []).filter((a) => a.done).length;
            return (
              <Card key={m.id} onClick={() => navigate(`/meetings/${m.id}`)} className="relative rounded-lg shadow-soft cursor-pointer hover:shadow-soft-lg hover:-translate-y-0.5 transition-all overflow-hidden group" data-testid={`meeting-card-${m.id}`}>
                <div className={`absolute top-0 left-0 h-full w-1.5 ${TYPE_STYLES[m.meeting_type] || "bg-slate-400"}`} />
                <div className="p-5 pl-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground">{m.meeting_type}</span>
                    {total > 0 && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Zap className="h-3 w-3" /> {done}/{total}</span>}
                  </div>
                  <h3 className="font-semibold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">{m.title}</h3>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {m.date && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" /> {new Date(m.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</div>}
                    {(m.start_time || m.end_time) && <div className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> {m.start_time} {m.end_time && `– ${m.end_time}`}</div>}
                    {m.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{m.location}</span></div>}
                    {(m.participants || []).length > 0 && <div className="flex items-center gap-2"><Users2 className="h-4 w-4 shrink-0" /> {m.participants.length} peserta</div>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
