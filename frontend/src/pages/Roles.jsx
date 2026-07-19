import React, { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, Plus, Pencil, Trash2, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CORE = ["admin", "manager", "member"];

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", label: "", permissions: [] });
  const [delRole, setDelRole] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([api.get("/roles"), api.get("/permissions")]);
      setRoles(r.data); setPerms(p.data);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm({ name: "", label: "", permissions: [] }); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, label: r.label, permissions: r.permissions?.includes("*") ? perms.map((p) => p.key) : (r.permissions || []) }); setOpen(true); };

  const toggle = (key) => setForm((f) => ({ ...f, permissions: f.permissions.includes(key) ? f.permissions.filter((k) => k !== key) : [...f.permissions, key] }));

  const save = async () => {
    if (!form.label.trim()) { toast.error("Nama peran wajib diisi"); return; }
    const name = editing ? editing.name : form.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const permissions = editing?.name === "admin" ? ["*"] : form.permissions;
    try {
      if (editing) await api.put(`/roles/${editing.id}`, { name: editing.name, label: form.label, permissions });
      else await api.post("/roles", { name, label: form.label, permissions });
      toast.success("Peran disimpan");
      setOpen(false); load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async () => { try { await api.delete(`/roles/${delRole.id}`); toast.success("Peran dihapus"); setDelRole(null); load(); } catch (e) { toast.error(apiError(e)); } };

  const permLabel = (key) => key === "*" ? "Semua Izin" : (perms.find((p) => p.key === key)?.label || key);

  return (
    <div>
      <PageHeader title="Kelola Peranan" subtitle="Atur peran dan hak akses tiap kelompok pengguna.">
        <Button onClick={openNew} className="rounded-xl" data-testid="btn-add-role"><Plus className="h-4 w-4 mr-1.5" /> Peran</Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => {
            const isCore = CORE.includes(r.name);
            const all = r.permissions?.includes("*");
            return (
              <Card key={r.id} className="p-5 rounded-2xl shadow-soft flex flex-col" data-testid={`role-card-${r.name}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2"><div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center"><ShieldCheck className="h-4 w-4 text-primary" /></div><div><h3 className="font-semibold leading-tight">{r.label}</h3><p className="text-xs text-muted-foreground">{r.name}</p></div></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} data-testid={`btn-edit-role-${r.name}`}><Pencil className="h-4 w-4" /></Button>
                    {!isCore && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDelRole(r)} data-testid={`btn-delete-role-${r.name}`}><Trash2 className="h-4 w-4" /></Button>}
                    {isCore && <span className="h-8 w-8 flex items-center justify-center text-muted-foreground" title="Peran bawaan"><Lock className="h-4 w-4" /></span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {all ? <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Semua Izin</span>
                    : (r.permissions || []).length === 0 ? <span className="text-xs text-muted-foreground">Tanpa izin</span>
                    : (r.permissions || []).map((p) => <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{permLabel(p)}</span>)}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Ubah Peran" : "Peran Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nama Peran</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="mis. Supervisor" data-testid="role-label-input" /></div>
            <div>
              <Label className="mb-2 block">Hak Akses</Label>
              {editing?.name === "admin" ? (
                <p className="text-sm text-muted-foreground bg-secondary/60 rounded-xl p-3">Administrator memiliki semua izin secara permanen.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {perms.map((p) => (
                    <div key={p.key} className="flex items-center justify-between p-2.5 rounded-xl border border-border" data-testid={`perm-row-${p.key}`}>
                      <span className="text-sm">{p.label}</span>
                      <Switch checked={form.permissions.includes(p.key)} onCheckedChange={() => toggle(p.key)} data-testid={`perm-switch-${p.key}`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} data-testid="btn-save-role">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delRole} onOpenChange={(v) => !v && setDelRole(null)} title="Hapus peran?" description={`Peran "${delRole?.label}" akan dihapus.`} onConfirm={remove} />
    </div>
  );
}
