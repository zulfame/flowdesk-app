import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, Save, Zap } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ACTION } from "@/constants/labels";
import { authtySchema, sessionSchema } from "@/lib/validation/adminSchema";

/** SecuritySettings — autentikasi terpusat (Authty) & masa aktif sesi login. */
export default function SecuritySettings() {
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showTestPass, setShowTestPass] = useState(false);
  const [test, setTest] = useState({ identity: "", password: "" });

  const authtyForm = useForm({
    resolver: zodResolver(authtySchema),
    defaultValues: {
      authty_enabled: false,
      authty_allow_local_superadmin: true,
      authty_base_url: "",
      authty_timeout: 10,
      authty_api_key: "",
    },
    mode: "onSubmit",
  });

  const sessionForm = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: { session_hours: 12 },
    mode: "onSubmit",
  });

  useEffect(() => {
    let active = true;
    api
      .get("/settings")
      .then(({ data }) => {
        if (!active) return;
        const sec = data.security || {};
        authtyForm.reset({
          authty_enabled: Boolean(sec.authty_enabled),
          authty_allow_local_superadmin: sec.authty_allow_local_superadmin !== false,
          authty_base_url: sec.authty_base_url || "",
          authty_timeout: sec.authty_timeout ?? 10,
          authty_api_key: "",
        });
        sessionForm.reset({ session_hours: sec.session_hours ?? 12 });
        setHint(sec.authty_api_key_hint || "");
        setReady(true);
      })
      .catch((err) => notify.error(apiError(err)));
    return () => {
      active = false;
    };
  }, [authtyForm, sessionForm]);

  const persist = useCallback(async (values, message) => {
    try {
      await api.put("/settings", { security: values });
      notify.success(message);
    } catch (err) {
      notify.error(apiError(err));
    }
  }, []);

  if (!ready) {
    return (
      <div className="space-y-6" data-testid="security-settings-loading">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-48" />
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

  const enabled = authtyForm.watch("authty_enabled");

  return (
    <div className="space-y-6" data-testid="security-settings-page">
      <Card data-testid="authty-card">
        <Form {...authtyForm}>
          <form
            onSubmit={authtyForm.handleSubmit((v) =>
              persist(v, "Pengaturan autentikasi terpusat berhasil disimpan.")
            )}
            noValidate
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Autentikasi Terpusat (Authty)
                <Badge variant={enabled ? "default" : "secondary"} className="font-normal">
                  {enabled ? "Aktif" : "Nonaktif"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Bila aktif, password TIDAK diverifikasi lokal: login mengirim identitas (email,
                username, atau no. HP) ke Authty. Data pengguna &amp; jabatannya otomatis
                disinkronkan ke FlowDesk setiap login — izin menu tetap diatur di Kelola Peranan.
                Akun nonaktif di Authty tidak bisa masuk.
              </CardDescription>
            </CardHeader>
            <CardContent className="form-dense space-y-4">
              <Alert>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  Integrasi Authty <strong>belum tersambung</strong> — kontrak API dan API Key belum
                  tersedia, sehingga tombol Uji dan login terpusat masih nonaktif. Setelan di bawah
                  sudah tersimpan dan akan langsung dipakai begitu integrasinya disambungkan.
                </AlertDescription>
              </Alert>

              <FormField
                control={authtyForm.control}
                name="authty_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <FormLabel>Aktifkan autentikasi terpusat</FormLabel>
                      <FormDescription>
                        Matikan untuk kembali memakai password lokal FlowDesk sepenuhnya.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="setting-authty-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={authtyForm.control}
                name="authty_allow_local_superadmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <FormLabel>Izinkan Super Admin lokal sebagai jalur darurat</FormLabel>
                      <FormDescription>
                        Bila Authty tidak dapat dihubungi, hanya akun Super Admin lokal yang boleh
                        masuk dengan password lokal.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="setting-authty-fallback"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 sm:grid-cols-2">
                <FormField
                  control={authtyForm.control}
                  name="authty_base_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://auth.contoh.co.id"
                          data-testid="setting-authty-base-url"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={authtyForm.control}
                  name="authty_timeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeout (detik)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={120}
                          data-testid="setting-authty-timeout"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={authtyForm.control}
                name="authty_api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key (X-API-Key)</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          type={showKey ? "text" : "password"}
                          placeholder={hint ? `Tersimpan: ${hint}` : "Belum diisi"}
                          data-testid="setting-authty-api-key"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setShowKey((v) => !v)}
                        aria-label={showKey ? "Sembunyikan API Key" : "Tampilkan API Key"}
                        data-testid="btn-toggle-api-key"
                      >
                        {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    <FormDescription>
                      Disimpan terenkripsi di server dan tidak pernah dikirim balik ke browser.
                      Biarkan kosong bila tidak ingin mengubah.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-md border px-3 py-3">
                <p className="flex items-center gap-2 font-medium">
                  <Zap className="size-4 text-muted-foreground" aria-hidden="true" />
                  Uji kredensial (tanpa membuat sesi)
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Email / username / Nomor HP"
                    value={test.identity}
                    onChange={(e) => setTest((t) => ({ ...t, identity: e.target.value }))}
                    data-testid="authty-test-identity"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type={showTestPass ? "text" : "password"}
                      placeholder="Password"
                      value={test.password}
                      onChange={(e) => setTest((t) => ({ ...t, password: e.target.value }))}
                      data-testid="authty-test-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => setShowTestPass((v) => !v)}
                      aria-label={showTestPass ? "Sembunyikan password" : "Tampilkan password"}
                      data-testid="btn-toggle-test-password"
                    >
                      {showTestPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="Menunggu kontrak API Authty"
                  data-testid="btn-authty-test"
                >
                  <KeyRound className="size-4" /> Uji
                </Button>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={authtyForm.formState.isSubmitting}
                data-testid="btn-save-authty"
              >
                {authtyForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                {authtyForm.formState.isSubmitting ? ACTION.saving : ACTION.save}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card data-testid="session-card">
        <Form {...sessionForm}>
          <form
            onSubmit={sessionForm.handleSubmit((v) =>
              persist(v, "Masa aktif sesi login berhasil disimpan.")
            )}
            noValidate
          >
            <CardHeader>
              <CardTitle className="text-base">Sesi Login</CardTitle>
              <CardDescription>
                Berapa lama pengguna tetap masuk sebelum diminta login ulang.
              </CardDescription>
            </CardHeader>
            <CardContent className="form-dense">
              <FormField
                control={sessionForm.control}
                name="session_hours"
                render={({ field }) => (
                  <FormItem className="max-w-[14rem]">
                    <FormLabel>Masa aktif sesi login (jam)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={720}
                        data-testid="setting-session-hours"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      1–720 jam. Berlaku untuk sesi yang dibuat setelah disimpan — tanpa restart
                      server.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={sessionForm.formState.isSubmitting}
                data-testid="btn-save-session"
              >
                {sessionForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="size-4" aria-hidden="true" />
                )}
                {sessionForm.formState.isSubmitting ? ACTION.saving : ACTION.save}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
