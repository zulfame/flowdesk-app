import React, { useEffect, useState, useCallback, useRef } from "react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Plus, Pencil, Trash2, Shield, ShieldOff, Search, Upload, Download, ChevronLeft, ChevronRight, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS = { admin: "Administrator", manager: "Manajer", member: "Anggota" };
const emptyForm = { name: "", email: "", password: "", role: "member", phone: "", department: "" };
const PAGE_SIZE = 15;

export default function Users() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [data, setData] = useState({ items: [], total: 0, page: 1, page_size: PAGE_SIZE });
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [delId, setDelId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users", { params: { page, page_size: PAGE_SIZE, q: q || undefined, role: roleFilter } });
      setData(data);
    } catch (e) { toast.error(apiError(e)); }
    finally { setLoading(false); }
  }, [page, q, roleFilter]);

  useEffect(() => { api.get("/roles").then(({ data }) => setRoles(data)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setPage(1); }, [q, roleFilter]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
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

  const remove = async () => { try { await api.delete(`/users/${delId}`); toast.success("Pengguna dihapus"); setDelId(null); load(); } catch (e) { toast.error(apiError(e)); } };
  const toggleActive = async (u) => { try { await api.put(`/users/${u.id}`, { is_active: !u.is_active }); load(); } catch (e) { toast.error(apiError(e)); } };

  const doImport = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/users/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResult(data);
      toast.success(`Impor selesai: ${data.created} baru, ${data.updated} diperbarui`);
      load();
    } catch (err) { toast.error(apiError(err)); }
    finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const csv = "name,email,role,phone,department\nBudi Santoso,budi@contoh.com,member,081234567890,Operasional\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "template-pengguna.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Kelola Pengguna" subtitle="Kelola akun pengguna dan hak akses mereka.">
        {isAdmin && <>
          <Button variant="secondary" onClick={() => { setImportResult(null); setImportOpen(true); }} className="rounded-xl" data-testid="btn-import-users"><Upload className="h-4 w-4 mr-1.5" /> Impor</Button>
          <Button onClick={openNew} className="rounded-xl" data-testid="btn-add-user"><Plus className="h-4 w-4 mr-1.5" /> Pengguna</Button>
        </>}
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, departemen..." className="pl-9 rounded-xl" data-testid="user-search" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl" data-testid="user-role-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Peran</SelectItem>
            {roles.map((r) => <SelectItem key={r.name} value={r.name}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-lg shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={Users2} title="Tidak ada pengguna" description="Sesuaikan pencarian atau tambah pengguna baru." />
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors" data-testid={`user-row-${u.id}`}>
                <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 overflow-hidden">{u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : u.name?.[0]?.toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{u.name} {!u.is_active && <span className="text-xs text-muted-foreground">(nonaktif)</span>}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}{u.department ? ` · ${u.department}` : ""}</p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground shrink-0">{ROLE_LABELS[u.role] || u.role}</span>
                {isAdmin && u.id !== user.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(u)} data-testid={`btn-toggle-active-${u.id}`} title={u.is_active ? "Nonaktifkan" : "Aktifkan"}>{u.is_active ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} data-testid={`btn-edit-user-${u.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDelId(u.id)} data-testid={`btn-delete-user-${u.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <span data-testid="user-total">{data.total} pengguna</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="user-prev"><ChevronLeft className="h-4 w-4" /></Button>
          <span data-testid="user-page">Hal {data.page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} data-testid="user-next"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impor Pengguna</DialogTitle>
            <DialogDescription>Unggah berkas CSV atau Excel (.xlsx). Kolom: name, email, role, phone, department. Email yang sudah ada akan diperbarui otomatis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Button variant="outline" className="w-full rounded-xl" onClick={downloadTemplate} data-testid="btn-download-template"><Download className="h-4 w-4 mr-1.5" /> Unduh Template CSV</Button>
            <button onClick={() => fileRef.current?.click()} disabled={importing} className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 hover:border-primary transition-colors" data-testid="import-dropzone">
              {importing ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />}
              <span className="text-sm font-medium">{importing ? "Mengimpor..." : "Pilih berkas CSV / XLSX"}</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={doImport} data-testid="import-file-input" />
            {importResult && (
              <div className="rounded-xl bg-secondary/60 p-4 text-sm space-y-1" data-testid="import-result">
                <p><b>{importResult.created}</b> pengguna baru dibuat, <b>{importResult.updated}</b> diperbarui.</p>
                <p className="text-muted-foreground">Kata sandi default pengguna baru: <b>{importResult.default_password}</b></p>
                {importResult.errors?.length > 0 && <div className="text-destructive text-xs mt-2">{importResult.errors.slice(0, 5).map((e, i) => <p key={i}>{e}</p>)}{importResult.errors.length > 5 && <p>+{importResult.errors.length - 5} lainnya</p>}</div>}
              </div>
            )}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setImportOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)} title="Hapus pengguna?" description="Tindakan ini tidak dapat dibatalkan." onConfirm={remove} />
    </div>
  );
}
