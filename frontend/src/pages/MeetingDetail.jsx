import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import RichTextEditor from "@/components/RichTextEditor";
import AttachmentPanel from "@/components/AttachmentPanel";
import { StatusBadge, SectionCard } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Modal } from "@/components/Modal";
import { ArrowLeft, Trash2, Save, CalendarDays, Clock, MapPin, Users2, Loader2, Pencil, Paperclip, Upload, ListTodo, Megaphone, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [tab, setTab] = useState("notes");
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waLinks, setWaLinks] = useState([]);
  const attachRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setMeeting(data);
      setNotes(data.notes || "");
      setDecisions(data.decisions || "");
    } catch (e) { toast.error(apiError(e)); navigate("/meetings"); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const saveNotes = async () => {
    setSaving(true);
    try { await api.put(`/meetings/${id}`, { notes, decisions }); toast.success("Catatan rapat disimpan"); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    try { await api.delete(`/meetings/${id}`); toast.success("Rapat dihapus"); navigate("/meetings"); }
    catch (e) { toast.error(apiError(e)); }
  };

  const broadcast = async () => {
    setBroadcasting(true);
    try {
      const { data } = await api.post(`/meetings/${id}/broadcast`, {});
      const parts = [];
      if (data.email_sent) parts.push(`Email ke ${data.email_sent} peserta`);
      if (data.push_sent) parts.push(`Notifikasi browser ke ${data.push_sent} peserta`);
      if (data.telegram_sent) parts.push("Telegram grup");
      if ((data.wa_urls || []).length) parts.push(`${data.wa_urls.length} tautan WhatsApp`);
      if (parts.length) toast.success("Pemberitahuan terkirim: " + parts.join(", "));
      else toast.info("Tidak ada kanal aktif / kontak peserta. Atur di menu Kelola Notifikasi.");
      if ((data.wa_urls || []).length) { setWaLinks(data.wa_urls); setWaOpen(true); }
    } catch (e) { toast.error(apiError(e)); }
    finally { setBroadcasting(false); }
  };

  if (!meeting) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <button onClick={() => navigate("/meetings")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="btn-back">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Kelola Rapat
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent text-accent-foreground mb-2">{meeting.meeting_type}</span>
          <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-2">
            {meeting.date && <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {new Date(meeting.date).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>}
            {meeting.start_time && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {meeting.start_time} {meeting.end_time && `– ${meeting.end_time}`}</span>}
            {meeting.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {meeting.location}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" size="icon" onClick={() => navigate(`/meetings/${id}/edit`)} data-testid="btn-edit-meeting"><Pencil className="h-4 w-4" /></Button>
          <Button variant="secondary" size="icon" className="text-destructive" onClick={() => setDelOpen(true)} data-testid="btn-delete-meeting"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <SectionCard
              headerClassName="py-3"
              header={(
                <TabsList className="rounded-xl">
                  <TabsTrigger value="notes" className="rounded-lg" data-testid="tab-notes">Catatan</TabsTrigger>
                  <TabsTrigger value="decisions" className="rounded-lg" data-testid="tab-decisions">Keputusan</TabsTrigger>
                  <TabsTrigger value="agenda" className="rounded-lg" data-testid="tab-agenda">Agenda</TabsTrigger>
                </TabsList>
              )}
              footer={tab !== "agenda" ? (
                <div className="flex justify-end">
                  <Button onClick={saveNotes} disabled={saving} data-testid="btn-save-notes">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan {tab === "decisions" ? "Keputusan" : "Catatan"}</Button>
                </div>
              ) : null}
            >
              <TabsContent value="notes" className="mt-0">
                <RichTextEditor value={notes} onChange={setNotes} placeholder="Tulis notulen rapat di sini..." minHeight={300} />
              </TabsContent>
              <TabsContent value="decisions" className="mt-0">
                <RichTextEditor value={decisions} onChange={setDecisions} placeholder="Catat keputusan rapat..." minHeight={300} />
              </TabsContent>
              <TabsContent value="agenda" className="mt-0">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{meeting.agenda || "Tidak ada agenda."}</p>
              </TabsContent>
            </SectionCard>
          </Tabs>
        </div>

        <div className="space-y-6">
          {/* Lampiran (paling atas) */}
          <SectionCard
            icon={Paperclip}
            title="Lampiran"
            headerRight={<Button size="sm" variant="secondary" onClick={() => attachRef.current?.open()} data-testid="btn-upload-attachment"><Upload className="h-4 w-4 mr-1.5" /> Unggah</Button>}
          >
            <AttachmentPanel ref={attachRef} module="meeting" parentId={id} hideHeader />
          </SectionCard>

          {/* Peserta */}
          <SectionCard
            icon={Users2}
            title="Peserta"
            footer={(
              <div className="w-full space-y-2">
                <Button className="w-full rounded-xl" variant="secondary" onClick={broadcast} disabled={broadcasting || (meeting.participants || []).length === 0} data-testid="btn-broadcast-meeting">
                  {broadcasting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Megaphone className="h-4 w-4 mr-1.5" />} Kirim Pemberitahuan
                </Button>
                <p className="text-xs text-muted-foreground">Broadcast via Email & WhatsApp ke seluruh peserta rapat.</p>
              </div>
            )}
          >
            <div className="flex flex-wrap gap-2">
              {(meeting.participants || []).map((p, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium">{p}</span>)}
              {(meeting.participants || []).length === 0 && <p className="text-xs text-muted-foreground">Belum ada peserta.</p>}
            </div>
          </SectionCard>

          {/* Tugas Turunan (jika ada) */}
          {(meeting.generated_tasks || []).length > 0 && (
            <SectionCard icon={ListTodo} title="Tugas Turunan">
              <div className="space-y-2">
                {meeting.generated_tasks.map((t) => (
                  <button key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="w-full text-left p-2.5 rounded-lg border border-border hover:bg-secondary/50 flex items-center justify-between gap-2 transition-colors" data-testid={`generated-task-${t.id}`}>
                    <span className="text-sm truncate">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title="Hapus rapat ini?" description="Rapat akan dipindahkan ke Arsip dan dapat dipulihkan. Tugas turunan tetap ada." onConfirm={remove} />

      <Modal
        open={waOpen}
        onOpenChange={setWaOpen}
        title="Kirim WhatsApp ke Peserta"
        description="WhatsApp bersifat manual — klik untuk membuka chat berisi pesan pemberitahuan."
        size="md"
        footer={<Button variant="ghost" onClick={() => setWaOpen(false)}>Tutup</Button>}
      >
        <div className="space-y-2">
          {waLinks.map((w, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border">
              <span className="text-sm font-medium truncate">{w.name}</span>
              <a href={w.url} target="_blank" rel="noreferrer">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid={`wa-link-${i}`}><MessageCircle className="h-4 w-4 mr-1.5" /> Buka WhatsApp</Button>
              </a>
            </div>
          ))}
          {waLinks.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada peserta dengan nomor telepon.</p>}
        </div>
      </Modal>
    </div>
  );
}
