import React, { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/common";
import RichTextEditor from "@/components/RichTextEditor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Pin, PinOff } from "lucide-react";
import { toast } from "sonner";

const COLORS = { default: "bg-card", yellow: "bg-amber-50 dark:bg-amber-900/20", green: "bg-emerald-50 dark:bg-emerald-900/20", blue: "bg-blue-50 dark:bg-blue-900/20", pink: "bg-pink-50 dark:bg-pink-900/20" };

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "", color: "default" });

  const load = useCallback(async () => {
    try { const { data } = await api.get("/notes"); setNotes(data); } catch (e) { toast.error(apiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ title: "", content: "", tags: "", color: "default" }); setOpen(true); };
  const openEdit = (n) => { setEditing(n); setForm({ title: n.title, content: n.content || "", tags: (n.tags || []).join(", "), color: n.color || "default" }); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Judul wajib diisi"); return; }
    const payload = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    try {
      if (editing) await api.put(`/notes/${editing.id}`, payload);
      else await api.post("/notes", payload);
      toast.success("Catatan disimpan");
      setOpen(false); load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const togglePin = async (n) => { try { await api.put(`/notes/${n.id}`, { pinned: !n.pinned }); load(); } catch (e) { toast.error(apiError(e)); } };
  const remove = async (id) => { try { await api.delete(`/notes/${id}`); toast.success("Catatan dihapus"); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div>
      <PageHeader title="Catatan" subtitle="Simpan ide, catatan cepat, dan referensi penting.">
        <Button onClick={openNew} className="rounded-xl" data-testid="btn-add-note"><Plus className="h-4 w-4 mr-1.5" /> Catatan</Button>
      </PageHeader>

      {notes.length === 0 ? (
        <Card className="rounded-2xl shadow-soft"><EmptyState icon={FileText} title="Belum ada catatan" description="Buat catatan pertama untuk menyimpan pemikiran Anda." action={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Catatan</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
            <Card key={n.id} className={`p-5 rounded-2xl shadow-soft cursor-pointer hover:shadow-soft-lg transition-all group ${COLORS[n.color] || COLORS.default}`} onClick={() => openEdit(n)} data-testid={`note-card-${n.id}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold truncate flex items-center gap-1.5">{n.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}{n.title}</h3>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => togglePin(n)} className="text-muted-foreground hover:text-primary" data-testid={`btn-pin-${n.id}`}>{n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</button>
                  <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive" data-testid={`btn-delete-note-${n.id}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground line-clamp-4 rte-content" dangerouslySetInnerHTML={{ __html: n.content || "<em>Tanpa isi</em>" }} />
              {(n.tags || []).length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{n.tags.map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{t}</span>)}</div>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Ubah Catatan" : "Catatan Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="note-title-input" /></div>
            <div className="space-y-1.5"><Label>Isi</Label><RichTextEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} placeholder="Tulis catatan..." minHeight={180} /></div>
            <div className="space-y-1.5"><Label>Tag (pisahkan koma)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ide, penting" data-testid="note-tags-input" /></div>
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <div className="flex gap-2">
                {Object.keys(COLORS).map((c) => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-lg border-2 ${COLORS[c]} ${form.color === c ? "border-primary" : "border-border"}`} data-testid={`note-color-${c}`} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} data-testid="btn-save-note">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
