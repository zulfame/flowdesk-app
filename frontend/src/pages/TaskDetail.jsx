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
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Send,
  Trash2,
  User,
  Video,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DocumentManager from "@/components/DocumentManager";
import UserSelect from "@/components/UserSelect";
import { ConfirmDeleteDialog } from "@/components/composite/ConfirmDeleteDialog";
import { EditableCard } from "@/components/composite/EditableCard";
import {
  PriorityBadge,
  StatusBadge,
  PRIORITY_META,
  STATUS_META,
} from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage, isTaskPic } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Draft", "Pending", "On Progress", "Completed", "Overdue", "Cancelled", "Archived"];

const itemOverdue = (item) => item.due_date && !item.done && new Date(item.due_date) < new Date();

const fmtDay = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : "\u2014";

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
};

const person = (value) => (typeof value === "string" ? { name: value } : value || {});

function ContactList({ data }) {
  const rows = [
    { icon: User, value: data.name, strong: true },
    { icon: Building2, value: data.department },
    { icon: Phone, value: data.phone },
    { icon: Mail, value: data.email },
  ];
  return (
    <dl className="space-y-2">
      {rows.map(({ icon: Icon, value, strong }, i) => (
        <div key={i} className={cn("flex items-center gap-2", !strong && "text-muted-foreground")}>
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className={cn("truncate", strong && "font-medium")}>{value || "\u2014"}</span>
        </div>
      ))}
    </dl>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{children}</dd>
    </div>
  );
}

/** Detail Tugas — satu halaman untuk melihat & menyunting (halaman Ubah dihapus). */
export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [comment, setComment] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newItemDue, setNewItemDue] = useState("");
  const [showDocsFor, setShowDocsFor] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [head, setHead] = useState({ title: "", description: "" });
  const [info, setInfo] = useState({ status: "Pending", priority: "Medium", deadline: "" });
  const [reqDraft, setReqDraft] = useState(null);
  const [picDraft, setPicDraft] = useState(null);

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

  useEffect(() => {
    api
      .get("/users?all=true")
      .then(({ data }) => setUsers(data.items || []))
      .catch(() => {});
  }, []);

  const patch = async (partial, optimistic) => {
    if (optimistic) setTask((prev) => ({ ...prev, ...optimistic }));
    try {
      const { data } = await api.put(`/tasks/${id}`, partial);
      setTask((prev) => ({ ...data, attachments: prev.attachments }));
      if (data.pic_wa_url) window.open(data.pic_wa_url, "_blank");
      return true;
    } catch (err) {
      notify.error(apiError(err));
      load();
      return false;
    }
  };

  const saveAnd = async (partial, message) => {
    const ok = await patch(partial);
    if (ok) notify.success(message);
    return ok;
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
      notify.success("Tugas berhasil disalin.");
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

  const req = person(task.requester);
  const pic = person(task.pic);
  const doneCount = items.filter((i) => i.done).length;
  const isOwner = canManage(user, task);
  const isPic = isTaskPic(user, task);
  const canEditStructure = isOwner;
  const canProgress = isOwner || isPic;

  return (
    <div className="form-dense space-y-6" data-testid="task-detail-page">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EditableCard
            title={task.title}
            canEdit={isOwner}
            testid="head"
            contentClassName="space-y-4"
            onEditStart={() => setHead({ title: task.title || "", description: task.description || "" })}
            onSave={() => {
              if (!head.title.trim()) {
                notify.error("Judul tugas wajib diisi.");
                return false;
              }
              return saveAnd(
                { title: head.title, description: head.description },
                "Informasi tugas diperbarui."
              );
            }}
            headerExtra={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/tasks")}
                  data-testid="btn-back"
                >
                  <ArrowLeft className="size-4" /> {ACTION.back}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      aria-label="Aksi tugas"
                      data-testid="task-detail-actions"
                    >
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
              </>
            }
          >
            {(editing) =>
              editing ? (
                <div className="space-y-[var(--field-gap)]">
                  <div className="space-y-[var(--item-gap)]">
                    <Label htmlFor="head-title">Judul</Label>
                    <Input
                      id="head-title"
                      value={head.title}
                      onChange={(e) => setHead({ ...head, title: e.target.value })}
                      data-testid="head-title-input"
                    />
                  </div>
                  <div className="space-y-[var(--item-gap)]">
                    <Label htmlFor="head-desc">Deskripsi</Label>
                    <Textarea
                      id="head-desc"
                      rows={4}
                      value={head.description}
                      onChange={(e) => setHead({ ...head, description: e.target.value })}
                      data-testid="head-desc-input"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-muted-foreground">
                      Tenggat {fmtDay(task.deadline)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {task.description || "Tanpa deskripsi."}
                  </p>
                  {task.meeting_id ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/meetings/${task.meeting_id}`)}
                      className="inline-flex items-center gap-2 font-medium hover:underline"
                      data-testid="link-parent-meeting"
                    >
                      <Video className="size-4" /> Dari rapat: {task.meeting_title || "Lihat rapat"}
                    </button>
                  ) : null}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <Progress value={task.progress} className="h-1.5 flex-1" />
                      <span className="w-10 text-right font-medium tabular-nums">{task.progress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doneCount} dari {items.length} item tugas disetujui
                    </p>
                  </div>
                </>
              )
            }
          </EditableCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Item Tugas ({doneCount}/{items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">Belum ada item tugas.</p>
              ) : (
                <div className="divide-y">
                  {items.map((item) => {
                    const meta = [
                      item.due_date ? `Tenggat ${fmtDay(item.due_date)}` : "Tanpa tenggat",
                      item.pic_done && !item.done && item.pic_done_at
                        ? `Dikerjakan ${fmtDay(item.pic_done_at)}`
                        : null,
                      item.done && item.done_at ? `Disetujui ${fmtDay(item.done_at)}` : null,
                      item.done && item.approved_by ? `oleh ${item.approved_by}` : null,
                      !item.pic_done && !item.done ? "Menunggu PIC" : null,
                    ].filter(Boolean);
                    const docCount = (item.documents || []).length + (item.result_docs || []).length;
                    return (
                      <Collapsible key={item.id} className="group/item" data-testid={`item-${item.id}`}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-6 py-2 transition-colors hover:bg-muted/40",
                            itemOverdue(item) && "border-l-2 border-l-destructive"
                          )}
                        >
                          <Checkbox
                            checked={Boolean(item.pic_done || item.done)}
                            disabled={!(isPic && !item.done)}
                            onCheckedChange={() => togglePicDone(item.id)}
                            data-testid={`item-check-${item.id}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  "truncate text-[13px] font-medium",
                                  item.done && "text-muted-foreground line-through"
                                )}
                                title={item.title}
                              >
                                {item.title}
                              </p>
                              {item.done ? (
                                <Badge variant="default" className="shrink-0 font-normal">
                                  Disetujui
                                </Badge>
                              ) : item.pic_done ? (
                                <Badge variant="secondary" className="shrink-0 font-normal">
                                  Menunggu persetujuan
                                </Badge>
                              ) : null}
                              {itemOverdue(item) ? (
                                <Badge variant="destructive" className="shrink-0 font-normal">
                                  Terlambat
                                </Badge>
                              ) : null}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{meta.join(" · ")}</p>
                          </div>

                          {isOwner && item.pic_done && !item.done ? (
                            <Button
                              size="sm"
                              className="h-7 shrink-0"
                              onClick={() => toggleApprove(item.id)}
                              data-testid={`item-approve-${item.id}`}
                            >
                              <Check className="size-3.5" /> Setujui
                            </Button>
                          ) : null}
                          {isOwner && item.done ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0"
                              aria-label="Batalkan persetujuan"
                              onClick={() => toggleApprove(item.id)}
                              data-testid={`item-unapprove-${item.id}`}
                            >
                              <RotateCcw className="size-3.5" />
                            </Button>
                          ) : null}

                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
                              data-testid={`item-docs-toggle-${item.id}`}
                            >
                              <FileText className="size-3.5" />
                              {docCount}
                              <ChevronDown className="size-3.5 transition-transform group-data-[state=open]/item:rotate-180" />
                            </Button>
                          </CollapsibleTrigger>
                          {canEditStructure ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={ACTION.delete}
                              onClick={() => removeItem(item.id)}
                              data-testid={`item-remove-${item.id}`}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>

                        <CollapsibleContent>
                          <div className="space-y-4 border-t bg-muted/30 px-6 py-3">
                            {canEditStructure ? (
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`item-due-${item.id}`} className="shrink-0">
                                  Tenggat item
                                </Label>
                                <Input
                                  id={`item-due-${item.id}`}
                                  type="date"
                                  value={item.due_date ? item.due_date.slice(0, 10) : ""}
                                  onChange={(e) =>
                                    setItemField(
                                      item.id,
                                      "due_date",
                                      e.target.value ? new Date(e.target.value).toISOString() : null
                                    )
                                  }
                                  className="h-[var(--ctl-h-sm)] w-40"
                                  data-testid={`item-due-input-${item.id}`}
                                />
                              </div>
                            ) : null}

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
                    );
                  })}
                </div>
              )}
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
          <EditableCard
            title="Informasi Tugas"
            canEdit={isOwner}
            testid="info"
            onEditStart={() =>
              setInfo({
                status: task.status,
                priority: task.priority || "Medium",
                deadline: task.deadline ? task.deadline.slice(0, 10) : "",
              })
            }
            onSave={() =>
              saveAnd(
                {
                  status: info.status,
                  priority: info.priority,
                  deadline: info.deadline ? new Date(info.deadline).toISOString() : null,
                },
                "Informasi tugas diperbarui."
              )
            }
          >
            {(editing) =>
              editing ? (
                <div className="space-y-[var(--field-gap)]">
                  <div className="space-y-[var(--item-gap)]">
                    <Label>Status</Label>
                    <Select value={info.status} onValueChange={(v) => setInfo({ ...info, status: v })}>
                      <SelectTrigger data-testid="info-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-[var(--item-gap)]">
                    <Label>Prioritas</Label>
                    <Select
                      value={info.priority}
                      onValueChange={(v) => setInfo({ ...info, priority: v })}
                    >
                      <SelectTrigger data-testid="info-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_META[p].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-[var(--item-gap)]">
                    <Label htmlFor="info-deadline">Tenggat</Label>
                    <Input
                      id="info-deadline"
                      type="date"
                      value={info.deadline}
                      onChange={(e) => setInfo({ ...info, deadline: e.target.value })}
                      data-testid="info-deadline-input"
                    />
                  </div>
                </div>
              ) : (
                <dl className="space-y-2">
                  <InfoRow label="Status">
                    <StatusBadge status={task.status} />
                  </InfoRow>
                  <InfoRow label="Prioritas">
                    <PriorityBadge priority={task.priority} />
                  </InfoRow>
                  <InfoRow label="Tenggat">{fmtDay(task.deadline)}</InfoRow>
                  <InfoRow label="Dibuat oleh">{task.created_by_name || "\u2014"}</InfoRow>
                </dl>
              )
            }
          </EditableCard>

          <EditableCard
            title="Pemberi Tugas"
            canEdit={isOwner}
            testid="requester"
            onEditStart={() => setReqDraft(task.requester?.name ? task.requester : null)}
            onSave={() => saveAnd({ requester: reqDraft }, "Pemberi tugas diperbarui.")}
            footerExtra={
              <Button
                variant="outline"
                size="sm"
                onClick={broadcast}
                disabled={!req.phone && !req.email}
                data-testid="btn-broadcast"
              >
                <Megaphone className="size-4" /> {ACTION.send}
              </Button>
            }
          >
            {(editing) =>
              editing ? (
                <UserSelect
                  users={users}
                  value={reqDraft}
                  onChange={setReqDraft}
                  placeholder="Pilih pemberi tugas..."
                  testid="requester-select"
                />
              ) : (
                <ContactList data={req} />
              )
            }
          </EditableCard>

          <EditableCard
            title="PIC Pelaksana"
            canEdit={isOwner}
            testid="pic"
            onEditStart={() => setPicDraft(task.pic?.name ? task.pic : null)}
            onSave={() => saveAnd({ pic: picDraft }, "PIC pelaksana diperbarui.")}
          >
            {(editing) =>
              editing ? (
                <UserSelect
                  users={users}
                  value={picDraft}
                  onChange={setPicDraft}
                  placeholder="Pilih pelaksana..."
                  testid="pic-select"
                />
              ) : (
                <ContactList data={pic} />
              )
            }
          </EditableCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Dokumen Sumber ({(task.documents || []).length})
              </CardTitle>
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
                      <div className="min-w-0">
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
