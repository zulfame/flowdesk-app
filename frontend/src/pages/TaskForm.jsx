import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/common";
import UserSelect from "@/components/UserSelect";
import DocumentManager from "@/components/DocumentManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, X, User, UserCog, Phone, Mail, Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function PersonPreview({ person }) {
  if (!person?.name) return null;
  return (
    <div className="mt-3 space-y-2 text-sm rounded-xl bg-secondary/50 p-3">
      <div className="flex items-center gap-2 min-w-0"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{person.department || "-"}</span></div>
      <div className="flex items-center gap-2 min-w-0"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{person.phone || "-"}</span></div>
      <div className="flex items-center gap-2 min-w-0"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><span className="truncate">{person.email || "-"}</span></div>
    </div>
  );
}

export default function TaskForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [draftId] = useState(genId);
  const taskId = editing ? id : draftId;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", deadline: "", status: "Pending" });
  const [requester, setRequester] = useState(null);
  const [pic, setPic] = useState(null);
  const [items, setItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newItem, setNewItem] = useState("");

  const loadTask = useCallback(async () => {
    if (!editing) return;
    try {
      const { data } = await api.get(`/tasks/${id}`);
      setForm({ title: data.title || "", description: data.description || "", priority: data.priority || "Medium", deadline: data.deadline ? data.deadline.slice(0, 10) : "", status: data.status });
      setRequester(data.requester?.name ? data.requester : (typeof data.requester === "string" && data.requester ? { name: data.requester } : null));
      setPic(data.pic?.name ? data.pic : (typeof data.pic === "string" && data.pic ? { name: data.pic } : null));
      setItems(data.items || []);
      setDocuments(data.documents || []);
    } catch (e) { toast.error(apiError(e)); navigate("/tasks"); }
    finally { setLoading(false); }
  }, [editing, id, navigate]);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(data)).catch(() => {});
    loadTask();
  }, [loadTask]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([...items, { title: newItem.trim(), done: false }]);
    setNewItem("");
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
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
        await api.put(`/tasks/${id}`, payload);
        toast.success("Tugas diperbarui");
        navigate(`/tasks/${id}`);
      } else {
        payload.id = draftId;
        const { data } = await api.post("/tasks", payload);
        toast.success("Tugas berhasil dibuat");
        navigate(`/tasks/${data.id}`);
      }
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const cancelTo = editing ? `/tasks/${id}` : "/tasks";

  return (
    <div>
      <button onClick={() => navigate(cancelTo)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors" data-testid="btn-back">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </button>

      <PageHeader title={editing ? "Ubah Tugas" : "Tugas Baru"} subtitle="Paparkan tugas selengkap mungkin sejak awal.">
        <Button variant="ghost" onClick={() => navigate(cancelTo)} data-testid="btn-cancel">Batal</Button>
        <Button onClick={save} disabled={saving} className="rounded-xl px-6" data-testid="btn-save-task">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-2xl shadow-soft space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Informasi Tugas</h2>
            <div className="space-y-1.5"><Label>Judul *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Siapkan laporan bulanan" className="h-11" data-testid="task-title-input" /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} placeholder="Detail pekerjaan, konteks, dan ekspektasi..." data-testid="task-desc-input" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Prioritas</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="h-11" data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Low">Rendah</SelectItem><SelectItem value="Medium">Sedang</SelectItem><SelectItem value="High">Tinggi</SelectItem><SelectItem value="Urgent">Mendesak</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Tenggat</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="h-11" data-testid="task-deadline-input" /></div>
              {editing && (
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="h-11" data-testid="task-status-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Draft", "Pending", "On Progress", "Completed", "Overdue", "Cancelled", "Archived"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft space-y-3">
            <h2 className="text-sm font-semibold">Item Tugas ({items.filter((i) => i.done).length}/{items.length})</h2>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-border">
                  <span className={`h-4 w-4 rounded border shrink-0 ${item.done ? "bg-primary border-primary" : "border-border"}`} />
                  <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                  <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive" data-testid={`remove-item-${idx}`}><X className="h-4 w-4" /></button>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Belum ada item tugas.</p>}
            </div>
            <div className="flex gap-2">
              <Input value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())} placeholder="Tambah item tugas..." className="h-11" data-testid="item-input" />
              <Button type="button" variant="secondary" onClick={addItem} className="h-11" data-testid="btn-add-item"><Plus className="h-4 w-4" /></Button>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft">
            <DocumentManager taskId={taskId} documents={documents} onChange={setDocuments} label="Dokumen Sumber" idPrefix="task" />
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="p-6 rounded-2xl shadow-soft">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Pemberi Tugas</h2>
            <UserSelect users={users} value={requester} onChange={setRequester} placeholder="Pilih pemberi tugas..." testid="requester-select" />
            <PersonPreview person={requester} />
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserCog className="h-4 w-4 text-primary" /> PIC Pelaksana</h2>
            <UserSelect users={users} value={pic} onChange={setPic} placeholder="Pilih pelaksana..." testid="pic-select" />
            <PersonPreview person={pic} />
          </Card>

          <Card className="p-6 rounded-2xl shadow-soft">
            <h2 className="text-sm font-semibold mb-3">Aksi</h2>
            <Button onClick={save} disabled={saving} className="w-full rounded-xl mb-2" data-testid="btn-save-task-side">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan Tugas
            </Button>
            <Button variant="secondary" onClick={() => navigate(cancelTo)} className="w-full rounded-xl">Batal</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
