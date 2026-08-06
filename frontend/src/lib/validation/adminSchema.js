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
  favicon: z.string().optional(),
  thumbnail: z.string().optional(),
});
