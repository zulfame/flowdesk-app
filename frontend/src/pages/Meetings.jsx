import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState, SectionCard } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Video, MapPin, Clock, Users2, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const TYPE_META = {
  Internal: { accent: "border-l-indigo-500", dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  Eksternal: { accent: "border-l-amber-500", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  Online: { accent: "border-l-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  Klien: { accent: "border-l-rose-500", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  Review: { accent: "border-l-violet-500", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
};
const initials = (name) => (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const AVATAR_BG = ["bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-sky-500"];

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
            {Object.keys(TYPE_META).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-lg bg-secondary/50 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-lg shadow-soft"><EmptyState icon={Video} title="Belum ada rapat" description="Buat rapat untuk mencatat agenda, keputusan, dan lampiran." action={<Button onClick={() => navigate("/meetings/new")}><Plus className="h-4 w-4 mr-1.5" /> Rapat Baru</Button>} /></Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((m) => {
            const meta = TYPE_META[m.meeting_type] || { accent: "border-l-slate-400", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700" };
            const parts = m.participants || [];
            const shortDate = m.date ? new Date(m.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;
            return (
              <SectionCard
                key={m.id}
                onClick={() => navigate(`/meetings/${m.id}`)}
                data-testid={`meeting-card-${m.id}`}
                className={cn("group cursor-pointer border-l-4 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all", meta.accent)}
                headerClassName="py-3"
                header={<span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", meta.badge)}><span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {m.meeting_type}</span>}
                headerRight={shortDate && <span className="text-xs font-medium text-muted-foreground">{shortDate}</span>}
                footer={(
                  <div className="flex items-center justify-between">
                    {parts.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {parts.slice(0, 4).map((p, i) => (
                            <span key={i} className={cn("h-7 w-7 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-bold text-white", AVATAR_BG[i % AVATAR_BG.length])} title={p}>{initials(p)}</span>
                          ))}
                        </div>
                        {parts.length > 4 && <span className="text-xs text-muted-foreground">+{parts.length - 4}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5" /> Tanpa peserta</span>
                    )}
                    <span className="text-xs font-medium text-primary inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Lihat detail <ArrowRight className="h-3.5 w-3.5" /></span>
                  </div>
                )}
              >
                <h3 className="font-semibold text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">{m.title}</h3>
                <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {(m.start_time || m.end_time) && <div className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0" /> {m.start_time} {m.end_time && `– ${m.end_time}`}</div>}
                  {m.location && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /> <span className="truncate">{m.location}</span></div>}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
