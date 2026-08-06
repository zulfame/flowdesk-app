import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2, Save } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/composite/ImagePicker";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { useBranding } from "@/context/BrandingContext";
import { ACTION } from "@/constants/labels";
import { brandingSchema, identitySchema } from "@/lib/validation/adminSchema";

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"];
const LANGUAGES = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];
const DATE_FORMATS = ["DD/MM/YYYY", "YYYY-MM-DD", "DD MMM YYYY"];

const HEX_PLACEHOLDER = "#111827"; // guard-allow: default/contoh hex — warna merek = DATA pengguna (E2), bukan gaya UI

/** Configuration section whose submit action lives in the Card footer (R51/FD5). */
const FormSection = ({ title, form, onSubmit, submitting, submitTestId, testid, children }) => (
  <Card data-testid={testid}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="form-dense space-y-4">{children}</CardContent>
        <CardFooter className="justify-end gap-2">
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
 * AppSettings — application configuration (R51 + FD5):
 * stacked section cards (Identitas, Tampilan & Merek), each saving from its
 * own Card footer. Both sections persist the full `general` settings object.
 */
export default function AppSettings() {
  const { refresh } = useBranding();
  const [ready, setReady] = useState(false);

  const identityForm = useForm({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      app_name: "",
      company: "",
      timezone: "Asia/Jakarta",
      language: "id",
      date_format: "DD/MM/YYYY",
      app_url: "",
      meta_description: "",
    },
    mode: "onSubmit",
  });

  const brandingForm = useForm({
    resolver: zodResolver(brandingSchema),
    defaultValues: { primary_color: "", logo: "", favicon: "", thumbnail: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    let active = true;
    api
      .get("/settings")
      .then(({ data }) => {
        if (!active) return;
        const g = data.general || {};
        identityForm.reset({
          app_name: g.app_name || "",
          company: g.company || "",
          timezone: g.timezone || "Asia/Jakarta",
          language: g.language || "id",
          date_format: g.date_format || "DD/MM/YYYY",
          app_url: g.app_url || "",
          meta_description: g.meta_description || "",
        });
        brandingForm.reset({
          primary_color: g.primary_color || "",
          logo: g.logo || "",
          favicon: g.favicon || "",
          thumbnail: g.thumbnail || "",
        });
        setReady(true);
      })
      .catch((err) => notify.error(apiError(err)));
    return () => {
      active = false;
    };
  }, [identityForm, brandingForm]);

  const persist = useCallback(
    async (successMessage) => {
      const general = { ...identityForm.getValues(), ...brandingForm.getValues() };
      await api.put("/settings", {
        general,
        application: {
          primary_color: general.primary_color,
          date_format: general.date_format,
        },
      });
      notify.success(successMessage);
      refresh();
    },
    [identityForm, brandingForm, refresh]
  );

  const saveIdentity = async () => {
    try {
      await persist("Identitas aplikasi berhasil disimpan.");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  const saveBranding = async () => {
    try {
      await persist("Tampilan & merek berhasil disimpan.");
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  if (!ready) {
    return (
      <div className="space-y-6" data-testid="app-settings-loading">
        {Array.from({ length: 2 }).map((_, i) => (
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
    <div className="space-y-6" data-testid="app-settings-page">
      <FormSection
        title="Identitas"
        form={identityForm}
        onSubmit={saveIdentity}
        submitting={identityForm.formState.isSubmitting}
        submitTestId="btn-save-app-settings"
        testid="app-identity-card"
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={identityForm.control}
            name="app_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Aplikasi</FormLabel>
                <FormControl>
                  <Input data-testid="setting-app-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={identityForm.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Perusahaan</FormLabel>
                <FormControl>
                  <Input data-testid="setting-company" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={identityForm.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zona Waktu</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="setting-timezone">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={identityForm.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bahasa</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="setting-language">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={identityForm.control}
            name="date_format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format Tanggal</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger data-testid="setting-date-format">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DATE_FORMATS.map((fmt) => (
                      <SelectItem key={fmt} value={fmt}>
                        {fmt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={identityForm.control}
            name="app_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Aplikasi</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." data-testid="setting-app-url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={identityForm.control}
          name="meta_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta Deskripsi</FormLabel>
              <FormControl>
                <Textarea rows={2} data-testid="setting-meta-description" {...field} />
              </FormControl>
              <FormDescription>Digunakan untuk SEO / preview tautan.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection
        title="Tampilan & Merek"
        form={brandingForm}
        onSubmit={saveBranding}
        submitting={brandingForm.formState.isSubmitting}
        submitTestId="btn-save-branding"
        testid="app-branding-card"
      >
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Antarmuka aplikasi memakai palet monokrom. Warna utama disimpan sebagai identitas
            merek dan tidak mengubah warna antarmuka.
          </AlertDescription>
        </Alert>

        <FormField
          control={brandingForm.control}
          name="primary_color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warna Utama</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={field.value || HEX_PLACEHOLDER}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-[var(--ctl-h)] w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                  aria-label="Pilih warna utama"
                  data-testid="setting-primary-color"
                />
                <FormControl>
                  <Input className="w-full sm:w-[9rem]" placeholder={HEX_PLACEHOLDER} {...field} />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-2">
          <FormField
            control={brandingForm.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo</FormLabel>
                <ImagePicker value={field.value} onChange={field.onChange} testid="logo" />
                <FormDescription>Tampil di sidebar & layar masuk. Maks 600 KB.</FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={brandingForm.control}
            name="favicon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Favicon</FormLabel>
                <ImagePicker value={field.value} onChange={field.onChange} testid="favicon" />
                <FormDescription>Ikon tab browser (PNG/ICO).</FormDescription>
              </FormItem>
            )}
          />
          <FormField
            control={brandingForm.control}
            name="thumbnail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thumbnail</FormLabel>
                <ImagePicker value={field.value} onChange={field.onChange} testid="thumbnail" />
                <FormDescription>Gambar preview saat tautan dibagikan.</FormDescription>
              </FormItem>
            )}
          />
        </div>
      </FormSection>
    </div>
  );
}
