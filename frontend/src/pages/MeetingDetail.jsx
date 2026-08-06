import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import AttachmentPanel from "@/components/AttachmentPanel";
import UserSelect from "@/components/UserSelect";
import { EditableCard } from "@/components/composite/EditableCard";
import { MEETING_TYPES, MeetingTypeBadge } from "@/components/composite/MeetingBadges";
import { StatusBadge, PRIORITY_META } from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { canManage } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

/** Detail Rapat — satu halaman untuk melihat & menyunting (halaman Ubah dihapus, FD11). */
export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [users, setUsers] = useState([]);
  const [notes, setNotes] = useState("");
  const [decisions, setDecisions] = useState("");
  const [agenda, setAgenda] = useState("");
  const [tab, setTab] = useState("notes");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [head, setHead] = useState({
    title: "",
    meeting_type: "Internal",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
  });
  const [participants, setParticipants] = useState([]);
  const [pickerKey, setPickerKey] = useState(0);
  const [newAction, setNewAction] = useState("");
  const [convert, setConvert] = useState(null);
  const [convForm, setConvForm] = useState({ pic: null, priority: "Medium", deadline: "" });
  const [waOpen, setWaOpen] = useState(false);
  const [waLinks, setWaLinks] = useState([]);
  const attachRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/meetings/${id}`);
      setMeeting(data);
      setNotes(data.notes || "");
      setDecisions(data.decisions || "");
      setAgenda(data.agenda || "");
    } catch (err) {
      notify.error(apiError(err));
      navigate("/meetings");
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

  const patch = async (partial) => {
    try {
      const { data } = await api.put(`/meetings/${id}`, partial);
      setMeeting((prev) => ({ ...data, generated_tasks: prev.generated_tasks }));
      return true;
    } catch (err) {
      notify.error(apiError(err));
      return false;
    }
  };

  const saveAnd = async (partial, message) => {
    const ok = await patch(partial);
    if (ok) notify.success(message);
    return ok;
  };

  const saveMinutes = async () => {
    setSaving(true);
    const ok = await patch({ notes, decisions, agenda });
    setSaving(false);
    if (ok) notify.success("Catatan rapat disimpan.");
  };

  const actionItems = meeting?.action_items || [];

  const persistActions = async (list) => {
    setBusy(true);
    const ok = await patch({ action_items: list });
    setBusy(false);
    return ok;
  };

  const addAction = async () => {
    if (!newAction.trim()) return;
    const ok = await persistActions([...actionItems, { text: newAction.trim(), done: false }]);
    if (ok) {
      setNewAction("");
      notify.success("Item aksi ditambahkan.");
    }
  };

  const toggleAction = (itemId) =>
    persistActions(actionItems.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)));

  const removeAction = (itemId) => persistActions(actionItems.filter((i) => i.id !== itemId));

  const doConvert = async () => {
    if (!convForm.pic?.name) {
      notify.error("PIC pelaksana wajib dipilih.");
      return;
    }
    if (!convForm.deadline) {
      notify.error("Tenggat tugas wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/meetings/${id}/action-items/${convert.id}/convert`, {
        pic: convForm.pic,
        priority: convForm.priority,
        deadline: new Date(convForm.deadline).toISOString(),
      });
      notify.success("Item aksi berhasil menjadi tugas.");
      setConvert(null);
      navigate(`/tasks/${data.id}`);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const broadcast = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/meetings/${id}/broadcast`, {});
      const parts = [];
      if (data.email_sent) parts.push(`email ke ${data.email_sent} peserta`);
      if (data.push_sent) parts.push(`notifikasi browser ke ${data.push_sent} peserta`);
      if (data.telegram_sent) parts.push("Telegram grup");
      if ((data.wa_urls || []).length) parts.push(`${data.wa_urls.length} tautan WhatsApp`);
      if (parts.length) notify.success(`Pemberitahuan terkirim: ${parts.join(", ")}.`);
      else notify.info("Tidak ada kanal aktif atau kontak peserta. Atur di Kelola Notifikasi.");
      if ((data.wa_urls || []).length) {
        setWaLinks(data.wa_urls);
        setWaOpen(true);
      }
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (!meeting)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );

  const manage = canManage(user, meeting);
  const current = meeting.participants || [];
  const doneActions = actionItems.filter((i) => i.done).length;

  return (
    <div className="form-dense space-y-6" data-testid="meeting-detail-page">
      <EditableCard
        title={meeting.title}
        canEdit={manage}
        testid="head"
        onEditStart={() => {
          setHead({
            title: meeting.title || "",
            meeting_type: meeting.meeting_type || "Internal",
            date: meeting.date || "",
            start_time: meeting.start_time || "",
            end_time: meeting.end_time || "",
            location: meeting.location || "",
          });
        }}
        onSave={() => {
          if (!head.title.trim()) {
            notify.error("Judul rapat wajib diisi.");
            return false;
          }
          return saveAnd(head, "Informasi rapat diperbarui.");
        }}
        headerExtra={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/meetings")}
            data-testid="btn-back"
          >
            <ArrowLeft className="size-4" /> {ACTION.back}
          </Button>
        }
      >
        {(editing) =>
          editing ? (
            <div className="space-y-[var(--field-gap)]">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="head-title">Judul Rapat</Label>
                <Input
                  id="head-title"
                  value={head.title}
                  onChange={(e) => setHead({ ...head, title: e.target.value })}
                  data-testid="head-title-input"
                />
              </div>
              <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
                <div className="space-y-[var(--item-gap)]">
                  <Label>Jenis Rapat</Label>
                  <Select
                    value={head.meeting_type}
                    onValueChange={(v) => setHead({ ...head, meeting_type: v })}
                  >
                    <SelectTrigger data-testid="head-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEETING_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="head-location">Lokasi / Tautan</Label>
                  <Input
                    id="head-location"
                    value={head.location}
                    onChange={(e) => setHead({ ...head, location: e.target.value })}
                    data-testid="head-location-input"
                  />
                </div>
              </div>
              <div className="grid gap-[var(--field-gap)] sm:grid-cols-3">
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="head-date">Tanggal</Label>
                  <Input
                    id="head-date"
                    type="date"
                    value={head.date}
                    onChange={(e) => setHead({ ...head, date: e.target.value })}
                    data-testid="head-date-input"
                  />
                </div>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="head-start">Mulai</Label>
                  <Input
                    id="head-start"
                    type="time"
                    value={head.start_time}
                    onChange={(e) => setHead({ ...head, start_time: e.target.value })}
                    data-testid="head-start-input"
                  />
                </div>
                <div className="space-y-[var(--item-gap)]">
                  <Label htmlFor="head-end">Selesai</Label>
                  <Input
                    id="head-end"
                    type="time"
                    value={head.end_time}
                    onChange={(e) => setHead({ ...head, end_time: e.target.value })}
                    data-testid="head-end-input"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <MeetingTypeBadge type={meeting.meeting_type} />
              {meeting.date ? (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {new Date(meeting.date).toLocaleDateString("id-ID", { dateStyle: "long" })}
                </span>
              ) : null}
              {meeting.start_time ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {meeting.start_time}
                  {meeting.end_time ? ` \u2013 ${meeting.end_time}` : ""}
                </span>
              ) : null}
              {meeting.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {meeting.location}
                </span>
              ) : null}
            </div>
          )
        }
      </EditableCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Tabs value={tab} onValueChange={setTab}>
            <Card>
              <CardHeader>
                <TabsList className="w-fit max-w-full overflow-x-auto">
                  <TabsTrigger value="notes" data-testid="tab-notes">
                    Catatan
                  </TabsTrigger>
                  <TabsTrigger value="decisions" data-testid="tab-decisions">
                    Keputusan
                  </TabsTrigger>
                  <TabsTrigger value="agenda" data-testid="tab-agenda">
                    Agenda
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="notes" className="mt-0">
                  <RichTextEditor
                    value={notes}
                    onChange={setNotes}
                    placeholder="Tulis notulen rapat di sini..."
                    minHeight={260}
                  />
                </TabsContent>
                <TabsContent value="decisions" className="mt-0">
                  <RichTextEditor
                    value={decisions}
                    onChange={setDecisions}
                    placeholder="Catat keputusan rapat..."
                    minHeight={260}
                  />
                </TabsContent>
                <TabsContent value="agenda" className="mt-0">
                  <Textarea
                    rows={10}
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    placeholder="Poin-poin agenda rapat..."
                    data-testid="agenda-input"
                  />
                </TabsContent>
              </CardContent>
              <CardFooter className="justify-end">
                <Button size="sm" onClick={saveMinutes} disabled={saving} data-testid="btn-save-notes">
                  <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
                </Button>
              </CardFooter>
            </Card>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Item Aksi ({doneActions}/{actionItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {actionItems.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  Belum ada item aksi. Catat tindak lanjut rapat di sini.
                </p>
              ) : (
                <div className="divide-y">
                  {actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-6 py-2 transition-colors hover:bg-muted/40"
                      data-testid={`action-item-${item.id}`}
                    >
                      <Checkbox
                        checked={Boolean(item.done)}
                        onCheckedChange={() => toggleAction(item.id)}
                        disabled={busy}
                        data-testid={`action-check-${item.id}`}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[13px]",
                          item.done && "text-muted-foreground line-through"
                        )}
                      >
                        {item.text}
                      </span>
                      {item.converted_task_id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-xs"
                          onClick={() => navigate(`/tasks/${item.converted_task_id}`)}
                          data-testid={`action-task-${item.id}`}
                        >
                          <ExternalLink className="size-3.5" /> Tugas
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 shrink-0 rounded-md px-2.5 py-0.5 text-xs font-normal"
                          onClick={() => {
                            setConvert(item);
                            setConvForm({ pic: null, priority: "Medium", deadline: meeting.date || "" });
                          }}
                          data-testid={`action-convert-${item.id}`}
                        >
                          Buat Tugas
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={ACTION.delete}
                        onClick={() => removeAction(item.id)}
                        data-testid={`action-remove-${item.id}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="gap-2">
              <Input
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAction()}
                placeholder="Tambah item aksi..."
                className="flex-1"
                data-testid="action-input"
              />
              <Button size="sm" onClick={addAction} disabled={busy} data-testid="btn-add-action">
                <Plus className="size-4" /> {ACTION.add}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <EditableCard
            title={`Peserta (${current.length})`}
            canEdit={manage}
            testid="participants"
            onEditStart={() => {
              setParticipants([...current]);
              setPickerKey((k) => k + 1);
            }}
            onSave={() => saveAnd({ participants }, "Daftar peserta diperbarui.")}
            contentClassName="space-y-2"
            footerExtra={
              <Button
                variant="outline"
                size="sm"
                onClick={broadcast}
                disabled={busy || current.length === 0}
                data-testid="btn-broadcast-meeting"
              >
                <Megaphone className="size-4" /> {ACTION.send}
              </Button>
            }
          >
            {(editing) =>
              editing ? (
                <>
                  <UserSelect
                    key={pickerKey}
                    users={users}
                    value={null}
                    onChange={(u) => {
                      if (u?.name && !participants.includes(u.name)) {
                        setParticipants((p) => [...p, u.name]);
                      }
                      setPickerKey((k) => k + 1);
                    }}
                    placeholder="Tambah peserta..."
                    testid="participant-select"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {participants.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Belum ada peserta.</p>
                    ) : (
                      participants.map((p, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="gap-1 font-normal"
                          data-testid={`participant-chip-${i}`}
                        >
                          {p}
                          <button
                            type="button"
                            aria-label={`Hapus ${p}`}
                            onClick={() => setParticipants(participants.filter((_, j) => j !== i))}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {current.length === 0 ? (
                    <p className="text-muted-foreground">Belum ada peserta.</p>
                  ) : (
                    current.map((p, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">
                        {p}
                      </Badge>
                    ))
                  )}
                </div>
              )
            }
          </EditableCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lampiran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AttachmentPanel
                ref={attachRef}
                module="meeting"
                parentId={user ? `${id}:${user.id}` : null}
                hideHeader
              />
              <p className="text-xs text-muted-foreground">
                Lampiran bersifat pribadi — hanya Anda yang dapat melihatnya.
              </p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => attachRef.current?.open()}
                data-testid="btn-upload-attachment"
              >
                <Upload className="size-4" /> {ACTION.upload}
              </Button>
            </CardFooter>
          </Card>

          {(meeting.generated_tasks || []).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Tugas Turunan ({meeting.generated_tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {meeting.generated_tasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/tasks/${t.id}`)}
                      className="flex w-full items-center justify-between gap-2 px-6 py-2 text-left transition-colors hover:bg-muted/40"
                      data-testid={`generated-task-${t.id}`}
                    >
                      <span className="min-w-0 truncate text-[13px]">{t.title}</span>
                      <StatusBadge status={t.status} />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog open={Boolean(convert)} onOpenChange={(o) => !o && setConvert(null)}>
        <DialogContent className="sm:max-w-md" data-testid="convert-action-dialog">
          <DialogHeader>
            <DialogTitle>Buat Tugas dari Item Aksi</DialogTitle>
            <DialogDescription>
              "{convert?.text}" akan menjadi tugas yang tertaut ke rapat ini.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="form-dense space-y-[var(--field-gap)]">
            <div className="space-y-[var(--item-gap)]">
              <Label>PIC Pelaksana</Label>
              <UserSelect
                users={users}
                value={convForm.pic}
                onChange={(v) => setConvForm({ ...convForm, pic: v })}
                placeholder="Pilih pelaksana..."
                testid="convert-pic-select"
              />
            </div>
            <div className="grid gap-[var(--field-gap)] sm:grid-cols-2">
              <div className="space-y-[var(--item-gap)]">
                <Label>Prioritas</Label>
                <Select
                  value={convForm.priority}
                  onValueChange={(v) => setConvForm({ ...convForm, priority: v })}
                >
                  <SelectTrigger data-testid="convert-priority-select">
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
                <Label htmlFor="conv-deadline">Tenggat</Label>
                <Input
                  id="conv-deadline"
                  type="date"
                  value={convForm.deadline}
                  onChange={(e) => setConvForm({ ...convForm, deadline: e.target.value })}
                  data-testid="convert-deadline-input"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvert(null)}>
              {ACTION.cancel}
            </Button>
            <Button size="sm" onClick={doConvert} disabled={busy} data-testid="btn-confirm-convert">
              <ClipboardCheck className="size-4" /> Buat Tugas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="sm:max-w-md" data-testid="wa-links-dialog">
          <DialogHeader>
            <DialogTitle>Kirim WhatsApp ke Peserta</DialogTitle>
            <DialogDescription>
              WhatsApp bersifat manual — klik untuk membuka chat berisi pesan pemberitahuan.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="divide-y rounded-md border">
              {waLinks.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Tidak ada peserta dengan nomor telepon.
                </p>
              ) : (
                waLinks.map((w, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2">
                    <span className="min-w-0 truncate text-[13px] font-medium">{w.name}</span>
                    <a href={w.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" data-testid={`wa-link-${i}`}>
                        <MessageCircle className="size-4" /> Buka
                      </Button>
                    </a>
                  </div>
                ))
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setWaOpen(false)}>
              {ACTION.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
