import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { StatusBadge, PriorityBadge, ProgressBar } from "@/components/common";
import { TaskDialog } from "./Tasks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AttachmentPanel from "@/components/AttachmentPanel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Send, Video, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/tasks/${id}`);
      setTask(data);
    } catch (e) { toast.error(apiError(e)); navigate("/tasks"); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const toggleChecklist = async (itemId) => {
    const checklist = task.checklist.map((c) => c.id === itemId ? { ...c, done: !c.done } : c);
    setTask({ ...task, checklist });
    try {
      const { data } = await api.put(`/tasks/${id}`, { checklist });
      setTask((prev) => ({ ...prev, ...data, attachments: prev.attachments }));
    } catch (e) { toast.error(apiError(e)); load(); }
  };

  const addChecklistItem = async () => {
    if (!newItem.trim()) return;
    const checklist = [...task.checklist, { text: newItem.trim(), done: false }];
    setNewItem("");
    try {
      const { data } = await api.put(`/tasks/${id}`, { checklist });
      setTask((prev) => ({ ...prev, ...data, attachments: prev.attachments }));
    } catch (e) { toast.error(apiError(e)); }
  };

  const removeChecklistItem = async (itemId) => {
    const checklist = task.checklist.filter((c) => c.id !== itemId);
    try {
      const { data } = await api.put(`/tasks/${id}`, { checklist });
      setTask((prev) => ({ ...prev, ...data, attachments: prev.attachments }));
    } catch (e) { toast.error(apiError(e)); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tasks/${id}/comments`, { text: comment });
      setComment("");
      load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/tasks/${id}`);
      toast.success("Tugas dihapus");
      navigate("/tasks");
    } catch (e) { toast.error(apiError(e)); }
  };

  if (!task) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <button onClick={() => navigate("/tasks")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="btn-back">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Tugas
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-2xl shadow-soft">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" size="icon" onClick={() => setEditOpen(true)} data-testid="btn-edit-task"><Pencil className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="secondary" size="icon" className="text-destructive" data-testid="btn-delete-task"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle><AlertDialogDescription>Tugas dan semua lampiran terkait akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground" data-testid="btn-confirm-delete">Hapus</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {task.description && <p className="text-muted-foreground mb-5 whitespace-pre-wrap">{task.description}</p>}

            {task.meeting_id && (
              <button onClick={() => navigate(`/meetings/${task.meeting_id}`)} className="flex items-center gap-2 text-sm text-primary mb-5 hover:underline" data-testid="link-parent-meeting">
                <Video className="h-4 w-4" /> Dari rapat: {task.meeting_title || "Lihat rapat"}
              </button>
            )}

            <div className="flex items-center gap-3 mb-6">
              <ProgressBar value={task.progress} className="flex-1" />
              <span className="text-sm font-semibold w-12 text-right">{task.progress}%</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Checklist ({task.checklist.filter((c) => c.done).length}/{task.checklist.length})</h3>
              {task.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border group" data-testid={`checklist-item-${item.id}`}>
                  <input type="checkbox" checked={item.done} onChange={() => toggleChecklist(item.id)} className="h-4 w-4 rounded accent-indigo-600" data-testid={`checklist-check-${item.id}`} />
                  <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                  <button onClick={() => removeChecklistItem(item.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"><X className="h-4 w-4" /></button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} placeholder="Tambah item..." data-testid="detail-checklist-input" />
                <Button variant="secondary" onClick={addChecklistItem} data-testid="btn-detail-add-checklist"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>

          {/* Comments */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <h3 className="text-sm font-semibold mb-4">Komentar ({(task.comments || []).length})</h3>
            <div className="space-y-4 mb-4">
              {(task.comments || []).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{c.by?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="text-sm"><span className="font-semibold">{c.by}</span> <span className="text-xs text-muted-foreground">· {timeAgo(c.at)}</span></p>
                    <p className="text-sm text-muted-foreground">{c.text}</p>
                  </div>
                </div>
              ))}
              {(task.comments || []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada komentar.</p>}
            </div>
            <div className="flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Tulis komentar..." data-testid="comment-input" />
              <Button onClick={addComment} data-testid="btn-add-comment"><Send className="h-4 w-4" /></Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 rounded-2xl shadow-soft">
            <h3 className="text-sm font-semibold mb-4">Detail</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Pemohon</dt><dd className="font-medium">{task.requester || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">PIC</dt><dd className="font-medium">{task.pic || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Prioritas</dt><dd><PriorityBadge priority={task.priority} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Tenggat</dt><dd className="font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString("id-ID") : "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Dibuat oleh</dt><dd className="font-medium">{task.created_by_name}</dd></div>
            </dl>
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft">
            <AttachmentPanel module="task" parentId={id} />
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft">
            <h3 className="text-sm font-semibold mb-4">Riwayat</h3>
            <div className="space-y-3">
              {(task.history || []).slice().reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div><p className="capitalize">{h.action.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{h.by} · {timeAgo(h.at)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <TaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} onSaved={load} />
    </div>
  );
}
