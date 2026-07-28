import React, { useState } from "react";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/common";
import ImageUpload from "@/components/ImageUpload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCircle, Save, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

const ROLE_LABELS = { admin: "Administrator", manager: "Manajer", member: "Anggota" };

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "", email: user?.email || "",
    phone: user?.phone || "", department: user?.department || "", avatar: user?.avatar || "",
  });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const saveProfile = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Nama dan email wajib diisi"); return; }
    setSaving(true);
    try {
      const { data } = await api.put("/profile", form);
      setUser(data);
      toast.success("Profil diperbarui. Data terkait ikut disesuaikan.");
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pwd.new_password.length < 6) { toast.error("Kata sandi baru minimal 6 karakter"); return; }
    if (pwd.new_password !== pwd.confirm) { toast.error("Konfirmasi kata sandi tidak cocok"); return; }
    setSavingPwd(true);
    try {
      await api.put("/profile/password", { current_password: pwd.current_password, new_password: pwd.new_password });
      toast.success("Kata sandi berhasil diperbarui");
      setPwd({ current_password: "", new_password: "", confirm: "" });
    } catch (e) { toast.error(apiError(e)); }
    finally { setSavingPwd(false); }
  };

  return (
    <div>
      <PageHeader title="Profil Pengguna" subtitle="Kelola informasi diri dan kata sandi Anda." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 rounded-lg shadow-soft" data-testid="profile-info-card">
            <div className="flex items-center gap-2 mb-5"><UserCircle className="h-5 w-5 text-primary" /><h2 className="font-semibold">Informasi Diri</h2></div>
            <div className="mb-5">
              <Label className="mb-2 block">Foto Profil</Label>
              <ImageUpload value={form.avatar} onChange={(v) => setForm({ ...form, avatar: v })} rounded="rounded-full" label="Unggah Foto" testId="avatar" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name" /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="profile-email" /></Field>
              <Field label="Telepon"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08xxxx" data-testid="profile-phone" /></Field>
              <Field label="Departemen"><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="mis. Operasional" data-testid="profile-department" /></Field>
            </div>
            <div className="flex items-start gap-2 mt-4 text-xs text-muted-foreground bg-secondary/60 rounded-xl p-3">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Perubahan email atau nomor telepon akan otomatis disinkronkan ke tugas, rapat, dan data terkait lainnya agar tetap konsisten.</span>
            </div>
            <div className="mt-5"><Button onClick={saveProfile} disabled={saving} className="rounded-xl" data-testid="btn-save-profile">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan Perubahan</Button></div>
          </Card>

          <Card className="p-6 rounded-lg shadow-soft" data-testid="profile-password-card">
            <div className="flex items-center gap-2 mb-5"><KeyRound className="h-5 w-5 text-primary" /><h2 className="font-semibold">Ubah Kata Sandi</h2></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kata Sandi Saat Ini"><Input type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} data-testid="pwd-current" /></Field>
              <Field label="Kata Sandi Baru"><Input type="password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} data-testid="pwd-new" /></Field>
              <Field label="Konfirmasi"><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} data-testid="pwd-confirm" /></Field>
            </div>
            <div className="mt-5"><Button onClick={savePassword} disabled={savingPwd} variant="secondary" className="rounded-xl" data-testid="btn-save-password">{savingPwd ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />} Perbarui Kata Sandi</Button></div>
          </Card>
        </div>

        <Card className="p-6 rounded-lg shadow-soft h-fit" data-testid="profile-summary-card">
          <div className="flex flex-col items-center text-center">
            <div className="h-24 w-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold overflow-hidden mb-4">
              {form.avatar ? <img src={form.avatar} alt="" className="h-full w-full object-cover" /> : (user?.name?.[0] || "?").toUpperCase()}
            </div>
            <h3 className="font-semibold text-lg">{form.name || user?.name}</h3>
            <p className="text-sm text-muted-foreground">{form.email || user?.email}</p>
            <span className="mt-3 text-xs font-medium px-3 py-1 rounded-full bg-accent text-accent-foreground">{ROLE_LABELS[user?.role] || user?.role}</span>
            {form.department && <p className="text-sm text-muted-foreground mt-3">{form.department}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
