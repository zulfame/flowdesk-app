import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellRing, Loader2, Mail, MonitorSmartphone, Save, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/composite/PasswordInput";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";
import {
  channelsSchema,
  emailSchema,
  telegramSchema,
} from "@/lib/validation/adminSchema";
import { pushSupported, isPushEnabled, enablePush, disablePush } from "@/lib/push";

const CHANNELS = [
  {
    key: "telegram_enabled",
    label: "Notifikasi Telegram",
    desc: "Kirim notifikasi ke bot atau grup Telegram.",
  },
  {
    key: "email_enabled",
    label: "Notifikasi Email",
    desc: "Kirim notifikasi melalui SMTP email.",
  },
  {
    key: "browser_enabled",
    label: "Notifikasi Browser",
    desc: "Tampilkan notifikasi di dalam aplikasi.",
  },
];

/** Configuration section with its actions in the Card footer (R51/FD5). */
const FormSection = ({ title, form, onSubmit, submitting, submitTestId, testid, extraAction, children }) => (
  <Card data-testid={testid}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="form-dense space-y-4">{children}</CardContent>
        <CardFooter className="justify-end gap-2">
          {extraAction}
          <Button type="submit" size="sm" disabled={submitting} data-testid={submitTestId}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {submitting ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </form>
    </Form>
  </Card>
);

/**
 * NotificationSettings — channels + delivery credentials (R51 + FD5):
 * stacked section cards, each saving from its own Card footer.
 */
export default function NotificationSettings() {
  const [ready, setReady] = useState(false);
  const [testing, setTesting] = useState("");
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const channelsForm = useForm({
    resolver: zodResolver(channelsSchema),
    defaultValues: { telegram_enabled: false, email_enabled: false, browser_enabled: false },
  });
  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      smtp_host: "",
      smtp_port: 587,
      smtp_user: "",
      smtp_password: "",
      from_name: "",
      from_email: "",
      notify_email: "",
    },
    mode: "onSubmit",
  });
  const telegramForm = useForm({
    resolver: zodResolver(telegramSchema),
    defaultValues: { bot_token: "", chat_id: "", thread_id: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    isPushEnabled().then(setPushOn);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/settings")
      .then(({ data }) => {
        if (!active) return;
        const n = data.notification || {};
        const e = data.email || {};
        const t = data.telegram || {};
        channelsForm.reset({
          telegram_enabled: Boolean(n.telegram_enabled),
          email_enabled: Boolean(n.email_enabled),
          browser_enabled: Boolean(n.browser_enabled),
        });
        emailForm.reset({
          smtp_host: e.smtp_host || "",
          smtp_port: e.smtp_port || 587,
          smtp_user: e.smtp_user || "",
          smtp_password: e.smtp_password || "",
          from_name: e.from_name || "",
          from_email: e.from_email || "",
          notify_email: e.notify_email || "",
        });
        telegramForm.reset({
          bot_token: t.bot_token || "",
          chat_id: t.chat_id || "",
          thread_id: t.thread_id || "",
        });
        setReady(true);
      })
      .catch((err) => notify.error(apiError(err)));
    return () => {
      active = false;
    };
  }, [channelsForm, emailForm, telegramForm]);

  const persist = useCallback(
    async (message) => {
      await api.put("/settings", {
        notification: channelsForm.getValues(),
        email: emailForm.getValues(),
        telegram: telegramForm.getValues(),
      });
      notify.success(message);
    },
    [channelsForm, emailForm, telegramForm]
  );

  const save = (message) => async () => {
    try {
      await persist(message);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const sendTest = async (channel) => {
    setTesting(channel);
    try {
      await api.post("/settings/test-notification", { channel });
      notify.success(`Notifikasi uji ${channel} berhasil dikirim.`);
    } catch (err) {
      notify.error(apiError(err));
    } finally {
      setTesting("");
    }
  };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        notify.success("Notifikasi browser dinonaktifkan di perangkat ini.");
      } else {
        await enablePush();
        setPushOn(true);
        notify.success("Notifikasi browser aktif di perangkat ini.");
      }
    } catch (err) {
      notify.error(err.message || "Gagal mengaktifkan notifikasi browser.");
    } finally {
      setPushBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="space-y-6" data-testid="notif-settings-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notif-settings-page">
      <FormSection
        title="Status Kanal"
        form={channelsForm}
        onSubmit={save("Status kanal notifikasi berhasil disimpan.")}
        submitting={channelsForm.formState.isSubmitting}
        submitTestId="btn-save-notif-settings"
        testid="notif-channels-card"
      >
        <div className="divide-y rounded-md border">
          {CHANNELS.map((channel) => (
            <FormField
              key={channel.key}
              control={channelsForm.control}
              name={channel.key}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 px-3 py-2">
                  <div className="min-w-0">
                    <FormLabel>{channel.label}</FormLabel>
                    <p className="text-xs text-muted-foreground">{channel.desc}</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid={`switch-${channel.key}`}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MonitorSmartphone
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">Push Browser di Perangkat Ini</p>
              <p className="text-xs text-muted-foreground">
                Terima notifikasi walau tab tidak dibuka.
                {pushSupported() ? "" : " Browser ini tidak mendukungnya."}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={pushOn ? "outline" : "default"}
            size="sm"
            onClick={togglePush}
            disabled={pushBusy || !pushSupported()}
            data-testid="btn-toggle-push"
          >
            {pushBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <BellRing className="size-4" aria-hidden="true" />
            )}
            {pushOn ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </FormSection>

      <FormSection
        title="Email (SMTP)"
        form={emailForm}
        onSubmit={save("Konfigurasi email berhasil disimpan.")}
        submitting={emailForm.formState.isSubmitting}
        submitTestId="btn-save-email-settings"
        testid="notif-email-card"
        extraAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sendTest("email")}
            disabled={testing === "email"}
            data-testid="btn-test-email"
          >
            {testing === "email" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="size-4" aria-hidden="true" />
            )}
            Kirim Uji
          </Button>
        }
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={emailForm.control}
            name="smtp_host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Host</FormLabel>
                <FormControl>
                  <Input placeholder="smtp.gmail.com" data-testid="setting-smtp-host" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="smtp_port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Port</FormLabel>
                <FormControl>
                  <Input type="number" data-testid="setting-smtp-port" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="smtp_user"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP User</FormLabel>
                <FormControl>
                  <Input placeholder="anda@gmail.com" data-testid="setting-smtp-user" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="smtp_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SMTP Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="off"
                    data-testid="setting-smtp-pass"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="from_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Pengirim</FormLabel>
                <FormControl>
                  <Input placeholder="Tim FlowDesk" data-testid="setting-from-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="from_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Pengirim</FormLabel>
                <FormControl>
                  <Input data-testid="setting-from-email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="notify_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Penerima Uji / Sistem</FormLabel>
                <FormControl>
                  <Input data-testid="setting-notify-email" {...field} />
                </FormControl>
                <FormDescription>
                  Hanya dipakai untuk tombol Kirim Uji &amp; pemberitahuan sistem. Notifikasi
                  pengguna (tugas, pengingat) selalu dikirim ke email pengguna terkait.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <FormSection
        title="Telegram"
        form={telegramForm}
        onSubmit={save("Konfigurasi Telegram berhasil disimpan.")}
        submitting={telegramForm.formState.isSubmitting}
        submitTestId="btn-save-telegram-settings"
        testid="notif-telegram-card"
        extraAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => sendTest("telegram")}
            disabled={testing === "telegram"}
            data-testid="btn-test-telegram"
          >
            {testing === "telegram" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Kirim Uji
          </Button>
        }
      >
        <Alert>
          <Send className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Buat bot melalui @BotFather, lalu tambahkan bot ke grup dan isi Chat ID grup tersebut.
          </AlertDescription>
        </Alert>
        <FormField
          control={telegramForm.control}
          name="bot_token"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bot Token</FormLabel>
              <FormControl>
                <Input placeholder="123456:ABC-DEF..." data-testid="setting-bot-token" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={telegramForm.control}
            name="chat_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chat ID / Group ID</FormLabel>
                <FormControl>
                  <Input placeholder="-1001234567890" data-testid="setting-chat-id" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={telegramForm.control}
            name="thread_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thread ID</FormLabel>
                <FormControl>
                  <Input placeholder="Opsional" data-testid="setting-thread-id" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>
    </div>
  );
}
