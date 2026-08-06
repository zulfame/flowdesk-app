import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Info, Loader2, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImagePicker } from "@/components/composite/ImagePicker";
import { api, apiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { useBranding } from "@/context/BrandingContext";
import { ACTION } from "@/constants/labels";
import {
  brandingSchema,
  contactSchema,
  identitySchema,
  ogSchema,
  seoSchema,
} from "@/lib/validation/adminSchema";

const TIMEZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"];
const LANGUAGES = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
];
const DATE_FORMATS = ["DD/MM/YYYY", "YYYY-MM-DD", "DD MMM YYYY"];

const HEX_PLACEHOLDER = "#111827"; // guard-allow: contoh hex — warna merek = DATA pengguna (E2)

const domainOf = (url) => {
  try {
    return new URL(url).hostname.toUpperCase();
  } catch {
    return "";
  }
};

/** Configuration section whose submit action lives in the Card footer (R51/FD5). */
const FormSection = ({ title, form, onSubmit, submitTestId, testid, extraAction, children }) => (
  <Card data-testid={testid}>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="form-dense space-y-4">{children}</CardContent>
        <CardFooter className={extraAction ? "justify-between gap-2" : "justify-end gap-2"}>
          {extraAction}
          <Button
            type="submit"
            size="sm"
            disabled={form.formState.isSubmitting}
            data-testid={submitTestId}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {form.formState.isSubmitting ? ACTION.saving : ACTION.save}
          </Button>
        </CardFooter>
      </form>
    </Form>
  </Card>
);

/** AppSettings — konfigurasi aplikasi: 6 section card, simpan per section (R51/FD5). */
export default function AppSettings() {
  const { refresh } = useBranding();
  const [ready, setReady] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const [raw, setRaw] = useState("");

  const identityForm = useForm({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      app_name: "",
      tagline: "",
      brand_initials: "",
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
    defaultValues: { primary_color: "", logo: "", logo_dark: "", favicon: "", thumbnail: "" },
    mode: "onSubmit",
  });

  const seoForm = useForm({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      meta_description: "",
      meta_keywords: "",
      canonical_url: "",
      search_visible: false,
    },
    mode: "onSubmit",
  });

  const ogForm = useForm({
    resolver: zodResolver(ogSchema),
    defaultValues: { og_title: "", og_description: "", og_image: "" },
    mode: "onSubmit",
  });

  const contactForm = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { support_email: "", footer_text: "" },
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
          tagline: g.tagline || "",
          brand_initials: g.brand_initials || "",
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
          logo_dark: g.logo_dark || "",
          favicon: g.favicon || "",
          thumbnail: g.thumbnail || "",
        });
        seoForm.reset({
          meta_description: g.meta_description || "",
          meta_keywords: g.meta_keywords || "",
          canonical_url: g.canonical_url || "",
          search_visible: Boolean(g.search_visible),
        });
        ogForm.reset({
          og_title: g.og_title || "",
          og_description: g.og_description || "",
          og_image: g.og_image || "",
        });
        contactForm.reset({
          support_email: g.support_email || "",
          footer_text: g.footer_text || "",
        });
        setReady(true);
      })
      .catch((err) => notify.error(apiError(err)));
    return () => {
      active = false;
    };
  }, [identityForm, brandingForm, seoForm, ogForm, contactForm]);

  const persist = useCallback(
    async (values, successMessage) => {
      try {
        await api.put("/settings", { general: values });
        notify.success(successMessage);
        refresh();
      } catch (err) {
        notify.error(apiError(err));
      }
    },
    [refresh]
  );

  const openRaw = async () => {
    try {
      const { data } = await api.get("/og/preview");
      setRaw(data.html || "");
      setRawOpen(true);
    } catch (err) {
      notify.error(apiError(err));
    }
  };

  if (!ready) {
    return (
      <div className="space-y-6" data-testid="app-settings-loading">
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

  const ident = identityForm.watch();
  const og = ogForm.watch();
  const seo = seoForm.watch();
  const ogTitle = og.og_title || ident.app_name || "FlowDesk";
  const ogDesc = og.og_description || seo.meta_description || "";
  const ogUrl = seo.canonical_url || ident.app_url || "";

  return (
    <div className="space-y-6" data-testid="app-settings-page">
      <FormSection
        title="Identitas Aplikasi"
        form={identityForm}
        onSubmit={(v) => persist(v, "Identitas aplikasi berhasil disimpan.")}
        submitTestId="btn-save-app-settings"
        testid="app-identity-card"
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
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
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tagline / Sub Judul</FormLabel>
                <FormControl>
                  <Input data-testid="setting-tagline" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={identityForm.control}
            name="brand_initials"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inisial Brand</FormLabel>
                <FormControl>
                  <Input maxLength={3} data-testid="setting-brand-initials" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-foreground text-xs font-semibold text-background">
              {(ident.brand_initials || ident.app_name || "FD").slice(0, 3).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{ident.app_name || "FlowDesk"}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {ident.tagline || "Tanpa tagline"}
              </span>
            </span>
          </div>
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
      </FormSection>

      <FormSection
        title="Aset Merek"
        form={brandingForm}
        onSubmit={(v) => persist(v, "Aset merek berhasil disimpan.")}
        submitTestId="btn-save-branding"
        testid="app-branding-card"
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={brandingForm.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo (latar terang)</FormLabel>
                <FormDescription>Logo gelap untuk latar terang. Maks 600 KB.</FormDescription>
                <ImagePicker value={field.value} onChange={field.onChange} testid="logo" />
              </FormItem>
            )}
          />
          <FormField
            control={brandingForm.control}
            name="logo_dark"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo (latar gelap)</FormLabel>
                <FormDescription>Logo terang untuk latar gelap, mis. panel masuk.</FormDescription>
                <ImagePicker value={field.value} onChange={field.onChange} testid="logo-dark" />
              </FormItem>
            )}
          />
          <FormField
            control={brandingForm.control}
            name="favicon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Favicon</FormLabel>
                <FormDescription>Ikon persegi (PNG/ICO), 32–512 px.</FormDescription>
                <ImagePicker value={field.value} onChange={field.onChange} testid="favicon" />
              </FormItem>
            )}
          />
          <FormField
            control={brandingForm.control}
            name="thumbnail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thumbnail</FormLabel>
                <FormDescription>Cadangan gambar pratinjau bila OG Image kosong.</FormDescription>
                <ImagePicker value={field.value} onChange={field.onChange} testid="thumbnail" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={brandingForm.control}
          name="primary_color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warna Merek</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={field.value || HEX_PLACEHOLDER}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-[var(--ctl-h)] w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                  aria-label="Pilih warna merek"
                  data-testid="setting-primary-color"
                />
                <FormControl>
                  <Input className="w-full sm:w-[9rem]" placeholder={HEX_PLACEHOLDER} {...field} />
                </FormControl>
              </div>
              <FormDescription>
                Antarmuka tetap monokrom; warna ini hanya disimpan sebagai identitas merek.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Semua aset disimpan langsung di database (bukan penyimpanan berkas), sehingga otomatis
            ikut terbawa saat Backup &amp; Restore.
          </AlertDescription>
        </Alert>
      </FormSection>

      <FormSection
        title="SEO & Metadata"
        form={seoForm}
        onSubmit={(v) => persist(v, "Pengaturan SEO berhasil disimpan.")}
        submitTestId="btn-save-seo"
        testid="app-seo-card"
      >
        <FormField
          control={seoForm.control}
          name="meta_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meta Description</FormLabel>
              <FormControl>
                <Textarea rows={2} data-testid="setting-meta-description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={seoForm.control}
            name="meta_keywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Keywords</FormLabel>
                <FormControl>
                  <Input placeholder="pisahkan dengan koma" data-testid="setting-meta-keywords" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={seoForm.control}
            name="canonical_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Canonical URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." data-testid="setting-canonical-url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={seoForm.control}
          name="search_visible"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-3 space-y-0 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <FormLabel>Terlihat di mesin pencari</FormLabel>
                <FormDescription>
                  Bila nonaktif, halaman meminta mesin pencari untuk tidak mengindeks (noindex,
                  nofollow). Disarankan tetap nonaktif untuk konsol internal.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="setting-search-visible"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection
        title="Pratinjau Tautan (Open Graph)"
        form={ogForm}
        onSubmit={(v) => persist(v, "Pratinjau tautan berhasil disimpan.")}
        submitTestId="btn-save-og"
        testid="app-og-card"
        extraAction={
          <Button type="button" variant="outline" size="sm" onClick={openRaw} data-testid="btn-og-raw">
            <Eye className="size-4" /> Lihat HTML mentah
          </Button>
        }
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={ogForm.control}
            name="og_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OG Title</FormLabel>
                <FormControl>
                  <Input data-testid="setting-og-title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={ogForm.control}
            name="og_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OG Description</FormLabel>
                <FormControl>
                  <Input data-testid="setting-og-description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={ogForm.control}
          name="og_image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>OG Image</FormLabel>
              <FormDescription>Gambar pratinjau tautan (disarankan 1200×630).</FormDescription>
              <ImagePicker value={field.value} onChange={field.onChange} testid="og-image" />
            </FormItem>
          )}
        />

        <p className="text-xs text-muted-foreground">
          Pratinjau disajikan dari server <code>/api/og/render</code> untuk crawler WhatsApp,
          Facebook, Telegram, dan X. Perubahan di sini langsung dipakai tanpa build ulang. Setelah
          mengubah, minta ulang pratinjau di aplikasi chat (cache crawler bisa bertahan beberapa
          jam).
        </p>

        <div className="max-w-md overflow-hidden rounded-md border" data-testid="og-preview">
          <div className="flex aspect-[1200/630] items-center justify-center bg-muted/40">
            {og.og_image ? (
              <img src={og.og_image} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">Belum ada gambar pratinjau</span>
            )}
          </div>
          <div className="space-y-1 px-3 py-2">
            {ogUrl ? (
              <p className="text-xs text-muted-foreground">{domainOf(ogUrl)}</p>
            ) : null}
            <p className="font-medium">{ogTitle}</p>
            <p className="text-xs text-muted-foreground">{ogDesc || "Tanpa deskripsi."}</p>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Kontak & Footer"
        form={contactForm}
        onSubmit={(v) => persist(v, "Kontak & footer berhasil disimpan.")}
        submitTestId="btn-save-contact"
        testid="app-contact-card"
      >
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2">
          <FormField
            control={contactForm.control}
            name="support_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Dukungan</FormLabel>
                <FormControl>
                  <Input data-testid="setting-support-email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={contactForm.control}
            name="footer_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teks Hak Cipta / Footer</FormLabel>
                <FormControl>
                  <Input data-testid="setting-footer-text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </FormSection>

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="sm:max-w-2xl" data-testid="og-raw-dialog">
          <DialogHeader>
            <DialogTitle>HTML Pratinjau Tautan</DialogTitle>
            <DialogDescription>
              Keluaran <code>/api/og/render</code> yang dibaca crawler.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <pre className="thin-scroll max-h-[24rem] overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
              {raw}
            </pre>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
