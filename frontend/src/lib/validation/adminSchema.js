import { z } from "zod";

/** User create/edit form (admin) — Indonesian validation copy. */
export const userSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi."),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi.")
    .email("Masukkan alamat email yang valid."),
  password: z.string().optional(),
  role: z.string().min(1, "Peran wajib dipilih."),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

export const userDefaultValues = {
  name: "",
  email: "",
  password: "",
  role: "member",
  phone: "",
  department: "",
};

/** Role create/edit form. */
export const roleSchema = z.object({
  label: z.string().trim().min(1, "Nama peran wajib diisi."),
});

/** Application settings — identity section. */
export const identitySchema = z.object({
  app_name: z.string().trim().min(1, "Nama aplikasi wajib diisi."),
  company: z.string().trim().optional(),
  timezone: z.string().min(1, "Zona waktu wajib dipilih."),
  language: z.string().min(1, "Bahasa wajib dipilih."),
  date_format: z.string().min(1, "Format tanggal wajib dipilih."),
  app_url: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), {
      message: "URL harus dimulai dengan http:// atau https://",
    }),
  meta_description: z.string().trim().optional(),
  tagline: z.string().trim().optional(),
  brand_initials: z.string().trim().max(3, "Maksimal 3 karakter.").optional(),
});

/** Application settings — SEO & metadata section. */
export const seoSchema = z.object({
  meta_description: z.string().trim().optional(),
  meta_keywords: z.string().trim().optional(),
  canonical_url: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), {
      message: "URL harus dimulai dengan http:// atau https://",
    }),
  search_visible: z.boolean(),
});

/** Application settings — Open Graph section. */
export const ogSchema = z.object({
  og_title: z.string().trim().optional(),
  og_description: z.string().trim().optional(),
  og_image: z.string().optional(),
});

/** Application settings — contact & footer section. */
export const contactSchema = z.object({
  support_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "Format email tidak valid.",
    }),
  footer_text: z.string().trim().optional(),
});

/** Application settings — branding section. */
export const brandingSchema = z.object({
  primary_color: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v), {
      message: "Gunakan format warna heksadesimal, mis. #1F2937.",
    }),
  logo: z.string().optional(),
  logo_dark: z.string().optional(),
  favicon: z.string().optional(),
  thumbnail: z.string().optional(),
});

/** Notification channels section. */
export const channelsSchema = z.object({
  telegram_enabled: z.boolean(),
  email_enabled: z.boolean(),
  browser_enabled: z.boolean(),
});

/** Email (SMTP) section. */
export const emailSchema = z.object({
  smtp_host: z.string().trim().optional(),
  smtp_port: z.coerce
    .number({ invalid_type_error: "Port harus berupa angka." })
    .int("Port harus bilangan bulat.")
    .min(1, "Port minimal 1.")
    .max(65535, "Port maksimal 65535."),
  smtp_user: z.string().trim().optional(),
  smtp_password: z.string().optional(),
  from_name: z.string().trim().optional(),
  from_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "Masukkan alamat email yang valid.",
    }),
  notify_email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
      message: "Masukkan alamat email yang valid.",
    }),
});

/** Telegram section. */
export const telegramSchema = z.object({
  bot_token: z.string().trim().optional(),
  chat_id: z.string().trim().optional(),
  thread_id: z.string().trim().optional(),
});

/** Object storage (S3) section. */
export const storageSchema = z.object({
  endpoint: z.string().trim().optional(),
  bucket: z.string().trim().optional(),
  access_key: z.string().trim().optional(),
  secret_key: z.string().optional(),
  region: z.string().trim().optional(),
  path: z.string().trim().optional(),
  max_file_mb: z.coerce
    .number({ invalid_type_error: "Ukuran harus berupa angka." })
    .min(1, "Minimal 1 MB.")
    .max(1024, "Maksimal 1024 MB."),
  allowed_types: z.string().trim().optional(),
});

/** Automatic backup schedule. */
export const autoBackupSchema = z.object({
  auto_enabled: z.boolean(),
  frequency: z.string().min(1, "Frekuensi wajib dipilih."),
  time: z.string().min(1, "Jam wajib diisi."),
  weekday: z.coerce.number().min(1).max(7),
  destination: z.string().min(1, "Tujuan wajib dipilih."),
});
