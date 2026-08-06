# Login Page — Design System Spec (Extracted)

> Inventaris komponen & aturan yang **sudah diterapkan** pada halaman Login,
> dipetakan ke implementasi nyata (komponen shadcn/ui, design token, lokasi file).
> Dokumen ini menjadi acuan reusable untuk halaman berikutnya.
>
> File terkait:
> - `src/pages/LoginPage.jsx`
> - `src/components/layout/AuthLayout.jsx`
> - `src/components/auth/LoginForm.jsx`
> - `src/lib/validation/authSchema.js`
> - Token: `src/index.css` · `tailwind.config.js`

---

## A. Inventaris Komponen

Legenda status: ✅ dipakai · ⚪ tersedia namun belum dipakai (menunggu kebutuhan)

| # | Item | Status | Implementasi (komponen / elemen) | Lokasi |
|---|------|--------|----------------------------------|--------|
| 1 | Layout | ✅ | Split-screen `div.grid.lg:grid-cols-2` + `<aside>` / `<main>` semantik | `AuthLayout` |
| 2 | Logo | ✅ | Ikon `lucide-react` `GalleryVerticalEnd` dalam kotak `rounded-md` (placeholder) | `AuthLayout` |
| 3 | Nama Aplikasi | ✅ | `<span>` teks `UI Guidelines` (desktop + mobile) | `AuthLayout` |
| 4 | Judul | ✅ | `CardTitle` = "Sign in" · `<h1>` panel = "Welcome back" | `LoginPage`, `AuthLayout` |
| 5 | Deskripsi | ✅ | `CardDescription` (`text-muted-foreground`) | `LoginPage` |
| 6 | Card | ✅ | `Card` + `CardHeader` + `CardContent` | `LoginPage` |
| 7 | Label | ✅ | `FormLabel` (dibangun di atas `Label`) | `LoginForm` |
| 8 | Input Email | ✅ | `Input` `type="email"` + `autoComplete="email"` | `LoginForm` |
| 9 | Input Password | ✅ | `Input` `type=password/text` + tombol toggle (`Button` ghost + `Eye/EyeOff`) | `LoginForm` |
| 10 | Checkbox (Remember Me) | ✅ | `Checkbox` + `FormLabel` inline | `LoginForm` |
| 11 | Link (Forgot Password) | ✅ | `Button` `variant="link"` (bukan `<a>` mentah) | `LoginForm` |
| 12 | Button (Login) | ✅ | `Button` `variant="default"` `w-full` = "Sign In" | `LoginForm` |
| 13 | Divider | ✅ | `Separator` (di panel kiri, antara deskripsi & fitur) | `AuthLayout` |
| 14 | Alert / Error Message | ✅ (inline) | `FormMessage` (`text-destructive`, `aria-invalid`) per-field | `LoginForm` |
| 14b| Alert (form-level) | ⚪ | Komponen `Alert` tersedia, **belum dipakai** (mis. untuk error auth global) | `ui/alert` |
| 15 | Footer | ✅ | `<p>` copyright panel + `<p>` catatan placeholder | `AuthLayout`, `LoginPage` |
| 16 | Background Decoration | ✅ | Grid overlay monokrom (`aria-hidden`, `pointer-events-none`, radial mask) | `AuthLayout` |
| 17 | Loading indicator | ✅ | `Loader2` (`animate-spin`) di tombol saat submit | `LoginForm` |

---

## B. Inventaris Aturan (mapping ke implementasi)

| # | Aturan | Bagaimana diterapkan (nilai/token/utility nyata) |
|---|--------|---------------------------------------------------|
| 1 | **Layout** | `min-h-screen w-full grid lg:grid-cols-2`; kiri branding, kanan konten; elemen semantik `aside/main`. |
| 2 | **Grid** | Kolom via `lg:grid-cols-2`; grid dekoratif `bg-[size:44px_44px]` berbasis token `--primary-foreground/0.06`. |
| 3 | **Spacing** | Skala 4px shadcn: form `space-y-5`, header `space-y-1.5`, panel `p-10 xl:p-14`, konten `px-4 py-10 sm:px-6`. |
| 4 | **Typography** | Font **Inter**; `CardTitle` `text-2xl`; body `text-sm`; label `text-sm font-medium`; weight 400/500/600; `leading-tight/relaxed`. |
| 5 | **Color** | 100% token: `bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, `text-destructive`. Tanpa warna hardcode. |
| 6 | **Border** | `border-input` (field), `border-border/60` (card), `border-border` global; garis via token. |
| 7 | **Radius** | `--radius: 0.5rem` → `rounded-md` (input/button/logo), `rounded-xl` (card). |
| 8 | **Shadow** | Shadow default shadcn: `shadow` (card), `shadow`/`shadow-sm` (button). Tanpa shadow kustom. |
| 9 | **Icon** | `lucide-react` saja, ukuran `h-4 w-4`/`size-4`; `aria-hidden` untuk ikon dekoratif. Dilarang emoji. |
| 10 | **Responsive** | Panel kiri `hidden lg:flex`; brand mobile `lg:hidden`; layout jadi 1 kolom < `lg`; kontainer `max-w-md`. |
| 11 | **Focus State** | Bawaan shadcn: `focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none`. |
| 12 | **Hover State** | `hover:bg-primary/90` (button), `hover:bg-accent` (ghost), `hover:underline` (link), `hover:text-foreground` (toggle/link muted). |
| 13 | **Active State** | Bawaan shadcn (transisi warna saat ditekan) via `transition-colors`. |
| 14 | **Disabled State** | `disabled:opacity-50 disabled:pointer-events-none`; tombol submit `disabled={isSubmitting}`. |
| 15 | **Validation State** | `zod` + `react-hook-form` (`zodResolver`); pesan via `FormMessage`; `aria-invalid` + `FormLabel` error `text-destructive`. |
| 16 | **Loading State** | `isSubmitting` → `Loader2 animate-spin` + teks "Signing in..." + tombol disabled. |
| 17 | **Accessibility** | `FormControl` menyuntik `id`/`aria-describedby`/`aria-invalid`; `aria-label` toggle ("Show/Hide password"); `aria-hidden` ikon; `<form noValidate>`; kontras WCAG AA. |
| 18 | **Animation / Motion** | Hanya fungsional: `animate-spin` (loader) + `transition-colors` (button/input). Tanpa efek berlebihan. |
| 19 | **Alignment** | `flex items-center`, `justify-between` (label ↔ link), `justify-center` (kontainer form), ikon `items-start`. |
| 20 | **Z-Index** | Konten panel `relative z-10` di atas overlay grid dekoratif. |
| 21 | **Overflow** | `overflow-hidden` pada `aside` agar grid dekoratif rapi di dalam panel. |
| 22 | **Form Behavior** | `useForm({ mode: "onSubmit" })` + `handleSubmit`; nilai default terkontrol; "remember" → `localStorage`. |
| 23 | **Keyboard Navigation** | Kontrol native (Tab/Shift+Tab); Enter submit form; tombol toggle `type="button"` agar tidak submit. |
| 24 | **Error Handling** | Pesan validasi dari schema; skenario sukses (mock) → toast `sonner`. |
| 25 | **Placeholder** | `name@example.com`, `Enter your password`; teks bantu netral/generic. |
| 26 | **Empty State** | _Tidak berlaku_ di Login. Standar ke depan: `Skeleton` (loading) + teks "No Data Available". |
| 27 | **Branding** | Logo + nama generik (`UI Guidelines`), monokrom; tanpa konten bisnis. |
| 28 | **Theme (Light/Dark)** | Token light **dan** dark sudah ada di `index.css` (`:root` & `.dark`). Saat ini **Light Mode only** (toggle belum diaktifkan). |
| 29 | **Consistency** | Semua nilai dari token & komponen shadcn; tidak ada nilai magic/hardcode. |
| 30 | **Reusability** | `AuthLayout` (shell auth reusable), `authSchema` (validasi terpisah), `LoginForm` (komposisi) — siap dipakai ulang. |

---

## C. Catatan / Butuh Keputusan (belum diimprovisasi)

Sesuai `DESIGN_SYSTEM_RULES.md`, item berikut **belum dibuat** dan menunggu arahan:

1. **Alert form-level** (⚪): komponen `Alert` tersedia. Aktifkan bila perlu pesan
   error autentikasi global di atas form. Perlu persetujuan penggunaan.
2. **Dark mode toggle**: token sudah siap; pengaktifan toggle menunggu keputusan
   (sebelumnya diminta fokus Light Mode dulu).
3. **Empty State / No Data**: relevan untuk halaman data (tabel/list), bukan Login;
   akan distandarkan saat halaman terkait dibuat.

> Tidak ada komponen di luar `src/components/ui/` yang dibuat untuk halaman ini.
