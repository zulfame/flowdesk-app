import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Loader2, Mail, Phone, Plus, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UserSelect from "@/components/UserSelect";
import DocumentManager from "@/components/DocumentManager";
import { PRIORITY_META, STATUS_META } from "@/components/composite/TaskBadges";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Draft", "Pending", "On Progress", "Completed", "Overdue", "Cancelled", "Archived"];

const itemOverdue = (item) => item.due_date && !item.done && new Date(item.due_date) < new Date();

const genId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "";

function PersonMeta({ person }) {
  if (!person?.name) return null;
  const rows = [
    { icon: Building2, value: person.department },
    { icon: Phone, value: person.phone },
    { icon: Mail, value: person.email },
  ].filter((r) => r.value);
  if (rows.length === 0) return null;
  return (
    <dl className="space-y-1 rounded-md border bg-muted/40 p-2">
      {rows.map(({ icon: Icon, value }) => (
        <div key={value} className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{value}</span>
        </div>
      ))}
    </dl>
  );
}

/** Form Tugas (buat & ubah) — layout dua kolom: info + item di kiri, orang & dokumen di kanan. */
export default function TaskForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draftId] = useState(genId);
  const taskId = editing ? id : draftId;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    deadline: "",
    status: "Pending",
  });
  const [requester, setRequester] = useState(null);
  const [pic, setPic] = useState(null);
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newItemDue, setNewItemDue] = useState("");

  const loadTask = useCallback(async () => {
    if (!editing) return;
    try {
      const { data } = await api.get(`/tasks/${id}`);
      setForm({
        title: data.title || "",
        description: data.description || "",
        priority: data.priority || "Medium",
        deadline: data.deadline ? data.deadline.slice(0, 10) : "",
        status: data.status,
      });
      setRequester(data.requester?.name ? data.requester : null);
      setPic(data.pic?.name ? data.pic : null);
      setItems(data.items || []);
      setDocuments(data.documents || []);
    } catch (err) {
      notify.error(apiError(err));
      navigate("/tasks");
    } finally {
      setLoading(false);
    }
  }, [editing, id, navigate]);

  useEffect(() => {
    api
      .get("/users?all=true")
      .then(({ data }) => setUsers(data.items))
      .catch(() => {});
    loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!editing && user && !requester) {
      setRequester({
        user_id: user.id,
        name: user.name,
        department: user.department || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, user]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([
      ...items,
      {
        title: newItem.trim(),
        done: false,
        due_date: newItemDue ? new Date(newItemDue).toISOString() : null,
      },
    ]);
    setNewItem("");
    setNewItemDue("");
  };

  const save = async () => {
    if (!form.title.trim()) {
      notify.error("Judul tugas wajib diisi.");
      return;
    }
    if (items.length === 0) {
      notify.error("Tugas harus memiliki minimal satu item tugas.");
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      requester: requester || null,
      pic: pic || null,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      items,
      documents,
    };
    try {
      if (editing) {
        payload.status = form.status;
        const { data } = await api.put(`/tasks/${id}`, payload);
        notify.success("Tugas diperbarui.");
        if (data.pic_wa_url) window.open(data.pic_wa_url, "_blank");
        navigate(`/tasks/${id}`);
      } else {
        payload.id = draftId;
        const { data } = await api.post("/tasks", payload);
        notify.success("Tugas berhasil dibuat.");
        if (data.pic_wa_url) window.open(data.pic_wa_url, "_blank");
        navigate(`/tasks/${data.id}`);
      }
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="form-dense space-y-6" data-testid="task-form-page">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Tugas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-[var(--field-gap)]">
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="task-title">Judul</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Siapkan laporan bulanan"
                  data-testid="task-title-input"
                />
              </div>
              <div className="space-y-[var(--item-gap)]">
                <Label htmlFor="task-desc">Deskripsi</Label>
                <Textarea
                  id="task-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detail pekerjaan, konteks, dan ekspektasi..."
                  data-testid="task-desc-input"
                />
              </div>
              <div className="grid gap-[var(--field-gap)] sm:grid-cols-3">
                <div className="space-y-[var(--item-gap)]">
                  <Label>Prioritas</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger data-testid="task-priority-select">
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
                  <Label htmlFor="task-deadline">Tenggat</Label>
                  <Input
                    id="task-deadline"
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    data-testid="task-deadline-input"
                  />
                </div>
                {editing ? (
                  <div className="space-y-[var(--item-gap)]">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger data-testid="task-status-select">
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
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Item Tugas ({items.length})</CardTitle>
              {items.length === 0 ? (
                <span className="text-xs text-destructive">Minimal satu item tugas wajib ada.</span>
              ) : null}
            </CardHeader>
            <CardContent>
              <div className="divide-y rounded-md border">
                {items.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">Belum ada item tugas.</p>
                ) : (
                  items.map((item, idx) => (
                    <div key={item.id || idx} className="flex items-center gap-2 p-2">
                      <span
                        className={cn(
                          "size-3.5 shrink-0 rounded-sm border",
                          item.done && "border-primary bg-primary"
                        )}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[13px]",
                          item.done && "text-muted-foreground line-through"
                        )}
                      >
                        {item.title}
                      </span>
                      {item.due_date ? (
                        <Badge
                          variant={itemOverdue(item) ? "destructive" : "outline"}
                          className="font-normal"
                        >
                          {fmtDay(item.due_date)}
                        </Badge>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        aria-label={ACTION.delete}
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        data-testid={`remove-item-${idx}`}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                placeholder="Tambah item tugas..."
                className="flex-1"
                data-testid="item-input"
              />
              <Input
                type="date"
                value={newItemDue}
                onChange={(e) => setNewItemDue(e.target.value)}
                className="w-full sm:w-36"
                data-testid="item-due-input"
              />
              <Button type="button" size="sm" variant="outline" onClick={addItem} data-testid="btn-add-item">
                <Plus className="size-4" /> {ACTION.add}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pemberi Tugas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <UserSelect
                users={users}
                value={requester}
                onChange={setRequester}
                placeholder="Pilih pemberi tugas..."
                testid="requester-select"
              />
              <PersonMeta person={requester} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">PIC Pelaksana</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <UserSelect
                users={users}
                value={pic}
                onChange={setPic}
                placeholder="Pilih pelaksana..."
                testid="pic-select"
              />
              <PersonMeta person={pic} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Dokumen Sumber ({documents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentManager
                taskId={taskId}
                documents={documents}
                onChange={setDocuments}
                idPrefix="task"
                hideHeaderTitle
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(editing ? `/tasks/${id}` : "/tasks")}
            data-testid="btn-cancel"
          >
            {ACTION.cancel}
          </Button>
          <Button size="sm" onClick={save} disabled={saving} data-testid="btn-save-task">
            <Save className="size-4" /> {saving ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
