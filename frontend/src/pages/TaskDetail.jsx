import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronDown,
  Copy,
  FileText,
  LayoutTemplate,
  Loader2,
  Mail,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Printer,
  Send,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import DocumentManager from "@/components/DocumentManager";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { PriorityBadge, StatusBadge } from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage, isTaskPic } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const itemOverdue = (item) => item.due_date && !item.done && new Date(item.due_date) < new Date();

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "\u2014";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
};

/** Detail Tugas — R51-style stacked section cards + item/comment/history panels. */
export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newItemDue, setNewItemDue] = useState("");
  const [showDocsFor, setShowDocsFor] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/tasks/${id}`);
      setTask(data);
    } catch (err) {
      notify.error(apiError(err));
      navigate("/tasks");
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (partial, optimistic) => {
    if (optimistic) setTask((prev) => ({ ...prev, ...optimistic }));
    try {
      const { data } = await api.put(`/tasks/${id}`, partial);
      setTask((prev) => ({ ...data, attachments: prev.attachments }));
    } catch (err) {
      notify.error(apiError(err));
      load();
    }
  };

  const items = task?.items || [];
  const mapItems = (fn) => items.map(fn);

  const togglePicDone = (itemId) => {
    const next = mapItems((it) =>
      it.id === itemId
        ? { ...it, pic_done: !it.pic_done, pic_done_at: !it.pic_done ? new Date().toISOString() : null }
        : it
    );
    patch({ items: next }, { items: next });
  };
  const toggleApprove = (itemId) => {
    const next = mapItems((it) =>
      it.id === itemId ? { ...it, done: !it.done, done_at: !it.done ? new Date().toISOString() : null } : it
    );
    patch({ items: next }, { items: next });
  };
  const setItemField = (itemId, field, value) => {
    const next = mapItems((it) => (it.id === itemId ? { ...it, [field]: value } : it));
    patch({ items: next }, { items: next });
  };
  const addItem = () => {
    if (!newItem.trim()) return;
    const next = [
      ...items,
      {
        title: newItem.trim(),
        done: false,
        due_date: newItemDue ? new Date(newItemDue).toISOString() : null,
      },
    ];
    setNewItem("");
    setNewItemDue("");
    patch({ items: next });
  };
  const removeItem = (itemId) => {
    if (items.length <= 1) {
      notify.error("Tugas harus memiliki minimal satu item tugas.");
      return;
    }
    const next = items.filter((it) => it.id !== itemId);
    patch({ items: next }, { items: next });
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/tasks/${id}/comments`, { text: comment });
      setComment("");
      load();
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const broadcast = async () => {
    try {
      const { data } = await api.post(`/tasks/${id}/broadcast`, { channels: ["email", "whatsapp"] });
      if (data.wa_url) window.open(data.wa_url, "_blank");
      if (data.email_sent) notify.success("Pemberitahuan terkirim ke pemberi tugas.");
      else if (data.wa_url) notify.success("Tautan WhatsApp dibuka.");
      else notify.error("Pemberi tugas belum memiliki nomor HP atau email.");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/tasks/${id}`);
      notify.success("Tugas dihapus.");
      navigate("/tasks");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const duplicate = async () => {
    try {
      const { data } = await api.post(`/tasks/${id}/duplicate`);
      notify.success("Tugas berhasil diduplikasi.");
      navigate(`/tasks/${data.id}`);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const saveTemplate = async () => {
    if (!tplName.trim()) {
      notify.error("Nama template wajib diisi.");
      return;
    }
    try {
      await api.post("/tasks/templates", { name: tplName, task_id: id });
      notify.success("Tugas disimpan sebagai template.");
      setTplOpen(false);
      setTplName("");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  if (!task)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );

  const req = typeof task.requester === "string" ? { name: task.requester } : task.requester || {};
  const doneCount = items.filter((i) => i.done).length;
  const isOwner = canManage(user, task);
  const isPic = isTaskPic(user, task);
  const canEditStructure = isOwner;
  const canProgress = isOwner || isPic;

  return (
    <div className="space-y-6" data-testid="task-detail-page">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-base">{task.title}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 no-print">
                <Button variant="outline" size="sm" onClick={() => navigate("/tasks")} data-testid="btn-back">
                  <ArrowLeft className="size-4" /> {ACTION.back}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="size-8" aria-label="Aksi tugas" data-testid="task-detail-actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={duplicate} data-testid="btn-duplicate-task">
                      <Copy aria-hidden="true" /> {ACTION.duplicate}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setTplName(task.title || "");
                        setTplOpen(true);
                      }}
                      data-testid="btn-save-template"
                    >
                      <LayoutTemplate aria-hidden="true" /> Jadikan Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.print()} data-testid="btn-print-task">
                      <Printer aria-hidden="true" /> {ACTION.print}
                    </DropdownMenuItem>
                    {isOwner ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/tasks/${id}/edit`)} data-testid="btn-edit-task">
                          <Pencil aria-hidden="true" /> {ACTION.edit}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteOpen(true)}
                          className="text-destructive focus:text-destructive"
                          data-testid="btn-delete-task"
                        >
                          <Trash2 aria-hidden="true" /> {ACTION.delete}
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{task.description}</p>
              ) : null}
              {task.meeting_id ? (
                <button
                  type="button"
                  onClick={() => navigate(`/meetings/${task.meeting_id}`)}
                  className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                  data-testid="link-parent-meeting"
                >
                  <Video className="size-4" /> Dari rapat: {task.meeting_title || "Lihat rapat"}
                </button>
              ) : null}
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <Progress value={task.progress} className="h-1.5 flex-1" />
                  <span className="w-10 text-right text-sm font-medium">{task.progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {doneCount} dari {items.length} item tugas disetujui
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Item Tugas ({doneCount}/{items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 ? (
                <p className="py-3 text-center text-muted-foreground">Belum ada item tugas.</p>
              ) : null}
              {items.map((item) => (
                <Collapsible
                  key={item.id}
                  className={cn("rounded-md border", itemOverdue(item) && "border-destructive/50")}
                  data-testid={`item-${item.id}`}
                >
                  <div className="flex items-start gap-3 p-3">
                    <Checkbox
                      checked={Boolean(item.pic_done || item.done)}
                      disabled={!(isPic && !item.done)}
                      onCheckedChange={() => togglePicDone(item.id)}
                      className="mt-0.5"
                      data-testid={`item-check-${item.id}`}
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={cn("font-medium", item.done && "text-muted-foreground line-through")}>
                          {item.title}
                        </p>
                        {item.done ? (
                          <Badge variant="default" className="font-normal">
                            Disetujui
                          </Badge>
                        ) : item.pic_done ? (
                          <Badge variant="secondary" className="font-normal">
                            Menunggu persetujuan
                          </Badge>
                        ) : null}
                        {itemOverdue(item) ? (
                          <Badge variant="destructive" className="font-normal">
                            Terlambat
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {canEditStructure ? (
                          <span className="flex items-center gap-1.5">
                            Tenggat:
                            <Input
                              type="date"
                              value={item.due_date ? item.due_date.slice(0, 10) : ""}
                              onChange={(e) =>
                                setItemField(
                                  item.id,
                                  "due_date",
                                  e.target.value ? new Date(e.target.value).toISOString() : null
                                )
                              }
                              className="h-[var(--ctl-h-sm)] w-36 text-xs"
                              data-testid={`item-due-${item.id}`}
                            />
                          </span>
                        ) : item.due_date ? (
                          <span>Tenggat: {fmtDay(item.due_date)}</span>
                        ) : null}
                        {item.pic_done && !item.done && item.pic_done_at ? (
                          <span>Dikerjakan: {fmtDay(item.pic_done_at)}</span>
                        ) : null}
                        {item.done && item.done_at ? <span>Disetujui: {fmtDay(item.done_at)}</span> : null}
                        {item.done && item.approved_by ? <span>oleh {item.approved_by}</span> : null}
                      </div>
                      {isOwner ? (
                        !(item.pic_done || item.done) ? (
                          <p className="text-xs italic text-muted-foreground">
                            Menunggu PIC menandai item ini selesai…
                          </p>
                        ) : !item.done ? (
                          <Button
                            size="sm"
                            onClick={() => toggleApprove(item.id)}
                            data-testid={`item-approve-${item.id}`}
                          >
                            <Check className="size-4" /> Setujui
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApprove(item.id)}
                            data-testid={`item-unapprove-${item.id}`}
                          >
                            <X className="size-4" /> Batalkan Persetujuan
                          </Button>
                        )
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          data-testid={`item-docs-toggle-${item.id}`}
                        >
                          <FileText className="size-3.5" />
                          {(item.documents || []).length + (item.result_docs || []).length}
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </CollapsibleTrigger>
                      {canEditStructure ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          aria-label={ACTION.delete}
                          onClick={() => removeItem(item.id)}
                          data-testid={`item-remove-${item.id}`}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <CollapsibleContent>
                    <Separator />
                    <div className="space-y-4 p-3">
                      {(item.documents || []).length > 0 || showDocsFor[item.id] ? (
                        <DocumentManager
                          taskId={id}
                          documents={item.documents || []}
                          onChange={(docs) => setItemField(item.id, "documents", docs)}
                          label="Dokumen Item"
                          idPrefix={`item-${item.id}`}
                          canManage={canEditStructure}
                          canRespond={canProgress}
                          currentUserId={user?.id}
                          emptyText="Belum ada dokumen item"
                        />
                      ) : canEditStructure ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDocsFor((s) => ({ ...s, [item.id]: true }))}
                          data-testid={`btn-add-item-doc-${item.id}`}
                        >
                          <Plus className="size-4" /> Dokumen Item
                        </Button>
                      ) : null}

                      <div className="space-y-[var(--item-gap)]">
                        <Label>Catatan Tugas</Label>
                        <ItemResult
                          value={item.result}
                          editable={canProgress}
                          onSave={(text) => setItemField(item.id, "result", text)}
                          testid={`item-result-${item.id}`}
                        />
                      </div>

                      {canProgress || (item.result_docs || []).length > 0 ? (
                        <DocumentManager
                          taskId={id}
                          documents={item.result_docs || []}
                          onChange={(docs) => setItemField(item.id, "result_docs", docs)}
                          label="Lampiran Catatan"
                          idPrefix={`result-${item.id}`}
                          canManage={canEditStructure}
                          canAddDoc={canProgress}
                          canRespond={false}
                          currentUserId={user?.id}
                          emptyText="Belum ada lampiran"
                        />
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </CardContent>
            {canEditStructure ? (
              <CardFooter className="gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                  placeholder="Tambah item tugas..."
                  className="flex-1"
                  data-testid="detail-item-input"
                />
                <Input
                  type="date"
                  value={newItemDue}
                  onChange={(e) => setNewItemDue(e.target.value)}
                  className="w-full sm:w-36"
                  data-testid="detail-item-due-input"
                />
                <Button size="sm" onClick={addItem} data-testid="btn-detail-add-item">
                  <Plus className="size-4" /> {ACTION.add}
                </Button>
              </CardFooter>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Komentar ({(task.comments || []).length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(task.comments || []).length === 0 ? (
                <p className="text-muted-foreground">Belum ada komentar.</p>
              ) : null}
              {(task.comments || []).map((c) => (
                <div key={c.id} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-xs font-semibold">
                    {c.by?.[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p>
                      <span className="font-medium">{c.by}</span>{" "}
                      <span className="text-xs text-muted-foreground">· {timeAgo(c.at)}</span>
                    </p>
                    <p className="text-muted-foreground">{c.text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Tulis komentar, gunakan @nama untuk menyebut"
                className="flex-1"
                data-testid="comment-input"
              />
              <Button size="sm" onClick={addComment} data-testid="btn-add-comment">
                <Send className="size-4" /> {ACTION.send}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pemberi Tugas</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{req.name || "\u2014"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-4 shrink-0" />
                  <span>{req.department || "\u2014"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 shrink-0" />
                  <span>{req.phone || "\u2014"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{req.email || "\u2014"}</span>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={broadcast}
                disabled={!req.phone && !req.email}
                data-testid="btn-broadcast"
              >
                <Megaphone className="size-4" /> {ACTION.send}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">PIC</dt>
                  <dd className="font-medium">
                    {(typeof task.pic === "string" ? task.pic : task.pic?.name) || "\u2014"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Prioritas</dt>
                  <dd>
                    <PriorityBadge priority={task.priority} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Tenggat</dt>
                  <dd className="font-medium">{fmtDay(task.deadline)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Dibuat oleh</dt>
                  <dd className="font-medium">{task.created_by_name || "\u2014"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dokumen Sumber</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentManager
                taskId={id}
                documents={task.documents || []}
                onChange={(docs) => patch({ documents: docs }, { documents: docs })}
                idPrefix="task"
                canManage={canEditStructure}
                canRespond={canProgress}
                currentUserId={user?.id}
                hideHeaderTitle
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Riwayat ({(task.history || []).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="thin-scroll max-h-72 space-y-3 overflow-y-auto pr-1">
                {(task.history || []).length === 0 ? (
                  <p className="text-muted-foreground">Belum ada riwayat.</p>
                ) : null}
                {(task.history || [])
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <div>
                        <p className={h.detail ? "" : "capitalize"}>
                          {h.detail || (h.action || "").replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {h.by} · {timeAgo(h.at)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="sm:max-w-md" data-testid="task-template-dialog">
          <DialogHeader>
            <DialogTitle>Jadikan Template</DialogTitle>
          </DialogHeader>
          <DialogBody className="form-dense">
            <div className="space-y-[var(--item-gap)]">
              <Label htmlFor="tpl-from-task">Nama Template</Label>
              <Input
                id="tpl-from-task"
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                data-testid="task-template-name"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setTplOpen(false)}>
              {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={saveTemplate} data-testid="btn-confirm-template">
              {ACTION.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus tugas?"
        description="Tugas akan dipindahkan ke Arsip dan masih bisa dipulihkan."
        onConfirm={remove}
        testid="task-detail-delete-confirm"
      />
    </div>
  );
}

function ItemResult({ value, editable, onSave, testid }) {
  const [text, setText] = useState(value || "");
  useEffect(() => {
    setText(value || "");
  }, [value]);
  if (!editable)
    return (
      <p className="whitespace-pre-wrap text-muted-foreground" data-testid={testid}>
        {value || "Belum ada catatan hasil."}
      </p>
    );
  return (
    <Textarea
      value={text}
      rows={3}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if ((text || "") !== (value || "")) onSave(text);
      }}
      placeholder="Jabarkan hasil pengerjaan item ini..."
      data-testid={testid}
    />
  );
}
