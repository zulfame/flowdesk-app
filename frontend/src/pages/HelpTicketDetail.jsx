import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Link2,
  Loader2,
  Lock,
  Paperclip,
  Send,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { EditableCard } from "@/components/composite/EditableCard";
import { PriorityBadge, PRIORITY_META } from "@/components/composite/TaskBadges";
import { TicketStatusBadge, TICKET_STATUS_META } from "@/components/composite/TicketBadges";
import { api, apiError, fileDownloadUrl } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isAdminUser } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { ACTION } from "@/constants/labels";

const CATEGORIES = [
  "Perangkat Keras",
  "Perangkat Lunak",
  "Jaringan",
  "Hapus Transaksi",
  "Operasional",
  "Data & Transaksi",
  "Lainnya",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = Object.keys(TICKET_STATUS_META);

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
    : "\u2014";

/** Chip lampiran ringkas (dipakai di komentar). */
function AttachmentChip({ doc }) {
  const isUrl = doc.kind === "url";
  const href = isUrl ? doc.url : fileDownloadUrl(doc.file_id);
  const text = isUrl ? doc.label || doc.url : doc.filename;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      data-testid={`attachment-chip-${doc.id}`}
    >
      <Paperclip className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </a>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-[13px]">{children}</dd>
    </div>
  );
}

/** Detail Tiket Bantuan — ringkasan, komentar, penanganan status, lampiran. */
export default function HelpTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [head, setHead] = useState({ title: "", description: "" });
  const [info, setInfo] = useState({ category: "Lainnya", priority: "Medium" });
  const [handling, setHandling] = useState({
    status: "Baru",
    resolution: "",
    resolution_attachments: [],
  });
  const proofDocsRef = useRef(null);
  const [assignee, setAssignee] = useState(null);
  const [comment, setComment] = useState("");
  const [commentAtts, setCommentAtts] = useState([]);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const commentDocsRef = useRef(null);
  const commentDraftId = useRef(`comment-${Date.now()}`);
  const [allUsers, setAllUsers] = useState([]);
  const [subUsers, setSubUsers] = useState([]);
  const docsRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/help-tickets/${id}`);
      setTicket(data);
    } catch (err) {
      notify.error(apiError(err));
      navigate("/help-tickets");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get("/users?all=true")
      .then(({ data }) => setAllUsers((data.items || []).filter((u) => u.is_active !== false)))
      .catch(() => setAllUsers([]));
    api
      .get("/users/subordinates")
      .then(({ data }) => setSubUsers(data.items || []))
      .catch(() => setSubUsers([]));
  }, []);

  const patch = async (body, message) => {
    try {
      const { data } = await api.put(`/help-tickets/${id}`, body);
      setTicket(data);
      if (message) notify.success(message);
      return true;
    } catch (err) {
      notify.error(apiError(err));
      return false;
    }
  };

  const addComment = async () => {
    if (sending) return;
    if (!comment.trim() && commentAtts.length === 0) return;
    setSending(true);
    try {
      await api.post(`/help-tickets/${id}/comments`, {
        message: comment.trim(),
        attachments: commentAtts,
      });
      setComment("");
      setCommentAtts([]);
      commentDraftId.current = `comment-${Date.now()}`;
      await load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (commentId) => {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      await api.delete(`/help-tickets/${id}/comments/${commentId}`);
      await load();
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" data-testid="ticket-loading">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!ticket) return null;

  const isLocked = Boolean(ticket.is_locked);
  const isOwner = ticket.created_by === user?.id || isAdminUser(user);
  const canEdit = Boolean(ticket.can_edit);
  const comments = ticket.comments || [];
  const assignUsers = isOwner ? allUsers : subUsers;

  return (
    <div className="space-y-6" data-testid="ticket-detail-page">
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <EditableCard
            title={ticket.title}
            canEdit={canEdit}
            testid="ticket-head"
            headerExtra={
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={ACTION.back}
                onClick={() => navigate("/help-tickets")}
                data-testid="btn-back-tickets"
              >
                <ArrowLeft className="size-3.5" />
              </Button>
            }
            onEditStart={() =>
              setHead({ title: ticket.title || "", description: ticket.description || "" })
            }
            onSave={() => patch(head, "Tiket diperbarui.")}
          >
            {(editing) =>
              editing ? (
                <div className="form-dense space-y-[var(--field-gap)]">
                  <div className="space-y-[var(--item-gap)]">
                    <Label htmlFor="edit-title">Judul</Label>
                    <Input
                      id="edit-title"
                      value={head.title}
                      onChange={(e) => setHead({ ...head, title: e.target.value })}
                      data-testid="ticket-edit-title"
                    />
                  </div>
                  <div className="space-y-[var(--item-gap)]">
                    <Label htmlFor="edit-desc">Deskripsi</Label>
                    <Textarea
                      id="edit-desc"
                      rows={5}
                      value={head.description}
                      onChange={(e) => setHead({ ...head, description: e.target.value })}
                      data-testid="ticket-edit-desc"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-medium" data-testid="ticket-number">
                      {ticket.number}
                    </Badge>
                    <TicketStatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                    <Badge variant="outline" className="font-normal">
                      {ticket.category}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-muted-foreground" data-testid="ticket-description">
                    {ticket.description || "Tanpa deskripsi."}
                  </p>
                  {isLocked ? (
                    <p
                      className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                      data-testid="ticket-locked-note"
                    >
                      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                      Tiket berstatus {ticket.status} — data, lampiran, dan komentar terkunci sebagai
                      bukti. Penerima tiket harus mengubah status lebih dulu bila masih ada keluhan.
                    </p>
                  ) : null}
                  {ticket.resolution ? (
                    <div className="rounded-md border bg-muted/30 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Catatan Penyelesaian</p>
                      <p className="whitespace-pre-wrap text-[13px]" data-testid="ticket-resolution">
                        {ticket.resolution}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            }
          </EditableCard>

          <EditableCard
            title="Penanganan"
            canEdit={Boolean(ticket.can_handle)}
            testid="ticket-handling"
            onEditStart={() =>
              setHandling({
                status: ticket.status,
                resolution: ticket.resolution || "",
                resolution_attachments: ticket.resolution_attachments || [],
              })
            }
            onSave={() => patch(handling, "Penanganan tiket diperbarui.")}
          >
            {(editing) =>
              editing ? (
                <div className="form-dense space-y-[var(--field-gap)]">
                  <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
                    <div className="space-y-[var(--item-gap)]">
                      <Label>Status</Label>
                      <Select
                        value={handling.status}
                        onValueChange={(v) => setHandling({ ...handling, status: v })}
                      >
                        <SelectTrigger data-testid="ticket-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {isLocked ? (
                    <p className="text-xs text-muted-foreground">
                      Tiket terkunci. Simpan status baru (mis. Diproses) untuk membuka penyuntingan
                      catatan penyelesaian, bukti pengerjaan, dan data tiket.
                    </p>
                  ) : null}
                  <div className={isLocked ? "hidden" : "space-y-[var(--item-gap)]"}>
                    <Label htmlFor="ticket-resolution">Catatan Penyelesaian</Label>
                    <Textarea
                      id="ticket-resolution"
                      rows={4}
                      value={handling.resolution}
                      onChange={(e) => setHandling({ ...handling, resolution: e.target.value })}
                      placeholder="Tuliskan tindakan yang dilakukan..."
                      data-testid="ticket-resolution-input"
                    />
                  </div>
                  <div className={isLocked ? "hidden" : "space-y-[var(--item-gap)]"}>
                    <div className="flex items-center justify-between">
                      <Label>Bukti Pengerjaan ({handling.resolution_attachments.length})</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => proofDocsRef.current?.addUrl()}
                          data-testid="btn-proof-url"
                        >
                          <Link2 className="size-4" /> URL
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => proofDocsRef.current?.pickFile()}
                          data-testid="btn-proof-file"
                        >
                          <Upload className="size-4" /> {ACTION.upload}
                        </Button>
                      </div>
                    </div>
                    <DocumentManager
                      ref={proofDocsRef}
                      taskId={ticket.id}
                      documents={handling.resolution_attachments}
                      onChange={(docs) =>
                        setHandling({ ...handling, resolution_attachments: docs })
                      }
                      idPrefix="ticket_proof"
                      label="Bukti Pengerjaan"
                      emptyText="Belum ada bukti pengerjaan"
                      canRespond={false}
                      hideHeaderTitle
                      hideActions
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <dl className="divide-y">
                    <InfoRow label="Status">
                      <TicketStatusBadge status={ticket.status} />
                    </InfoRow>
                    <InfoRow label="Penerima">
                      {(ticket.assignee || {}).name || "Belum ditujukan"}
                    </InfoRow>
                    <InfoRow label="Diselesaikan">{fmtDateTime(ticket.resolved_at)}</InfoRow>
                  </dl>
                  <div>
                    <p className="text-xs text-muted-foreground">Catatan Penyelesaian</p>
                    <p className="whitespace-pre-wrap" data-testid="ticket-resolution-text">
                      {ticket.resolution || "Belum ada catatan penyelesaian."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Bukti Pengerjaan ({(ticket.resolution_attachments || []).length})
                    </p>
                    {(ticket.resolution_attachments || []).length ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {ticket.resolution_attachments.map((a) => (
                          <AttachmentChip key={a.id} doc={a} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Belum ada bukti pengerjaan.</p>
                    )}
                  </div>
                  {!ticket.can_handle ? (
                    <p className="text-xs text-muted-foreground">
                      Hanya penerima tiket yang dapat mengubah status & mengunggah bukti pengerjaan.
                    </p>
                  ) : null}
                </div>
              )
            }
          </EditableCard>

          <Card data-testid="card-ticket-comments">
            <CardHeader>
              <CardTitle className="text-base">Komentar ({comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-muted-foreground">Belum ada komentar.</p>
              ) : null}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-xs font-semibold">
                    {c.author_name?.[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{c.author_name}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        · {fmtDateTime(c.created_at)}
                      </span>
                    </p>
                    {c.message ? (
                      <p className="whitespace-pre-wrap text-muted-foreground">{c.message}</p>
                    ) : null}
                    {(c.attachments || []).length ? (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {c.attachments.map((a) => (
                          <AttachmentChip key={a.id} doc={a} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {!isLocked && (c.author_id === user?.id || isAdminUser(user)) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      aria-label={ACTION.delete}
                      onClick={() => removeComment(c.id)}
                      disabled={deletingId === c.id}
                      data-testid={`btn-delete-comment-${c.id}`}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-2">
              <div className={commentAtts.length ? "" : "sr-only"}>
                <DocumentManager
                  ref={commentDocsRef}
                  taskId={commentDraftId.current}
                  documents={commentAtts}
                  onChange={setCommentAtts}
                  idPrefix="ticket_comment"
                  label="Lampiran komentar"
                  emptyText="Belum ada lampiran"
                  canRespond={false}
                  hideHeaderTitle
                  hideActions
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  placeholder="Tulis balasan..."
                  className="flex-1"
                  disabled={sending}
                  data-testid="ticket-comment-input"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => commentDocsRef.current?.pickFile()}
                  disabled={sending}
                  data-testid="btn-comment-attach-file"
                >
                  <Paperclip className="size-4" /> Lampiran
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => commentDocsRef.current?.addUrl()}
                  disabled={sending}
                  data-testid="btn-comment-attach-url"
                >
                  <Link2 className="size-4" /> URL
                </Button>
                <Button
                  size="sm"
                  onClick={addComment}
                  disabled={sending || (!comment.trim() && commentAtts.length === 0)}
                  data-testid="btn-add-ticket-comment"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {sending ? "Mengirim..." : ACTION.send}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <EditableCard
            title="Ditujukan"
            canEdit={Boolean(ticket.can_reassign)}
            testid="ticket-assignee"
            onEditStart={() => setAssignee(ticket.assignee || null)}
            onSave={() => patch({ assignee }, "Tujuan tiket diperbarui.")}
          >
            {(editing) =>
              editing ? (
                <div className="form-dense space-y-[var(--item-gap)]">
                  <Label>Penerima Tiket</Label>
                  <UserSelect
                    users={assignUsers}
                    value={assignee}
                    onChange={setAssignee}
                    placeholder="Pilih penerima..."
                    testid="ticket-assignee-select"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isOwner
                      ? "Sebagai pelapor, Anda dapat memilih penerima mana pun."
                      : "Sebagai atasan, Anda dapat mengalihkan tiket ke pegawai di bawah jabatan Anda."}
                  </p>
                </div>
              ) : (
                <dl className="divide-y">
                  <InfoRow label="Penerima">
                    <span data-testid="ticket-assignee-name">
                      {(ticket.assignee || {}).name || "Belum ditujukan"}
                    </span>
                  </InfoRow>
                  <InfoRow label="Departemen">
                    {(ticket.assignee || {}).department || "\u2014"}
                  </InfoRow>
                </dl>
              )
            }
          </EditableCard>

          <EditableCard
            title="Informasi Tiket"
            canEdit={canEdit}
            testid="ticket-info"
            onEditStart={() =>
              setInfo({
                category: ticket.category || "Lainnya",
                priority: ticket.priority || "Medium",
              })
            }
            onSave={() => patch(info, "Informasi tiket diperbarui.")}
          >
            {(editing) =>
              editing ? (
                <div className="form-dense space-y-[var(--field-gap)]">
                  <div className="space-y-[var(--item-gap)]">
                    <Label>Kategori</Label>
                    <Select
                      value={info.category}
                      onValueChange={(v) => setInfo({ ...info, category: v })}
                    >
                      <SelectTrigger data-testid="ticket-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
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
                      <SelectTrigger data-testid="ticket-priority-select">
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
                </div>
              ) : (
                <dl className="divide-y">
                  <InfoRow label="Nomor">{ticket.number}</InfoRow>
                  <InfoRow label="Kategori">{ticket.category}</InfoRow>
                  <InfoRow label="Prioritas">
                    <PriorityBadge priority={ticket.priority} />
                  </InfoRow>
                  <InfoRow label="Pelapor">{ticket.created_by_name || "\u2014"}</InfoRow>
                  <InfoRow label="Dibuat">{fmtDateTime(ticket.created_at)}</InfoRow>
                  <InfoRow label="Diperbarui">{fmtDateTime(ticket.updated_at)}</InfoRow>
                </dl>
              )
            }
          </EditableCard>

          <Card data-testid="card-ticket-attachments">
            <CardHeader>
              <CardTitle className="text-base">
                Lampiran ({(ticket.attachments || []).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentManager
                ref={docsRef}
                taskId={ticket.id}
                documents={ticket.attachments || []}
                onChange={(docs) => patch({ attachments: docs })}
                idPrefix="help_ticket"
                label="Lampiran"
                emptyText="Belum ada lampiran"
                canManage={canEdit}
                canRespond={false}
                hideHeaderTitle
                hideActions
              />
            </CardContent>
            {canEdit ? (
              <CardFooter className="justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => docsRef.current?.addUrl()}
                  data-testid="btn-ticket-detail-doc-url"
                >
                  <Link2 className="size-4" /> URL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => docsRef.current?.pickFile()}
                  data-testid="btn-ticket-detail-doc-file"
                >
                  <Upload className="size-4" /> {ACTION.upload}
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
