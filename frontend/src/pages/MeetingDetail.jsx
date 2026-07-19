import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import RichTextEditor from "@/components/RichTextEditor";
import AttachmentPanel from "@/components/AttachmentPanel";
import { StatusBadge } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Trash2, Save, Zap, Plus, X, CalendarDays, Clock, MapPin, Users2, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [saving, setSaving] = useState(false);

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
    try {
      await api.put(`/meetings/${id}`, { notes, decisions });
      toast.success("Catatan rapat disimpan");
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const updateActionItems = async (items) => {
    setMeeting((m) => ({ ...m, action_items: items }));
    try {
      const { data } = await api.put(`/meetings/${id}`, { action_items: items });
      setMeeting((m) => ({ ...m, action_items: data.action_items }));
    } catch (e) { toast.error(apiError(e)); load(); }
  };

  const addAction = () => {
    if (!newAction.trim()) return;
    const items = [...(meeting.action_items || []), { text: newAction.trim(), assignee: newAssignee.trim(), done: false }];
    setNewAction(""); setNewAssignee("");
    updateActionItems(items);
  };

  const toggleAction = (itemId) => {
    updateActionItems(meeting.action_items.map((a) => a.id === itemId ? { ...a, done: !a.done } : a));
  };

  const removeAction = (itemId) => {
    updateActionItems(meeting.action_items.filter((a) => a.id !== itemId));
  };

  const convertAction = async (itemId) => {
    try {
      const { data } = await api.post(`/meetings/${id}/action-items/${itemId}/convert`);
      toast.success("Action item dikonversi menjadi tugas");
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async () => {
    try { await api.delete(`/meetings/${id}`); toast.success("Rapat dihapus"); navigate("/meetings"); }
    catch (e) { toast.error(apiError(e)); }
  };

  if (!meeting) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <button onClick={() => navigate("/meetings")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="btn-back">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Rapat
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
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="secondary" size="icon" className="text-destructive shrink-0" data-testid="btn-delete-meeting"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Hapus rapat ini?</AlertDialogTitle><AlertDialogDescription>Rapat dan lampiran akan dihapus. Tugas turunan tetap ada namun kehilangan tautan.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground" data-testid="btn-confirm-delete-meeting">Hapus</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes">
            <TabsList className="rounded-xl mb-4">
              <TabsTrigger value="notes" className="rounded-lg" data-testid="tab-notes">Catatan</TabsTrigger>
              <TabsTrigger value="decisions" className="rounded-lg" data-testid="tab-decisions">Keputusan</TabsTrigger>
              <TabsTrigger value="agenda" className="rounded-lg" data-testid="tab-agenda">Agenda</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="space-y-3">
              <RichTextEditor value={notes} onChange={setNotes} placeholder="Tulis notulen rapat di sini..." minHeight={300} />
              <Button onClick={saveNotes} disabled={saving} data-testid="btn-save-notes">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan Catatan</Button>
            </TabsContent>
            <TabsContent value="decisions" className="space-y-3">
              <RichTextEditor value={decisions} onChange={setDecisions} placeholder="Catat keputusan rapat..." minHeight={300} />
              <Button onClick={saveNotes} disabled={saving} data-testid="btn-save-decisions">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan Keputusan</Button>
            </TabsContent>
            <TabsContent value="agenda">
              <Card className="p-6 rounded-2xl shadow-soft"><p className="text-sm whitespace-pre-wrap text-muted-foreground">{meeting.agenda || "Tidak ada agenda."}</p></Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {/* Action items */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Action Items</h3>
            <div className="space-y-2 mb-4">
              {(meeting.action_items || []).map((a) => (
                <div key={a.id} className="p-3 rounded-xl border border-border" data-testid={`action-item-${a.id}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={a.done} onChange={() => toggleAction(a.id)} className="h-4 w-4 rounded accent-indigo-600 mt-0.5" data-testid={`action-check-${a.id}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${a.done ? "line-through text-muted-foreground" : ""}`}>{a.text}</p>
                      {a.assignee && <p className="text-xs text-muted-foreground mt-0.5">→ {a.assignee}</p>}
                    </div>
                    <button onClick={() => removeAction(a.id)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 pl-6">
                    {a.converted_task_id ? (
                      <button onClick={() => navigate(`/tasks/${a.converted_task_id}`)} className="text-xs text-emerald-600 flex items-center gap-1 hover:underline" data-testid={`link-converted-${a.id}`}>
                        <CheckCircle2 className="h-3 w-3" /> Lihat tugas <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => convertAction(a.id)} data-testid={`btn-convert-${a.id}`}>
                        <Zap className="h-3 w-3 mr-1" /> Jadikan Tugas
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(meeting.action_items || []).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Belum ada action item.</p>}
            </div>
            <div className="space-y-2">
              <Input value={newAction} onChange={(e) => setNewAction(e.target.value)} placeholder="Deskripsi action item..." data-testid="action-text-input" />
              <div className="flex gap-2">
                <Input value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} placeholder="Penanggung jawab" data-testid="action-assignee-input" />
                <Button variant="secondary" onClick={addAction} data-testid="btn-add-action"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>

          {/* Generated tasks */}
          {(meeting.generated_tasks || []).length > 0 && (
            <Card className="p-6 rounded-2xl shadow-soft">
              <h3 className="text-sm font-semibold mb-4">Tugas Turunan</h3>
              <div className="space-y-2">
                {meeting.generated_tasks.map((t) => (
                  <button key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} className="w-full text-left p-2.5 rounded-lg border border-border hover:bg-secondary/50 flex items-center justify-between gap-2 transition-colors" data-testid={`generated-task-${t.id}`}>
                    <span className="text-sm truncate">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </button>
                ))}
              </div>
            </Card>
          )}

          {(meeting.participants || []).length > 0 && (
            <Card className="p-6 rounded-2xl shadow-soft">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users2 className="h-4 w-4" /> Peserta</h3>
              <div className="flex flex-wrap gap-2">
                {meeting.participants.map((p, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium">{p}</span>)}
              </div>
            </Card>
          )}

          <Card className="p-6 rounded-2xl shadow-soft"><AttachmentPanel module="meeting" parentId={id} /></Card>
        </div>
      </div>
    </div>
  );
}
