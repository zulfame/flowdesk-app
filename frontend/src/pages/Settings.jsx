import React, { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { isAdminUser } from "@/lib/perms";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings2, Mail, Send, BellRing, HardDrive, Palette, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/settings").then(({ data }) => setSettings(data)).catch((e) => toast.error(apiError(e))); }, []);

  const update = (section, key, value) => setSettings((s) => ({ ...s, [section]: { ...s[section], [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      const { general, email, telegram, notification, storage, application } = settings;
      await api.put("/settings", { general, email, telegram, notification, storage, application });
      toast.success("Pengaturan disimpan");
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const testNotify = async (channel) => {
    try { await api.post("/settings/test-notification", { channel }); toast.success(`Notifikasi uji ${channel} dikirim`); }
    catch (e) { toast.error(apiError(e)); }
  };

  if (!settings) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Konfigurasi Sistem" subtitle="Atur aplikasi, notifikasi, dan integrasi.">
        {isAdmin && <Button onClick={save} disabled={saving} className="rounded-xl" data-testid="btn-save-settings">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan</Button>}
      </PageHeader>

      {!isAdmin && <p className="mb-4 text-sm text-muted-foreground bg-secondary/60 rounded-xl p-3">Hanya administrator yang dapat mengubah pengaturan. Beberapa nilai sensitif disembunyikan.</p>}

      <Tabs defaultValue="general">
        <TabsList className="rounded-xl mb-6 flex-wrap h-auto">
          <TabsTrigger value="general" className="rounded-lg" data-testid="tab-general"><Settings2 className="h-4 w-4 mr-1.5" /> Umum</TabsTrigger>
          <TabsTrigger value="email" className="rounded-lg" data-testid="tab-email"><Mail className="h-4 w-4 mr-1.5" /> Email</TabsTrigger>
          <TabsTrigger value="telegram" className="rounded-lg" data-testid="tab-telegram"><Send className="h-4 w-4 mr-1.5" /> Telegram</TabsTrigger>
          <TabsTrigger value="notification" className="rounded-lg" data-testid="tab-notification"><BellRing className="h-4 w-4 mr-1.5" /> Notifikasi</TabsTrigger>
          <TabsTrigger value="storage" className="rounded-lg" data-testid="tab-storage"><HardDrive className="h-4 w-4 mr-1.5" /> Penyimpanan</TabsTrigger>
          <TabsTrigger value="application" className="rounded-lg" data-testid="tab-application"><Palette className="h-4 w-4 mr-1.5" /> Aplikasi</TabsTrigger>
        </TabsList>

        <fieldset disabled={!isAdmin}>
          <TabsContent value="general">
            <Card className="p-6 rounded-lg shadow-soft grid gap-4 sm:grid-cols-2">
              <Field label="Nama Aplikasi"><Input value={settings.general.app_name} onChange={(e) => update("general", "app_name", e.target.value)} data-testid="setting-app-name" /></Field>
              <Field label="Perusahaan"><Input value={settings.general.company} onChange={(e) => update("general", "company", e.target.value)} data-testid="setting-company" /></Field>
              <Field label="Zona Waktu"><Input value={settings.general.timezone} onChange={(e) => update("general", "timezone", e.target.value)} data-testid="setting-timezone" /></Field>
              <Field label="Bahasa"><Input value={settings.general.language} onChange={(e) => update("general", "language", e.target.value)} data-testid="setting-language" /></Field>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card className="p-6 rounded-lg shadow-soft grid gap-4 sm:grid-cols-2">
              <Field label="SMTP Host"><Input value={settings.email.smtp_host} onChange={(e) => update("email", "smtp_host", e.target.value)} placeholder="smtp.gmail.com" data-testid="setting-smtp-host" /></Field>
              <Field label="SMTP Port"><Input type="number" value={settings.email.smtp_port} onChange={(e) => update("email", "smtp_port", parseInt(e.target.value) || 587)} data-testid="setting-smtp-port" /></Field>
              <Field label="SMTP User"><Input value={settings.email.smtp_user} onChange={(e) => update("email", "smtp_user", e.target.value)} placeholder="you@gmail.com" data-testid="setting-smtp-user" /></Field>
              <Field label="SMTP Password / App Password"><Input type="password" value={settings.email.smtp_password} onChange={(e) => update("email", "smtp_password", e.target.value)} placeholder="••••••••" data-testid="setting-smtp-pass" /></Field>
              <Field label="Email Pengirim"><Input value={settings.email.from_email} onChange={(e) => update("email", "from_email", e.target.value)} data-testid="setting-from-email" /></Field>
              <Field label="Email Penerima Notifikasi"><Input value={settings.email.notify_email} onChange={(e) => update("email", "notify_email", e.target.value)} data-testid="setting-notify-email" /></Field>
              <div className="sm:col-span-2"><Button variant="secondary" onClick={() => testNotify("email")} disabled={!isAdmin} data-testid="btn-test-email">Kirim Email Uji</Button></div>
            </Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card className="p-6 rounded-lg shadow-soft grid gap-4">
              <Field label="Bot Token"><Input value={settings.telegram.bot_token} onChange={(e) => update("telegram", "bot_token", e.target.value)} placeholder="123456:ABC-DEF..." data-testid="setting-bot-token" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Chat ID / Group ID"><Input value={settings.telegram.chat_id} onChange={(e) => update("telegram", "chat_id", e.target.value)} placeholder="-1001234567890" data-testid="setting-chat-id" /></Field>
                <Field label="Thread ID (opsional)"><Input value={settings.telegram.thread_id} onChange={(e) => update("telegram", "thread_id", e.target.value)} placeholder="Topic thread ID" data-testid="setting-thread-id" /></Field>
              </div>
              <p className="text-xs text-muted-foreground">Telegram adalah sistem notifikasi utama. Mendukung Bot, Group, Thread ID, dan pesan Markdown.</p>
              <div><Button variant="secondary" onClick={() => testNotify("telegram")} disabled={!isAdmin} data-testid="btn-test-telegram">Kirim Telegram Uji</Button></div>
            </Card>
          </TabsContent>

          <TabsContent value="notification">
            <Card className="p-6 rounded-lg shadow-soft space-y-4">
              {[
                { key: "telegram_enabled", label: "Notifikasi Telegram", desc: "Kirim notifikasi ke bot/grup Telegram" },
                { key: "email_enabled", label: "Notifikasi Email", desc: "Kirim notifikasi via SMTP email" },
                { key: "browser_enabled", label: "Notifikasi Browser", desc: "Tampilkan notifikasi di dalam aplikasi" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div><p className="font-medium">{n.label}</p><p className="text-sm text-muted-foreground">{n.desc}</p></div>
                  <Switch checked={!!settings.notification[n.key]} onCheckedChange={(v) => update("notification", n.key, v)} disabled={!isAdmin} data-testid={`switch-${n.key}`} />
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="storage">
            <Card className="p-6 rounded-lg shadow-soft grid gap-4 sm:grid-cols-2">
              <Field label="Ukuran File Maks (MB)"><Input type="number" value={settings.storage.max_file_mb} onChange={(e) => update("storage", "max_file_mb", parseInt(e.target.value) || 50)} data-testid="setting-max-file" /></Field>
              <Field label="Tipe Diizinkan"><Input value={settings.storage.allowed_types} onChange={(e) => update("storage", "allowed_types", e.target.value)} data-testid="setting-allowed-types" /></Field>
              <p className="sm:col-span-2 text-xs text-muted-foreground">File disimpan aman di object storage. Menghapus data induk akan menghapus lampiran terkait secara otomatis.</p>
            </Card>
          </TabsContent>

          <TabsContent value="application">
            <Card className="p-6 rounded-lg shadow-soft grid gap-4 sm:grid-cols-2">
              <Field label="Warna Utama"><Input value={settings.application.primary_color} onChange={(e) => update("application", "primary_color", e.target.value)} data-testid="setting-primary-color" /></Field>
              <Field label="Format Tanggal"><Input value={settings.application.date_format} onChange={(e) => update("application", "date_format", e.target.value)} data-testid="setting-date-format" /></Field>
            </Card>
          </TabsContent>
        </fieldset>
      </Tabs>
    </div>
  );
}
