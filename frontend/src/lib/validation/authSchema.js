import { z } from "zod";

/** Login form schema (R15) — Indonesian validation copy. */
export const loginSchema = z.object({
  email: z.string().min(1, "Kredensial wajib diisi."),
  password: z.string().min(1, "Kata sandi wajib diisi."),
  remember: z.boolean().optional(),
});

export const loginDefaultValues = {
  email: "",
  password: "",
  remember: false,
};
