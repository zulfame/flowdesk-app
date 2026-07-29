import React, { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { canManage } from "@/lib/perms";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState, SectionCard } from "@/components/common";
import RichTextEditor from "@/components/RichTextEditor";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, Pin, PinOff, Clock } from "lucide-react";
import { toast } from "sonner";

const COLORS = { default: "bg-card", yellow: "bg-amber-50 dark:bg-amber-900/20", green: "bg-emerald-50 dark:bg-emerald-900/20", blue: "bg-blue-50 dark:bg-blue-900/20", pink: "bg-pink-50 dark:bg-pink-900/20" };
const ACCENTS = { default: "border-l-slate-300 dark:border-l-slate-600", yellow: "border-l-amber-400", green: "border-l-emerald-400", blue: "border-l-blue-400", pink: "border-l-pink-400" };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null; }

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [readOnly, setReadOnly] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "", color: "default" });

  const load = useCallback(async () => {
    try { const { data } = await api.get("/notes"); setNotes(data); } catch (e) { toast.error(apiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setReadOnly(false); setForm({ title: "", content: "", tags: "", color: "default" }); setOpen(true); };
  const openEdit = (n) => { setEditing(n); setReadOnly(!canManage(user, n)); setForm({ title: n.title, content: n.content || "", tags: (n.tags || []).join(", "), color: n.color || "default" }); setOpen(true); };

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
      <PageHeader title="Kelola Catatan" subtitle="Catatan pribadi Anda — simpan ide, catatan cepat, dan referensi penting.">
        <Button onClick={openNew} className="rounded-xl" data-testid="btn-add-note"><Plus className="h-4 w-4 mr-1.5" /> Catatan</Button>
      </PageHeader>

      {notes.length === 0 ? (
        <Card className="rounded-lg shadow-soft"><EmptyState icon={FileText} title="Belum ada catatan" description="Buat catatan pertama untuk menyimpan pemikiran Anda." action={<Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Catatan</Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {notes.map((n) => {
            const updated = fmtDate(n.updated_at);
            return (
              <SectionCard
                key={n.id}
                onClick={() => openEdit(n)}
                data-testid={`note-card-${n.id}`}
                className={cn("group cursor-pointer border-l-4 hover:shadow-soft-lg hover:-translate-y-0.5 transition-all", ACCENTS[n.color] || ACCENTS.default, COLORS[n.color] || COLORS.default)}
                headerClassName="py-3"
                header={<h3 className="font-semibold truncate flex items-center gap-1.5 min-w-0 flex-1 group-hover:text-primary transition-colors">{n.pinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}{n.title}</h3>}
                headerRight={(
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => togglePin(n)} className="text-muted-foreground hover:text-primary" data-testid={`btn-pin-${n.id}`}>{n.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</button>
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive" data-testid={`btn-delete-note-${n.id}`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
                bodyClassName="bg-card/40"
                footer={(
                  <div className="flex items-center justify-between gap-3">
                    {(n.tags || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 min-w-0">{n.tags.slice(0, 3).map((t, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary truncate">{t}</span>)}{n.tags.length > 3 && <span className="text-xs text-muted-foreground">+{n.tags.length - 3}</span>}</div>
                    ) : <span className="text-xs text-muted-foreground">Tanpa tag</span>}
                    {updated && <span className="text-xs text-muted-foreground inline-flex items-center gap-1 shrink-0"><Clock className="h-3 w-3" /> {updated}</span>}
                  </div>
                )}
              >
                <div className="text-sm text-muted-foreground line-clamp-4 rte-content" dangerouslySetInnerHTML={{ __html: n.content || "<em>Tanpa isi</em>" }} />
              </SectionCard>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{!editing ? "Catatan Baru" : readOnly ? "Lihat Catatan" : "Ubah Catatan"}</DialogTitle></DialogHeader>
          {readOnly && <p className="text-xs text-muted-foreground -mt-2">Catatan ini milik {editing?.created_by_name || "pengguna lain"} — hanya dapat dilihat.</p>}
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
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{readOnly ? "Tutup" : "Batal"}</Button>{!readOnly && <Button onClick={save} data-testid="btn-save-note">Simpan</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
