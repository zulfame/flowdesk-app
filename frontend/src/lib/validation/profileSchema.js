import { z } from "zod";

/** Profile (self-service) form schema — Indonesian validation copy. */
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi."),
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi.")
    .email("Masukkan alamat email yang valid."),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
});

/** Change-password form schema. */
export const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Kata sandi saat ini wajib diisi."),
    new_password: z.string().min(6, "Kata sandi baru minimal 6 karakter."),
    confirm: z.string().min(1, "Konfirmasi kata sandi wajib diisi."),
  })
  .refine((data) => data.new_password === data.confirm, {
    path: ["confirm"],
    message: "Konfirmasi kata sandi tidak cocok.",
  });

export const passwordDefaultValues = {
  current_password: "",
  new_password: "",
  confirm: "",
};
