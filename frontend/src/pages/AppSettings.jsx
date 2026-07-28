import React, { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { useBranding } from "@/context/BrandingContext";
import { PageHeader } from "@/components/common";
import ImageUpload from "@/components/ImageUpload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, Save, Loader2, Palette, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

function Field({ label, children, hint }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"];
const LANGS = [{ v: "id", l: "Indonesia" }, { v: "en", l: "English" }];
const DATE_FORMATS = ["DD/MM/YYYY", "YYYY-MM-DD", "DD MMM YYYY"];

export default function AppSettings() {
  const { refresh } = useBranding();
  const [g, setG] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/settings").then(({ data }) => setG(data.general)).catch((e) => toast.error(apiError(e))); }, []);
  const up = (k, v) => setG((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { general: g, application: { primary_color: g.primary_color, date_format: g.date_format } });
      toast.success("Konfigurasi aplikasi disimpan");
      refresh();
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  if (!g) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Kelola Aplikasi" subtitle="Atur identitas, tampilan, dan metadata aplikasi.">
        <Button onClick={save} disabled={saving} className="rounded-xl" data-testid="btn-save-app-settings">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 rounded-lg shadow-soft" data-testid="app-identity-card">
          <div className="flex items-center gap-2 mb-5"><SlidersHorizontal className="h-5 w-5 text-primary" /><h2 className="font-semibold">Identitas</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama Aplikasi"><Input value={g.app_name} onChange={(e) => up("app_name", e.target.value)} data-testid="setting-app-name" /></Field>
            <Field label="Perusahaan"><Input value={g.company} onChange={(e) => up("company", e.target.value)} data-testid="setting-company" /></Field>
            <Field label="Zona Waktu">
              <Select value={g.timezone} onValueChange={(v) => up("timezone", v)}><SelectTrigger data-testid="setting-timezone"><SelectValue /></SelectTrigger><SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field label="Bahasa">
              <Select value={g.language} onValueChange={(v) => up("language", v)}><SelectTrigger data-testid="setting-language"><SelectValue /></SelectTrigger><SelectContent>{LANGS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field label="Format Tanggal">
              <Select value={g.date_format} onValueChange={(v) => up("date_format", v)}><SelectTrigger data-testid="setting-date-format"><SelectValue /></SelectTrigger><SelectContent>{DATE_FORMATS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
            </Field>
            <Field label="URL Aplikasi"><Input value={g.app_url} onChange={(e) => up("app_url", e.target.value)} placeholder="https://..." data-testid="setting-app-url" /></Field>
          </div>
          <div className="mt-4"><Field label="Meta Deskripsi" hint="Digunakan untuk SEO / preview tautan."><Textarea value={g.meta_description} onChange={(e) => up("meta_description", e.target.value)} rows={2} data-testid="setting-meta-description" /></Field></div>
        </Card>

        <Card className="p-6 rounded-lg shadow-soft" data-testid="app-branding-card">
          <div className="flex items-center gap-2 mb-5"><Palette className="h-5 w-5 text-primary" /><h2 className="font-semibold">Tampilan & Merek</h2></div>
          <div className="space-y-5">
            <Field label="Warna Utama">
              <div className="flex items-center gap-3">
                <input type="color" value={g.primary_color || "#4F46E5"} onChange={(e) => up("primary_color", e.target.value)} className="h-10 w-14 rounded-lg border border-border cursor-pointer" data-testid="setting-primary-color" />
                <Input value={g.primary_color} onChange={(e) => up("primary_color", e.target.value)} className="max-w-[140px]" />
              </div>
            </Field>
            <Field label="Logo" hint="Tampil di sidebar. Maks 600 KB."><ImageUpload value={g.logo} onChange={(v) => up("logo", v)} label="Unggah Logo" testId="logo" /></Field>
            <Field label="Favicon" hint="Ikon tab browser (PNG/ICO)."><ImageUpload value={g.favicon} onChange={(v) => up("favicon", v)} label="Unggah Favicon" testId="favicon" /></Field>
            <Field label="Thumbnail" hint="Gambar preview saat dibagikan."><ImageUpload value={g.thumbnail} onChange={(v) => up("thumbnail", v)} label="Unggah Thumbnail" testId="thumbnail" /></Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
