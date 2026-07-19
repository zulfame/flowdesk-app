import React, { useEffect, useState, useCallback } from "react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users2, Plus, Pencil, Trash2, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS = { admin: "Administrator", manager: "Manajer", member: "Anggota" };

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member", phone: "", department: "" });

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([api.get("/users"), api.get("/roles")]);
      setUsers(u.data); setRoles(r.data);
    } catch (e) { toast.error(apiError(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const isAdmin = user?.role === "admin";

  const openNew = () => { setEditing(null); setForm({ name: "", email: "", password: "", role: "member", phone: "", department: "" }); setOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone || "", department: u.department || "" }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Nama dan email wajib diisi"); return; }
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role, phone: form.phone, department: form.department };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        if (!form.password) { toast.error("Kata sandi wajib untuk pengguna baru"); return; }
        await api.post("/users", form);
      }
      toast.success("Pengguna disimpan");
      setOpen(false); load();
    } catch (e) { toast.error(apiError(e)); }
  };

  const remove = async (id) => { try { await api.delete(`/users/${id}`); toast.success("Pengguna dihapus"); load(); } catch (e) { toast.error(apiError(e)); } };
  const toggleActive = async (u) => { try { await api.put(`/users/${u.id}`, { is_active: !u.is_active }); load(); } catch (e) { toast.error(apiError(e)); } };

  return (
    <div>
      <PageHeader title="Manajemen Pengguna" subtitle="Kelola pengguna, peran, dan hak akses.">
        {isAdmin && <Button onClick={openNew} className="rounded-xl" data-testid="btn-add-user"><Plus className="h-4 w-4 mr-1.5" /> Pengguna</Button>}
      </PageHeader>

      <Tabs defaultValue="users">
        <TabsList className="rounded-xl mb-6">
          <TabsTrigger value="users" className="rounded-lg" data-testid="tab-users">Pengguna</TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg" data-testid="tab-roles">Peran & Izin</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="rounded-2xl shadow-soft divide-y divide-border overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors" data-testid={`user-row-${u.id}`}>
                <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{u.name?.[0]?.toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{u.name} {!u.is_active && <span className="text-xs text-muted-foreground">(nonaktif)</span>}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground shrink-0">{ROLE_LABELS[u.role] || u.role}</span>
                {isAdmin && u.id !== user.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(u)} data-testid={`btn-toggle-active-${u.id}`}>{u.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} data-testid={`btn-edit-user-${u.id}`}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" data-testid={`btn-delete-user-${u.id}`}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus pengguna?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => remove(u.id)} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <Card key={r.id} className="p-5 rounded-2xl shadow-soft" data-testid={`role-card-${r.name}`}>
                <div className="flex items-center gap-2 mb-3"><Shield className="h-5 w-5 text-primary" /><h3 className="font-semibold">{r.label}</h3></div>
                <p className="text-xs text-muted-foreground mb-3">Kode: {r.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(r.permissions || []).map((p, i) => <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary">{p === "*" ? "Semua Izin" : p}</span>)}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Ubah Pengguna" : "Pengguna Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name-input" /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} data-testid="user-email-input" /></div>
            <div className="space-y-1.5"><Label>{editing ? "Kata Sandi Baru (opsional)" : "Kata Sandi"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password-input" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Peran</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{roles.map((r) => <SelectItem key={r.name} value={r.name}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Telepon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="user-phone-input" /></div>
            </div>
            <div className="space-y-1.5"><Label>Departemen</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="mis. Marketing" data-testid="user-department-input" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} data-testid="btn-save-user">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
