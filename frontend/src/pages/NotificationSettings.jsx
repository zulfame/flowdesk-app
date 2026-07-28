import React, { useEffect, useState } from "react";
import { api, apiError } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BellRing, Mail, Send, Save, Loader2, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { pushSupported, isPushEnabled, enablePush, disablePush } from "@/lib/push";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

const CHANNELS = [
  { key: "telegram_enabled", label: "Notifikasi Telegram", desc: "Kirim notifikasi ke bot / grup Telegram" },
  { key: "email_enabled", label: "Notifikasi Email", desc: "Kirim notifikasi melalui SMTP email" },
  { key: "browser_enabled", label: "Notifikasi Browser", desc: "Tampilkan notifikasi di dalam aplikasi" },
];

export default function NotificationSettings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => { api.get("/settings").then(({ data }) => setS(data)).catch((e) => toast.error(apiError(e))); }, []);
  useEffect(() => { isPushEnabled().then(setPushOn); }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); toast.success("Notifikasi browser dinonaktifkan di perangkat ini"); }
      else { await enablePush(); setPushOn(true); toast.success("Notifikasi browser aktif di perangkat ini"); }
    } catch (e) { toast.error(e.message || "Gagal mengaktifkan notifikasi"); }
    finally { setPushBusy(false); }
  };
  const up = (section, key, value) => setS((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { email: s.email, telegram: s.telegram, notification: s.notification });
      toast.success("Konfigurasi notifikasi disimpan");
    } catch (e) { toast.error(apiError(e)); }
    finally { setSaving(false); }
  };

  const test = async (channel) => {
    setTesting(channel);
    try { await api.post("/settings/test-notification", { channel }); toast.success(`Notifikasi uji ${channel} dikirim`); }
    catch (e) { toast.error(apiError(e)); }
    finally { setTesting(""); }
  };

  if (!s) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div>
      <PageHeader title="Kelola Notifikasi" subtitle="Atur kanal dan kredensial pengiriman notifikasi.">
        <Button onClick={save} disabled={saving} className="rounded-xl" data-testid="btn-save-notif-settings">{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Simpan</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 rounded-lg shadow-soft lg:col-span-2" data-testid="notif-channels-card">
          <div className="flex items-center gap-2 mb-5"><BellRing className="h-5 w-5 text-primary" /><h2 className="font-semibold">Status Kanal</h2></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {CHANNELS.map((n) => (
              <div key={n.key} className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div className="min-w-0"><p className="font-medium text-sm">{n.label}</p><p className="text-xs text-muted-foreground">{n.desc}</p></div>
                <Switch checked={!!s.notification[n.key]} onCheckedChange={(v) => up("notification", n.key, v)} data-testid={`switch-${n.key}`} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-secondary/60">
            <div className="flex items-center gap-3">
              <MonitorSmartphone className="h-5 w-5 text-primary shrink-0" />
              <div><p className="font-medium text-sm">Push Browser di Perangkat Ini</p><p className="text-xs text-muted-foreground">Terima notifikasi asli walau tab tidak dibuka. {!pushSupported() && "(Tidak didukung browser ini)"}</p></div>
            </div>
            <Button variant={pushOn ? "outline" : "default"} className="rounded-xl" onClick={togglePush} disabled={pushBusy || !pushSupported()} data-testid="btn-toggle-push">
              {pushBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <BellRing className="h-4 w-4 mr-1.5" />} {pushOn ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        </Card>

        <Card className="p-6 rounded-lg shadow-soft" data-testid="notif-email-card">
          <div className="flex items-center gap-2 mb-5"><Mail className="h-5 w-5 text-primary" /><h2 className="font-semibold">Email (SMTP)</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SMTP Host"><Input value={s.email.smtp_host} onChange={(e) => up("email", "smtp_host", e.target.value)} placeholder="smtp.gmail.com" data-testid="setting-smtp-host" /></Field>
            <Field label="SMTP Port"><Input type="number" value={s.email.smtp_port} onChange={(e) => up("email", "smtp_port", parseInt(e.target.value) || 587)} data-testid="setting-smtp-port" /></Field>
            <Field label="SMTP User"><Input value={s.email.smtp_user} onChange={(e) => up("email", "smtp_user", e.target.value)} placeholder="you@gmail.com" data-testid="setting-smtp-user" /></Field>
            <Field label="SMTP Password"><Input type="password" value={s.email.smtp_password} onChange={(e) => up("email", "smtp_password", e.target.value)} placeholder="••••••••" data-testid="setting-smtp-pass" /></Field>
            <Field label="Nama Pengirim"><Input value={s.email.from_name || ""} onChange={(e) => up("email", "from_name", e.target.value)} placeholder="Tim FlowDesk" data-testid="setting-from-name" /></Field>
            <Field label="Email Pengirim"><Input value={s.email.from_email} onChange={(e) => up("email", "from_email", e.target.value)} data-testid="setting-from-email" /></Field>
            <Field label="Email Penerima"><Input value={s.email.notify_email} onChange={(e) => up("email", "notify_email", e.target.value)} data-testid="setting-notify-email" /></Field>
          </div>
          <div className="mt-4"><Button variant="secondary" className="rounded-xl" onClick={() => test("email")} disabled={testing === "email"} data-testid="btn-test-email">{testing === "email" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Mail className="h-4 w-4 mr-1.5" />} Kirim Email Uji</Button></div>
        </Card>

        <Card className="p-6 rounded-lg shadow-soft" data-testid="notif-telegram-card">
          <div className="flex items-center gap-2 mb-5"><Send className="h-5 w-5 text-primary" /><h2 className="font-semibold">Telegram</h2></div>
          <div className="space-y-4">
            <Field label="Bot Token"><Input value={s.telegram.bot_token} onChange={(e) => up("telegram", "bot_token", e.target.value)} placeholder="123456:ABC-DEF..." data-testid="setting-bot-token" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Chat ID / Group ID"><Input value={s.telegram.chat_id} onChange={(e) => up("telegram", "chat_id", e.target.value)} placeholder="-1001234567890" data-testid="setting-chat-id" /></Field>
              <Field label="Thread ID (opsional)"><Input value={s.telegram.thread_id} onChange={(e) => up("telegram", "thread_id", e.target.value)} placeholder="Topic thread ID" data-testid="setting-thread-id" /></Field>
            </div>
            <div><Button variant="secondary" className="rounded-xl" onClick={() => test("telegram")} disabled={testing === "telegram"} data-testid="btn-test-telegram">{testing === "telegram" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />} Kirim Telegram Uji</Button></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
