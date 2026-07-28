import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import RichTextEditor from "@/components/RichTextEditor";
import AttachmentPanel from "@/components/AttachmentPanel";
import UserSelect from "@/components/UserSelect";
import { StatusBadge } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Save, Zap, Plus, X, CalendarDays, Clock, MapPin, Users2, CheckCircle2, Loader2, ArrowRight, Pencil } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [convertItem, setConvertItem] = useState(null);
  const [convertForm, setConvertForm] = useState({ title: "", description: "", pic: null, priority: "Medium", deadline: "" });
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setMeeting(data);
      setNotes(data.notes || "");
      setDecisions(data.decisions || "");
    } catch (e) { toast.error(apiError(e)); navigate("/meetings"); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/users?all=true").then(({ data }) => setUsers(data.items)).catch(() => {}); }, []);

  const saveNotes = async () => {
    setSaving(true);
    try { await api.put(`/meetings/${id}`, { notes, decisions }); toast.success("Catatan rapat disimpan"); }
    catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const updateActionItems = async (items) => {
    setMeeting((m) => ({ ...m, action_items: items }));
    try { const { data } = await api.put(`/meetings/${id}`, { action_items: items }); setMeeting((m) => ({ ...m, action_items: data.action_items })); }
    catch (e) { toast.error(apiError(e)); load(); }
  };

  const addAction = () => {
    if (!newAction.trim()) return;
    updateActionItems([...(meeting.action_items || []), { text: newAction.trim(), assignee: newAssignee.trim(), done: false }]);
    setNewAction(""); setNewAssignee("");
  };
  const toggleAction = (itemId) => updateActionItems(meeting.action_items.map((a) => a.id === itemId ? { ...a, done: !a.done } : a));
  const removeAction = (itemId) => updateActionItems(meeting.action_items.filter((a) => a.id !== itemId));

  const openConvert = (item) => {
    const prefillPic = users.find((u) => u.name === item.assignee);
    setConvertForm({
      title: item.text, description: "",
      pic: prefillPic ? { user_id: prefillPic.id, name: prefillPic.name, department: prefillPic.department || "", phone: prefillPic.phone || "", email: prefillPic.email || "" } : null,
      priority: "Medium", deadline: "",
    });
    setConvertItem(item);
  };

  const submitConvert = async () => {
    if (!convertForm.pic?.name) { toast.error("Pilih PIC pelaksana tugas"); return; }
    if (!convertForm.deadline) { toast.error("Tentukan tenggat tugas"); return; }
    setConverting(true);
    try {
      const { data } = await api.post(`/meetings/${id}/action-items/${convertItem.id}/convert`, {
        title: convertForm.title, description: convertForm.description, pic: convertForm.pic,
        priority: convertForm.priority, deadline: convertForm.deadline,
      });
      toast.success("Action item dikonversi menjadi tugas");
      setConvertItem(null); load();
      navigate(`/tasks/${data.id}`);
    } catch (e) { toast.error(apiError(e)); }
    finally { setConverting(false); }
  };

  const remove = async () => {
    try { await api.delete(`/meetings/${id}`); toast.success("Rapat dihapus"); navigate("/meetings"); }
    catch (e) { toast.error(apiError(e)); }
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
              <Card className="p-6 rounded-lg shadow-soft"><p className="text-sm whitespace-pre-wrap text-muted-foreground">{meeting.agenda || "Tidak ada agenda."}</p></Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-lg shadow-soft">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Action Items</h3>
            <div className="space-y-2 mb-4">
              {(meeting.action_items || []).map((a, idx) => (
                <div key={a.id || `tmp-${idx}`} className="p-3 rounded-xl border border-border" data-testid={`action-item-${a.id}`}>
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
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => openConvert(a)} data-testid={`btn-convert-${a.id}`}>
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

          {(meeting.generated_tasks || []).length > 0 && (
            <Card className="p-6 rounded-lg shadow-soft">
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
            <Card className="p-6 rounded-lg shadow-soft">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users2 className="h-4 w-4" /> Peserta</h3>
              <div className="flex flex-wrap gap-2">
                {meeting.participants.map((p, i) => <span key={i} className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium">{p}</span>)}
              </div>
            </Card>
          )}

          <Card className="p-6 rounded-lg shadow-soft"><AttachmentPanel module="meeting" parentId={id} /></Card>
        </div>
      </div>

      <Dialog open={!!convertItem} onOpenChange={(v) => !v && setConvertItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Jadikan Tugas</DialogTitle>
            <DialogDescription>Lengkapi informasi wajib agar action item ini menjadi tugas yang valid dan tertaut ke rapat.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul Tugas</Label><Input value={convertForm.title} onChange={(e) => setConvertForm({ ...convertForm, title: e.target.value })} data-testid="convert-title" /></div>
            <div className="space-y-1.5"><Label>PIC Pelaksana <span className="text-destructive">*</span></Label>
              <UserSelect users={users} value={convertForm.pic} onChange={(v) => setConvertForm({ ...convertForm, pic: v })} placeholder="Pilih pelaksana..." testid="convert-pic" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Prioritas</Label>
                <Select value={convertForm.priority} onValueChange={(v) => setConvertForm({ ...convertForm, priority: v })}>
                  <SelectTrigger data-testid="convert-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Tenggat <span className="text-destructive">*</span></Label><Input type="date" value={convertForm.deadline} onChange={(e) => setConvertForm({ ...convertForm, deadline: e.target.value })} data-testid="convert-deadline" /></div>
            </div>
            <div className="space-y-1.5"><Label>Deskripsi (opsional)</Label><Textarea value={convertForm.description} onChange={(e) => setConvertForm({ ...convertForm, description: e.target.value })} rows={2} data-testid="convert-description" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConvertItem(null)}>Batal</Button>
            <Button onClick={submitConvert} disabled={converting} data-testid="btn-submit-convert">{converting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />} Buat Tugas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title="Hapus rapat ini?" description="Rapat akan dipindahkan ke Arsip dan dapat dipulihkan. Tugas turunan tetap ada." onConfirm={remove} />
    </div>
  );
}
