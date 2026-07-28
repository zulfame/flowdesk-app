import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canManage, isTaskPic } from "@/lib/perms";
import { StatusBadge, PriorityBadge, ProgressBar, SectionTitle } from "@/components/common";
import DocumentManager from "@/components/DocumentManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Send, Video, Loader2, Plus, X, User, Phone, Mail, Building2, Megaphone, ChevronDown, FileText, ListChecks, MessageSquare, Info, History, Copy, LayoutTemplate, Printer, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function itemOverdue(item) {
  return item.due_date && !item.done && new Date(item.due_date) < new Date();
}

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
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newItemDue, setNewItemDue] = useState("");

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/tasks/${id}`); setTask(data); }
    catch (e) { toast.error(apiError(e)); navigate("/tasks"); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const patch = async (partial, optimistic) => {
    if (optimistic) setTask((prev) => ({ ...prev, ...optimistic }));
    try {
      const { data } = await api.put(`/tasks/${id}`, partial);
      setTask((prev) => ({ ...data, attachments: prev.attachments }));
    } catch (e) { toast.error(apiError(e)); load(); }
  };

  const items = task?.items || [];

  const toggleItem = (itemId) => {
    const next = items.map((it) => it.id === itemId ? { ...it, done: !it.done, done_at: !it.done ? new Date().toISOString() : null } : it);
    patch({ items: next }, { items: next });
  };
  const setItemDate = (itemId, dateStr) => {
    const iso = dateStr ? new Date(dateStr).toISOString() : null;
    const next = items.map((it) => it.id === itemId ? { ...it, done_at: iso } : it);
    patch({ items: next }, { items: next });
  };
  const setItemDue = (itemId, dateStr) => {
    const iso = dateStr ? new Date(dateStr).toISOString() : null;
    const next = items.map((it) => it.id === itemId ? { ...it, due_date: iso } : it);
    patch({ items: next }, { items: next });
  };
  const addItem = () => {
    if (!newItem.trim()) return;
    const next = [...items, { title: newItem.trim(), done: false, due_date: newItemDue ? new Date(newItemDue).toISOString() : null }];
    setNewItem("");
    setNewItemDue("");
    patch({ items: next });
  };
  const removeItem = (itemId) => {
    if (items.length <= 1) { toast.error("Tugas harus memiliki minimal satu item tugas"); return; }
    const next = items.filter((it) => it.id !== itemId);
    patch({ items: next }, { items: next });
  };
  const setItemDocs = (itemId, docs) => {
    const next = items.map((it) => it.id === itemId ? { ...it, documents: docs } : it);
    patch({ items: next }, { items: next });
  };
  const setItemResult = (itemId, text) => {
    const next = items.map((it) => it.id === itemId ? { ...it, result: text } : it);
    patch({ items: next }, { items: next });
  };
  const setTaskDocs = (docs) => patch({ documents: docs }, { documents: docs });

  const addComment = async () => {
    if (!comment.trim()) return;
    try { await api.post(`/tasks/${id}/comments`, { text: comment }); setComment(""); load(); }
    catch (e) { toast.error(apiError(e)); }
  };

  const broadcast = async () => {
    try {
      const { data } = await api.post(`/tasks/${id}/broadcast`, { channels: ["email", "whatsapp"] });
      if (data.wa_url) window.open(data.wa_url, "_blank");
      if (data.email_sent) toast.success("Email pemberitahuan terkirim" + (data.wa_url ? " & WhatsApp dibuka" : ""));
      else if (data.wa_url) toast.success("WhatsApp dibuka");
      else toast.error("Pemberi tugas belum memiliki HP/email");
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async () => {
    try { await api.delete(`/tasks/${id}`); toast.success("Tugas dihapus"); navigate("/tasks"); }
    catch (e) { toast.error(apiError(e)); }
  };

  const duplicate = async () => {
    try { const { data } = await api.post(`/tasks/${id}/duplicate`); toast.success("Tugas diduplikasi"); navigate(`/tasks/${data.id}`); }
    catch (e) { toast.error(apiError(e)); }
  };
  const saveTemplate = async () => {
    const name = window.prompt("Nama template:", task?.title || "");
    if (!name) return;
    try { await api.post("/tasks/templates", { name, task_id: id }); toast.success("Disimpan sebagai template"); }
    catch (e) { toast.error(apiError(e)); }
  };
  const printTask = () => window.print();

  if (!task) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const req = typeof task.requester === "string" ? { name: task.requester } : (task.requester || {});
  const doneCount = items.filter((i) => i.done).length;

  // Hak akses: pemilik/pembuat & admin bisa ubah struktur; PIC hanya progres + balasan.
  const isOwner = canManage(user, task);
  const isPic = isTaskPic(user, task);
  const canEditStructure = isOwner;         // tambah/hapus/ubah item, tenggat, dokumen sumber
  const canProgress = isOwner || isPic;     // centang item selesai

  return (
    <div>
      <button onClick={() => navigate("/tasks")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="btn-back"><ArrowLeft className="h-4 w-4" /> Kembali ke Tugas</button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-2xl shadow-soft">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
                <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
              </div>
              <div className="flex gap-2 shrink-0 no-print">
                <Button variant="secondary" size="icon" onClick={duplicate} title="Duplikat" data-testid="btn-duplicate-task"><Copy className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={saveTemplate} title="Simpan sebagai template" data-testid="btn-save-template"><LayoutTemplate className="h-4 w-4" /></Button>
                <Button variant="secondary" size="icon" onClick={printTask} title="Cetak / PDF" data-testid="btn-print-task"><Printer className="h-4 w-4" /></Button>
                {canManage(user, task) && <>
                <Button variant="secondary" size="icon" onClick={() => navigate(`/tasks/${id}/edit`)} data-testid="btn-edit-task"><Pencil className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="secondary" size="icon" className="text-destructive" data-testid="btn-delete-task"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Hapus tugas ini?</AlertDialogTitle><AlertDialogDescription>Tugas dipindahkan ke Arsip dan dapat dipulihkan.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground" data-testid="btn-confirm-delete">Hapus</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                </>}
              </div>
            </div>

            {task.description && <p className="text-muted-foreground mb-5 whitespace-pre-wrap">{task.description}</p>}
            {task.meeting_id && <button onClick={() => navigate(`/meetings/${task.meeting_id}`)} className="flex items-center gap-2 text-sm text-primary mb-5 hover:underline" data-testid="link-parent-meeting"><Video className="h-4 w-4" /> Dari rapat: {task.meeting_title || "Lihat rapat"}</button>}

            <div className="flex items-center gap-3 mb-2"><ProgressBar value={task.progress} className="flex-1" /><span className="text-sm font-semibold w-12 text-right">{task.progress}%</span></div>
            <p className="text-xs text-muted-foreground">Rasio pengerjaan: {doneCount} dari {items.length} item selesai</p>
          </Card>

          {/* Item Tugas */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <SectionTitle icon={ListChecks}>Item Tugas ({doneCount}/{items.length})</SectionTitle>
            <div className="space-y-3">
              {items.map((item) => (
                <Collapsible key={item.id} className={cn("rounded-xl border", itemOverdue(item) ? "border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-900/10" : "border-border")} data-testid={`item-${item.id}`}>
                  <div className="flex items-center gap-3 p-3">
                    <input type="checkbox" checked={!!item.done} disabled={!canProgress} onChange={() => toggleItem(item.id)} className="h-4 w-4 rounded accent-indigo-600 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" data-testid={`item-check-${item.id}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.title}</p>
                        {itemOverdue(item) && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">TERLAMBAT</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        {canEditStructure ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Tenggat:</span>
                              <Input type="date" value={item.due_date ? item.due_date.slice(0, 10) : ""} onChange={(e) => setItemDue(item.id, e.target.value)} className="h-7 w-36 text-xs" data-testid={`item-due-${item.id}`} />
                            </div>
                            {item.done && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">Selesai:</span>
                                <Input type="date" value={item.done_at ? item.done_at.slice(0, 10) : ""} onChange={(e) => setItemDate(item.id, e.target.value)} className="h-7 w-36 text-xs" data-testid={`item-date-${item.id}`} />
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {item.due_date && <span className="text-xs text-muted-foreground">Tenggat: {new Date(item.due_date).toLocaleDateString("id-ID")}</span>}
                            {item.done && item.done_at && <span className="text-xs text-muted-foreground">Selesai: {new Date(item.done_at).toLocaleDateString("id-ID")}</span>}
                          </>
                        )}
                      </div>
                    </div>
                    <CollapsibleTrigger asChild><Button variant="ghost" size="sm" className="h-8 text-xs" data-testid={`item-docs-toggle-${item.id}`}><FileText className="h-3.5 w-3.5 mr-1" /> {(item.documents || []).length} <ChevronDown className="h-3.5 w-3.5 ml-1" /></Button></CollapsibleTrigger>
                    {canEditStructure && (
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-3 border-t border-border space-y-4">
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-semibold flex items-center gap-2"><PenLine className="h-4 w-4 text-primary" /> Hasil / Catatan Pengerjaan</h4>
                        <ItemResult value={item.result} editable={canProgress} onSave={(text) => setItemResult(item.id, text)} testid={`item-result-${item.id}`} />
                      </div>
                      <DocumentManager taskId={id} documents={item.documents || []} onChange={(docs) => setItemDocs(item.id, docs)} label="Dokumen Item" idPrefix={`item-${item.id}`} canManage={canEditStructure} canRespond={canProgress} currentUserId={user?.id} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">Belum ada item tugas.</p>}
              {canEditStructure && (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} placeholder="Tambah item tugas..." className="flex-1" data-testid="detail-item-input" />
                  <Input type="date" value={newItemDue} onChange={(e) => setNewItemDue(e.target.value)} className="sm:w-40" title="Tenggat item (opsional)" data-testid="detail-item-due-input" />
                  <Button variant="secondary" onClick={addItem} data-testid="btn-detail-add-item"><Plus className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </Card>

          {/* Komentar */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <SectionTitle icon={MessageSquare}>Komentar ({(task.comments || []).length})</SectionTitle>
            <div className="space-y-4 mb-4">
              {(task.comments || []).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{c.by?.[0]?.toUpperCase()}</div>
                  <div className="min-w-0"><p className="text-sm"><span className="font-semibold">{c.by}</span> <span className="text-xs text-muted-foreground">· {timeAgo(c.at)}</span></p><p className="text-sm text-muted-foreground">{c.text}</p></div>
                </div>
              ))}
              {(task.comments || []).length === 0 && <p className="text-sm text-muted-foreground">Belum ada komentar.</p>}
            </div>
            <div className="flex gap-2"><Input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Tulis komentar... gunakan @nama untuk menyebut" data-testid="comment-input" /><Button onClick={addComment} data-testid="btn-add-comment"><Send className="h-4 w-4" /></Button></div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Pemberi Tugas */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <SectionTitle icon={User}>Pemberi Tugas</SectionTitle>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground shrink-0" /><span className="font-medium">{req.name || "-"}</span></div>
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><span>{req.department || "-"}</span></div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span>{req.phone || "-"}</span></div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{req.email || "-"}</span></div>
            </dl>
            <Button className="w-full mt-4 rounded-xl" variant="secondary" onClick={broadcast} disabled={!req.phone && !req.email} data-testid="btn-broadcast"><Megaphone className="h-4 w-4 mr-1.5" /> Kirim Pemberitahuan</Button>
            <p className="text-xs text-muted-foreground mt-2">Broadcast via Email & WhatsApp ke pemberi tugas.</p>
          </Card>

          {/* Detail */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <SectionTitle icon={Info}>Detail</SectionTitle>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">PIC</dt><dd className="font-medium">{(typeof task.pic === "string" ? task.pic : task.pic?.name) || "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Prioritas</dt><dd><PriorityBadge priority={task.priority} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Tenggat</dt><dd className="font-medium">{task.deadline ? new Date(task.deadline).toLocaleDateString("id-ID") : "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Dibuat oleh</dt><dd className="font-medium">{task.created_by_name}</dd></div>
            </dl>
          </Card>

          {/* Dokumen Sumber (task-level) */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <DocumentManager taskId={id} documents={task.documents || []} onChange={setTaskDocs} label="Dokumen Sumber" idPrefix="task" canManage={canEditStructure} canRespond={canProgress} currentUserId={user?.id} />
          </Card>

          {/* Riwayat */}
          <Card className="p-6 rounded-2xl shadow-soft">
            <SectionTitle icon={History} right={<span className="text-xs text-muted-foreground">{(task.history || []).length}</span>}>Riwayat</SectionTitle>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(task.history || []).slice().reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm"><div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" /><div><p className={h.detail ? "" : "capitalize"}>{h.detail || h.action.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">{h.by} · {timeAgo(h.at)}</p></div></div>
              ))}
              {(task.history || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Belum ada riwayat.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ItemResult({ value, editable, onSave, testid }) {
  const [text, setText] = useState(value || "");
  useEffect(() => { setText(value || ""); }, [value]);
  if (!editable) {
    return (
      <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={testid}>
        {value ? value : "Belum ada catatan hasil."}
      </p>
    );
  }
  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { if ((text || "") !== (value || "")) onSave(text); }}
      placeholder="Jabarkan hasil pengerjaan item ini (mis. ringkasan hasil, kendala, atau kesimpulan)..."
      rows={3}
      data-testid={testid}
    />
  );
}

