# Design System Rules — WAJIB DIPATUHI (Non-Negotiable)

> Dokumen ini adalah kontrak. Setiap UI (komponen, halaman, layout) yang dibuat
> di project **UI Guidelines** ini **HARUS** mengikuti aturan di bawah.
> Aturan ini tidak boleh dilanggar tanpa persetujuan eksplisit dari pemilik project.

---

## 0. Prinsip Utama

1. **Design System adalah satu-satunya sumber kebenaran (single source of truth).**
2. **100% memakai komponen resmi shadcn/ui** yang tersedia di `src/components/ui/`.
3. **Dilarang berimprovisasi.** Jika sesuatu tidak tersedia di design system,
   **JANGAN membuatnya sendiri** — laporkan dulu (lihat Bagian 4).

---

## 1. Aturan Komponen

- ✅ **Gunakan** komponen dari `src/components/ui/` (daftar di Bagian 5).
- ❌ **JANGAN** membuat komponen UI baru bila sudah ada padanannya di shadcn/ui.
- ❌ **JANGAN** memodifikasi struktur/perilaku/gaya bawaan komponen shadcn/ui
  (file di `src/components/ui/`) tanpa persetujuan.
- ❌ **JANGAN** memakai library UI lain (MUI, Ant, Chakra, Bootstrap, Flowbite, dll).
  - ✅ **Pengecualian yang diizinkan** (dependency resmi/pendukung): **lucide-react** (ikon) &
    **recharts@2.15.4** (chart) untuk global; ditambah dependency yang **terikat komponen**
    (mis. Data Grid, Code Block, Markdown, Phone Input, Input Mask, Kanban, Sortable).
    **Daftar lengkap & otoritatif (SSOT) ada di R37** pada `DESIGN_SYSTEM.md` — jangan
    menduplikasi di sini. Di luar daftar itu, library baru **wajib disetujui** dulu, dan
    setiap dependency **tidak boleh menyebar** ke luar komponennya.
- ❌ **JANGAN** memakai elemen HTML mentah untuk hal yang sudah punya komponen
  (mis. `<button>`, `<input>`, `<select>` mentah) — pakai komponen shadcn/ui.
- ✅ Elemen HTML semantik **boleh** dipakai hanya untuk struktur/layout
  (`<main>`, `<aside>`, `<section>`, `<ul>`, `<nav>`, dll), bukan sebagai kontrol UI.

### Yang termasuk "improvisasi" (DILARANG)
- Membuat kontrol UI kustom (dropdown, modal, toast, date picker, tabs, dll) sendiri.
- Menyalin/menempel komponen dari sumber lain lalu mengubah gaya default-nya.
- Menambah warna, font, radius, atau shadow di luar design token.

---

## 2. Aturan Design Token & Styling

- ✅ **Selalu** memakai design token semantik:
  `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`,
  `border-border`, `bg-card`, `bg-secondary`, `bg-accent`, `text-destructive`, dst.
- ❌ **JANGAN** memakai warna hardcode: `text-white`, `bg-white`, `bg-black`,
  `bg-blue-500`, `text-red-600`, kode hex (`#fff`), atau `rgb()/hsl()` literal.
- ✅ Token CSS **wajib** format **HSL space-separated** di `index.css`
  (contoh: `--primary: 0 0% 9%`). Dilarang format RGB.
- ❌ **JANGAN** mengubah nilai token / tema shadcn (`index.css`, `tailwind.config.js`)
  tanpa persetujuan. Tema saat ini = **neutral / monochrome** bawaan shadcn.
- ✅ Warna hanya sebagai **accent** untuk aksi penting / status
  (mis. `destructive` untuk error), **bukan** dekorasi.
- ✅ Spacing, radius, shadow, dan motion mengikuti skala bawaan shadcn/ui.
- ✅ **Font WAJIB: Geist** (primary), fallback `Inter, system-ui, sans-serif`.
  Diatur di `index.css`. Dilarang memakai font lain tanpa persetujuan.
- ✅ **Ikon WAJIB: `lucide-react`** (satu-satunya sumber ikon), ukuran default
  `h-4 w-4`, `aria-hidden` bila dekoratif. ❌ Dilarang emoji, SVG inline kustom,
  atau library ikon lain.

---

## 3. Aturan Visual & Layout

- Gaya target: **Clean, Minimal, Modern, Professional, Enterprise, Monochrome-first,
  Compact.**
- Prioritaskan **konsistensi** dan **data density** — hindari whitespace berlebih
  dan efek visual berlebihan.
- **Semua UI wajib responsif untuk SEMUA perangkat — mobile, tablet, desktop** (mobile-first).
  Definisi lengkap & wajib: **Bagian 12 (R42)**. Toolbar/filter, tabel, form, dan dialog
  **harus** rapi *dan* tetap elegan di ketiga ukuran; verifikasi di **375px / 768px / ≥1280px**.
- **Accessibility wajib**: label pada input (`Label`/`FormLabel`), `aria-*` untuk
  kontrol ikon, focus state terlihat, kontras memenuhi WCAG AA, HTML semantik.

---

## 4. Prosedur Saat Komponen TIDAK Tersedia (WAJIB)

Jika sebuah kebutuhan **tidak dapat dipenuhi** oleh komponen di Bagian 5:

1. **BERHENTI. Jangan membuat komponen kustom.**
2. **Laporkan** dengan format baku berikut:

   > ⚠️ **KOMPONEN BELUM TERSEDIA DI DESIGN SYSTEM**
   > - Kebutuhan: _(jelaskan komponen/pola yang dibutuhkan)_
   > - Padanan shadcn/ui: _(ada / tidak ada — sebutkan bila ada)_
   > - Rekomendasi: _(opsi solusi resmi, mis. tambahkan komponen shadcn X)_
   > - Menunggu persetujuan sebelum implementasi.

3. **Tunggu keputusan** pemilik project sebelum menambah/membuat apa pun.
4. Jika disetujui: tambahkan komponen **resmi shadcn/ui** (via referensi dokumentasi
   resmi), bukan versi buatan sendiri.

Dokumentasi resmi acuan: https://ui.shadcn.com/docs/components

---

## 5. Inventaris Komponen Design System (Yang Tersedia)

Sumber: `src/components/ui/`. Hanya komponen di bawah ini yang dianggap
"tersedia" di design system:

accordion, alert, alert-dialog, aspect-ratio, attachment, avatar, badge, breadcrumb,
bubble, button, button-group, calendar, card, carousel, chart, checkbox, collapsible,
command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card,
input, input-group, input-otp, item, kbd, label, marker, menubar, message,
message-scroller, native-select, navigation-menu, pagination, popover, progress,
radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton,
slider, sonner (toast), spinner, switch, table, tabs, textarea, toast, toaster,
toggle, toggle-group, tooltip, typography.

**Base Components: 61/61 Established** — semua primitive punya preview live di halaman
"Base Components".

Ikon: **lucide-react** (diperbolehkan). Dilarang memakai emoji sebagai ikon.

**Composite Components** (`src/components/composite/`, terdaftar di halaman "Composite Component" &
Registry 1.4): Autocomplete, Rating, Stepper, List, Cookie Banner, Preloader, Widget, Placeholder,
Data Grid, Code Block, Markdown, Phone Input, Input Mask, Kanban, Sortable, Empty State,
Combobox, Date Picker, Password Input. Composite =
**komposisi** dari primitives di atas (+ dependency yang diizinkan R37); **bukan** primitive baru.

**Ekstensi & komponen app-level reusable (bukan library baru):**
- **`DialogBody`** (`components/ui/dialog.jsx`) — wrapper body form dialog (`px-6 py-4` + `space-y-[var(--field-gap)]`). **WAJIB** dipakai di setiap form dialog (2B.10 / R40).
- **`DensityProvider` + `DensityToggle`** (`components/`) — density global Dense⇄Comfortable (CSS var, `localStorage`), sejajar `ThemeProvider`/`ModeToggle`.
- **Halaman Application/CMS** (`pages/app/*`: `OfficesPage`, `RolesPage`) — konsumen nyata design system (FastAPI+MongoDB), WAJIB ikut **R40** (Application CRUD Page Pattern).

> Catatan: Komposisi (menggabungkan beberapa komponen di atas menjadi
> `LoginForm`, `AuthLayout`, halaman, dsb.) **diperbolehkan** dan dianjurkan
> demi reusability — selama tidak membuat **primitive UI baru** dan tidak
> mengubah komponen di `src/components/ui/`.

---

## 6. Aturan Konten (Generic Template)

- Ini project **UI Guidelines / Design System**, **bukan** aplikasi bisnis.
- Dilarang membuat asumsi: nama aplikasi/perusahaan/produk, industri, istilah
  bisnis (perbankan, pembayaran, ERP, CRM, dll), atau copywriting marketing.
- Gunakan **placeholder generik**: `UI Guidelines`, `Sign In`, `Welcome back`,
  `Dashboard`, `Users`, `Settings`, `Search`, `Save`, `Cancel`, `Delete`,
  `Loading...`, `No Data Available`, `Feature One`, dst.
- 🔴 **BAHASA UI = INGGRIS SAJA (Non-Negotiable).** SEMUA teks yang tampil di layar
  (label, judul section/Card, placeholder, tombol, hint, toast, pesan error/validasi,
  header tabel) WAJIB **Bahasa Inggris** — tidak peduli bahasa komunikasi user maupun
  bahasa pada screenshot/referensi yang diberikan user. **Bila user memberi referensi
  desain berbahasa lain, yang diikuti HANYA *layout*-nya, BUKAN bahasanya** — terjemahkan
  balik semua teks ke Bahasa Inggris. Menerjemahkan konten UI ke bahasa lain = pelanggaran
  aturan (insiden Update 78).

---

## 7. Checklist Sebelum Menyelesaikan Setiap UI

- [ ] Semua kontrol UI berasal dari `src/components/ui/` (tidak ada primitive baru).
- [ ] Tidak ada file di `src/components/ui/` yang dimodifikasi tanpa persetujuan.
- [ ] Semua warna memakai design token (tidak ada warna hardcode).
- [ ] Token tetap HSL; tema shadcn tidak diubah tanpa izin.
- [ ] Responsif (**mobile 375px + tablet 768px + desktop ≥1280px**) — rapi & tetap elegan
      di ketiga ukuran (toolbar menumpuk, tabel scroll, dialog stack) — **R42** — dan aksesibel
      (label, aria, focus, kontras).
- [ ] Konten generik (tanpa konten bisnis).
- [ ] Jika ada kebutuhan di luar design system → sudah dilaporkan & disetujui,
      bukan diimprovisasi.
- [ ] Modifikasi komponen di `ui/`/`composite` menjaga invarian (Compact/2B,
      Typography/2A, warna token-only, density) & dampaknya sudah diverifikasi ke
      semua konsumen — **R38**.
- [ ] **COMPACT (R39):** `space-y` sudah sesuai Tabel Keputusan (2B.5) — **`space-y-6`
      HANYA di root halaman, DILARANG di dalam `CardContent/Header/Footer`** (pakai
      `space-y-3` form / `space-y-4` umum). Avatar profil `h-12 w-12`, grid form `gap-4`.
- [ ] **GUARD:** `bash frontend/docs/design-guard.sh` sudah dijalankan & **lolos (exit 0)**
      (2C.14). Berlaku untuk **halaman/blok baru**, bukan hanya modifikasi komponen.
- [ ] **APP CRUD (R40):** halaman `pages/app/*` mengikuti pola wajib — Card+CardHeader
      (**responsif: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`** — judul menumpuk di atas & tombol membungkus di mobile; grup tombol `flex flex-wrap gap-2`),
      toolbar (search + **Reset** `FilterX` yang muncul saat search/filter aktif → reset `globalFilter`(+`columnFilters`) + Density),
      DataTable no-wrap, **form dialog pakai `<DialogBody>`**, **Delete destructive (merah)**,
      states via `EmptyState` (no-match tampilkan tombol **Reset** juga), data via `lib/api.js`.
- [ ] **FORM GRID (R41):** field form disusun rapi & sejajar — field utama (mis. Name) full-width,
      field pendek terkait dikelompokkan dalam baris **`grid grid-cols-1 sm:grid-cols-2 items-start gap-4`**.
      **Pakai `<FormItem>` polos untuk SEMUA field** (Combobox sudah block-level & `w-full`);
      **DILARANG mencampur `<FormItem className="flex flex-col">`** dengan `<FormItem>` di baris grid yang sama
      (menyebabkan label/kontrol tidak sejajar). Label **ringkas & 1 baris** (tanpa suffix "(Optional)");
      opsionalitas lewat **placeholder**.

---

## 8. Aturan Modifikasi Komponen (Non-Negotiable)

Komponen bersifat **reusable** (satu sumber) → setiap modifikasi pada
`src/components/ui/` atau `src/components/composite/` **WAJIB** menjaga invarian
design system: **Compact/Spacing (2B)**, **Typography (2A)**, **warna token saja
(R06/R29 — gambar referensi hanya acuan struktur, bukan warna)**, dan **density**.
Sebelum selesai, **verifikasi dampak ke semua konsumen** (min. 2–3 halaman).
Menukar compact demi fitur visual = **pelanggaran / regresi**.

> Definisi lengkap & otoritatif (SSOT): **R38** pada `DESIGN_SYSTEM.md`.

---

## 9. Aturan Compact Density — SEMUA UI (Non-Negotiable)

Memperluas Bagian 8 (R38) agar berlaku **tidak hanya saat memodifikasi komponen**,
tetapi juga saat **membuat halaman / blok / section baru**. Insiden Update 45–46
(UI Profile & Wizard terasa longgar) terjadi karena `space-y-6` dipakai **di dalam
Card** — padahal itu ritme **root halaman**.

**Tabel Keputusan `space-y` (WAJIB dihafal — SSOT di 2B.5 / R39):**

| Konteks | Kelas WAJIB |
|---|---|
| Root halaman (`<div data-testid="*-page">`) | `space-y-6` |
| Antar-section besar di root | `space-y-6` |
| **Isi `CardContent`** (form/section) | **`space-y-3`** (Dense) |
| **Isi `CardContent`** (umum) | **`space-y-4`** |
| Grup terkait / rapat | `space-y-3` / `space-y-2` |

❌ **`space-y-6` DILARANG di dalam `CardContent/CardHeader/CardFooter`.**
Density lain: avatar profil `h-12 w-12` (bukan `h-16`), grid form `gap-4` (bukan `gap-5`),
Card section `px-6 py-4`. Nilai `px` arbitrer & whitespace berlebih = **regresi**.

> SSOT: **R39** + **2B.5/2B.8** pada `DESIGN_SYSTEM.md`.

---

## 10. Panduan Kepatuhan Agen (agar aturan dimengerti & ditaati)

Alur kerja **wajib** setiap kali menyentuh UI — dirancang agar aturan tidak "lolos" lagi:

1. **BACA DULU (sebelum menulis kode):**
   - Tabel Keputusan `space-y` (Bagian 9 / 2B.5) — ini penyebab #1 insiden.
   - Registry komponen (Bagian 5) — jangan bikin primitive baru.
   - `DESIGN_SYSTEM.md` §2A/2B/2C untuk pola yang relevan dengan task.

2. **TIRU pola yang ada (jangan mulai dari nol):** salin struktur halaman/kartu dari
   file sejenis yang sudah patuh (mis. `FormElementsPage.jsx`, `FormLayoutPage.jsx`),
   lalu ganti isinya. Ini otomatis membawa spacing/typography yang benar.

3. **SAAT MENULIS:** untuk setiap `space-y-*`, tanyakan "ini root halaman atau isi Card?"
   → root = `space-y-6`, isi Card = `space-y-3` (form/Dense) / `space-y-4` (umum). Warna hanya token. Ikon hanya
   `lucide-react`. Konten generik.

4. **SEBELUM SELESAI (Definition of Done):**
   - Jalankan **`bash frontend/docs/design-guard.sh`** → harus **lolos (exit 0)**.
   - Centang **Checklist Bagian 7** (termasuk item COMPACT & GUARD).
   - **Verifikasi RESPONSIF (R42):** cek tampilan di **mobile 375px, tablet 768px, desktop ≥1280px** —
     rapi & elegan, tanpa elemen terpotong/overflow/berdempetan (khususnya toolbar/filter, tabel, dialog).
   - Verifikasi visual via screenshot (halaman baru) atau ≥2–3 konsumen (modifikasi komponen, R38).

5. **JIKA RAGU / DI LUAR REGISTRY:** BERHENTI & lapor (Bagian 4). Jangan berimprovisasi.

6. **PENGECUALIAN yang disengaja:** tandai baris dengan komentar `// guard-allow` **dan**
   catat alasannya di Changelog `DESIGN_SYSTEM.md`. Tanpa keduanya, guard menganggap regresi.

> Prinsip: *"Compact by default, verify by guard."* Aturan yang tidak diperiksa otomatis
> akan terlewat — maka **guard + checklist adalah bagian dari Definition of Done**, bukan opsional.

---

## 12. Aturan Responsif — SEMUA Perangkat (R42, Non-Negotiable)

> Ditambahkan setelah insiden toolbar Audit Log yang berantakan di layar HP.
> **Setiap UI WAJIB diperiksa & dibuat rapi + elegan di mobile, tablet, dan desktop.**

**Pendekatan: mobile-first.** Tulis gaya dasar untuk layar terkecil dulu, lalu tambah
breakpoint ke atas. Breakpoint Tailwind: `sm=640px`, `md=768px`, `lg=1024px`, `xl=1280px`.

**Ukuran verifikasi WAJIB (Definition of Done):** **mobile 375px**, **tablet 768px**,
**desktop ≥1280px**. Tidak boleh ada elemen yang terpotong, tumpang tindih, meluber
(overflow horizontal pada halaman), atau tombol/teks yang berdempetan.

**Pola WAJIB per konteks:**

| Konteks | Aturan |
|---|---|
| **Toolbar / baris filter** | Menumpuk di mobile lalu jadi baris di layar lebar: `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. **Dilarang** satu baris `flex` horizontal yang tidak menumpuk. |
| **Grup ≥2 kontrol kecil (mis. 2 date input)** | Bagi rata di mobile: `grid grid-cols-2 gap-2 sm:flex sm:flex-wrap`. Tombol lebar penuh di mobile via `col-span-2 sm:col-auto`. |
| **Lebar kontrol** | **Dilarang lebar fiks (`w-[Npx]`) ≥120px tanpa fallback mobile.** Pakai `w-full sm:w-[Npx]`. Search: `w-full lg:max-w-xs`. |
| **Tabel** | Wajib bisa scroll horizontal di dalam wadahnya (shadcn `Table` sudah `overflow-auto`) — jangan biarkan tabel merusak lebar halaman. Lihat **R43** (wajib & dicek otomatis). |
| **CardHeader (judul + aksi)** | `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`; grup tombol `flex flex-wrap gap-2` (R40). |
| **Dialog / form multi-kolom** | Grid menumpuk di mobile: `grid-cols-1 sm:grid-cols-2` (R41). Teks panjang (mis. path) pakai `break-all`/`break-words`. Konten panjang `overflow-auto` dengan `max-h-*`. |
| **Sidebar/navigasi** | Pakai komponen `sidebar`/`sheet` resmi (sudah responsif); jangan bikin sendiri. |

### R43 — Tabel Responsif di SEMUA Halaman (Non-Negotiable)

> Ditetapkan agar tabel tidak pernah merusak layout di layar kecil (mencegah pengulangan insiden).

**Kontrak wajib untuk setiap tabel data (di halaman mana pun):**

1. **WAJIB memakai primitive shadcn `<Table>`** dari `components/ui/table.jsx`. Primitive ini
   membungkus `<table>` dengan `div.overflow-auto` sehingga tabel **scroll horizontal** otomatis
   di layar sempit. **DILARANG** menulis elemen `<table>` HTML mentah di kode fitur.
2. **Jangan mematikan scroll:** wadah pembungkus tabel (mis. `rounded-md border`) boleh, tetapi
   **jangan** memakai lebar tetap atau `overflow-hidden` yang memotong scroll horizontal tabel utama.
3. **Kolom tidak boleh "gepeng":** tambahkan `[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap`
   pada tabel data agar kolom mempertahankan lebar dan tabel men-scroll, bukan meremukkan teks.
   Kecuali kolom yang memang perlu membungkus (mis. Summary) → beri `whitespace-normal` pada sel itu saja.
4. Verifikasi visual tetap wajib di **375 / 768 / ≥1280px** (Definition of Done).

Dicek otomatis oleh `design-guard.sh` (**#11** — mendeteksi `<table>` mentah di kode fitur).

### R44 — Tabs Responsif di SEMUA Halaman (Non-Negotiable)

> Ditetapkan setelah `TabsList` Branding membungkus/terpotong di layar HP (mencegah pengulangan).

**Kontrak wajib untuk setiap `Tabs` (di halaman mana pun):**

1. **`TabsList` WAJIB scroll horizontal di mobile**, bukan membungkus (wrap). Pola kanonik:
   `className="w-full justify-start overflow-x-auto sm:w-auto"`. **DILARANG** `flex-wrap` pada
   `TabsList` (menyebabkan tab pindah baris & terpotong oleh elemen lain).
2. **Aksi (mis. tombol Save) jangan menindih tab di mobile.** Bila toolbar berisi `TabsList` + tombol,
   susun `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`. Tombol submit yang
   penting sebaiknya **di bawah konten** pada mobile (mis. bar sticky `sticky bottom-0 … sm:hidden`),
   bukan di atas form — hindari `TabsList` dan tombol berdempetan pada satu baris sempit.
3. Konten `TabsContent` mengikuti pola responsif form/tabel (R41/R42/R43).
4. Verifikasi visual wajib di **375 / 768 / ≥1280px** (Definition of Done).

Dicek otomatis oleh `design-guard.sh` (**#12** — `TabsList` tanpa `overflow-x-auto`).

### R45 — Skala Tipografi Halaman Aplikasi (Non-Negotiable)

> Ditetapkan agar teks di halaman fitur CMS tetap padat & konsisten (mencegah teks kebesaran).

**Skala kanonik untuk konten aplikasi (`pages/app`):**

| Peran | Kelas |
|---|---|
| Judul section / `CardTitle` / judul halaman | `text-base font-semibold` |
| Body, label form, isi tabel | `text-sm` (input boleh `text-base md:text-sm` — bawaan shadcn, mencegah zoom iOS) |
| Helper / meta / caption | `text-xs` |

**Aturan:**

1. **DILARANG** `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` (dst.) di dalam `pages/app`
   (halaman fitur CMS). Judul cukup `text-base`.
2. Gunakan `CardTitle` (sudah `text-base`) untuk judul kartu/section; jangan bikin `<h1>` besar sendiri.
3. **Pengecualian** (di luar scope cek): layar auth (Login/Forgot), serta halaman **katalog design-system**
   & marketing yang memang memakai `PageHeader` (`text-2xl`) atau hero besar. Ini bukan halaman fitur CMS.
4. Verifikasi visual di **375 / 768 / ≥1280px** (Definition of Done).

Dicek otomatis oleh `design-guard.sh` (**#13** — `text-xl/2xl/3xl/4xl…` di `pages/app`).

### R46 — Kolom Tabel Wajib Bisa Di-Sort (Non-Negotiable)

> Ditetapkan agar setiap tabel/datatable konsisten memberi kontrol urut pada penggunanya.

**Kontrak wajib untuk setiap tabel/datatable:**

1. **Setiap header KONTEN wajib bisa di-sort** (ada indikator arah + toggle asc/desc).
   Gunakan `SortableHeader` (TanStack, di Users/Offices) atau `SortHead` + `useSortableRows`
   dari `components/composite/sortable-table.jsx` (tabel `shadcn` biasa).
2. **Dikecualikan (bukan konten data):** kolom checkbox pilih-baris, kolom **Actions**
   (menu titik-tiga/hapus), tombol **Detail**, dan kolom yang isinya **kontrol/switch/select**
   (mis. `Switch` Enabled, `Select` inline).
3. **Sorting lintas seluruh dataset** untuk tabel berpaginasi server (mis. Audit Log) → kirim
   `sort_by` & `sort_dir` ke API (bukan hanya sort halaman aktif).
4. **Pengecualian:** sub-tabel detail di dalam dialog (mis. diff `Field/From/To`, daftar koleksi
   pada dialog restore). Tabel **hierarki/tree** (mis. Role List) TETAP menyediakan header sortable;
   saat sort aktif, urutan pohon di-flatten sementara mengikuti kolom yang dipilih (indentasi tetap tampil).
5. Verifikasi via review/`testing_agent` (tidak diauto-guard karena deteksi sortable tidak andal via regex).

**Prinsip:** *Compact & elegant on every screen.* Jangan memaksa layout desktop ke mobile,
dan jangan menambah label/elemen yang membuat toolbar "gendut" — jaga tetap **compact**
(lihat R39) sambil tetap **rapi di semua ukuran**.

Dicek sebagian otomatis oleh `design-guard.sh` (#10 — lebar fiks tanpa fallback pada
`pages/app`), sisanya **verifikasi visual di 3 breakpoint** adalah bagian dari Definition of Done.

---
## 12A. R47 — Tabel & Form Compact untuk Halaman List/CRUD (Non-Negotiable)

Menyeragamkan tampilan **halaman list master-data** (Offices, Users, Roles, Clients, dst.)
agar rapat, konsisten, dan mengikuti toggle Density. Semua utilitas sudah tersedia di
`index.css` (jangan bikin nilai arbitrer baru).

**R47.1 — Baris tabel compact (density-aware).**
Setiap `<Table>` pada halaman list WAJIB memakai class **`tbl-density`** (digabung dengan
`[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap`). Efek otomatis dari `.tbl-density`:
- padding vertikal sel `td/th` = `var(--tbl-cell-py)` → ikut Dense (`0.25rem`) / Comfortable (`0.75rem`).
- `td` = **13px** (`0.8125rem`); `th` = **UPPERCASE** + `letter-spacing .05em` + `0.75rem`, `height:auto`.
- **background header abu** seragam: `thead th` = `hsl(var(--muted)/0.5)` (dipaksa via CSS, tidak bergantung markup per-halaman).

DILARANG mengatur ulang tinggi/padding baris via nilai arbitrer per-halaman.

**R47.2 — Toolbar dibungkus card abu.**
Baris toolbar (search + filter + Density) WAJIB dibungkus:
`flex flex-col gap-2 rounded-lg border bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between`.

**R47.3 — Search box seragam.**
Container `relative w-full max-w-[15rem]`; `<Input>` = `h-[var(--ctl-h-sm)] pl-8 text-xs`,
placeholder **`"Search..."`** (bukan "Search users..." dsb). Ikon `Search` absolute kiri.

**R47.4 — Kontrol pagination = tinggi Density.**
`SelectTrigger` page-size = `h-[var(--ctl-h-sm)] w-[70px]`; tombol prev/next (icon) =
`size-[var(--ctl-h-sm)]`. Tujuannya sejajar dengan tombol Density (`size="sm"`).

**R47.5 — Tombol aksi baris.**
Trigger `⋯` (DropdownMenu) memakai `size-7` (bukan `size-8`).

**R47.6 — Item menu aksi: "Detail" paling atas + hapus "Copy ID".**
Item yang membuka halaman/dialog edit diberi label **"Detail"** dengan ikon **`Eye`** (lucide),
menggantikan "Edit"/ikon `Pencil`, dan **WAJIB berada di posisi PALING ATAS** menu aksi
(sebelum item lain seperti Move/View usage/Regenerate/Revoke/Delete). Item **"Copy ID" DIHAPUS**.
Item fungsional lain (Move, Regenerate, Revoke, Reset, Unbind, Deactivate, Delete, dll.)
**tetap dipertahankan** di bawah "Detail". Konsekuensinya judul & breadcrumb halaman form
memakai **"Detail X"** (bukan "Edit X").

**R47.7 — Form compact via `.form-dense`.**
Container form (halaman form atau `DialogContent`) memakai class **`form-dense`**. Efek:
- `--item-gap: 0.125rem` → jarak label→kontrol rapat (jangan set `space-y` manual per `FormItem`).
- `label`, `input`, `textarea`, `[role="combobox"]` = **13px**.
Grid field memakai `gap-x-4 gap-y-2` (rapatkan jarak antar-baris). **CardDescription dihapus**
pada form CRUD sederhana (judul `CardTitle` sudah cukup).

**R47.8 — Tinggi baris seragam (badge vs non-badge).**
Baris dengan `Badge`/chip WAJIB setinggi baris teks-polos. SSOT: `.tbl-density td` diberi
**`line-height: 1.5rem`** + **`vertical-align: middle`** (index.css) agar line-box sel selalu
menampung badge (~22px) tanpa menambah tinggi baris. DILARANG menyamakan tinggi baris via
padding/height arbitrer per-halaman. (Insiden Update 78 — user melaporkan baris ber-badge lebih
tinggi.)

> SSOT variabel: `index.css` (`--tbl-cell-py`, `--ctl-h-sm`, `.tbl-density`, `.form-dense`).
> Diterapkan pada: `OfficesPage`, `UsersPage`, `RolesPage`, `ClientsPage` + form terkait
> (`OfficeFormPage`, `UserFormPage`, `RoleFormPage`, dialog Clients). Halaman list/CRUD baru
> WAJIB mengikuti R47 sejak awal.

---

## 12B. R48 — Konsistensi Ukuran Tombol (Non-Negotiable)

Ukuran font tombol **mengikuti `size`** (by design): `sm` = `text-xs` (12px), `default` =
`text-sm` (14px). Yang WAJIB dijaga adalah **konsistensi antar tombol sederajat**.

- **Default halaman aplikasi = `size="sm"`.** Semua tombol aksi halaman (header actions,
  toolbar, CTA sekunder seperti "New Client", "View API Docs", "Import/Export") memakai
  **`size="sm"`** agar seragam & compact (selaras R47/R39).
- ❌ DILARANG menaruh tombol beda `size` berdampingan / pada page yang sama tanpa alasan
  (mis. header `sm` 12px vs CTA `default` 14px) — inkonsistensi yang dilaporkan user.
- `default`/`lg` hanya untuk konteks khusus (mis. tombol submit utama di form/dialog besar)
  dan tetap konsisten antar sesama tombol di konteks itu.

> SSOT ukuran: `components/ui/button.jsx` (`sm`=`text-xs`, `default`=`text-sm`). Prioritas app: `sm`.

---

## 12C. R49 — Semua Tombol Wajib Ada Ikon (Non-Negotiable)

Setiap `<Button>` / `AlertDialogAction` / `AlertDialogCancel` (di halaman **dan** dialog)
WAJIB menampilkan ikon lucide-react di sisi kiri label. Tombol khusus ikon (`size="icon"`)
sudah otomatis patuh.

Konvensi ikon default (pakai yang paling relevan bila ada konteks lebih spesifik):
- Save/Simpan → `Check`/`Save` · Submit password → `KeyRound` · Cancel/Batal/Close/Tutup → `X`
- Delete/Hapus/Clear/Purge → `Trash2` · Confirm → `Check` · Add/New → `Plus` · Back → `ArrowLeft`
- Reset (form) → `RotateCcw` · Retry → `RefreshCw` · Send → `Send`/`SendHorizontal`
- Revoke → `Ban` · Regenerate → `RefreshCw` · Test connection → `Wifi` · Sign out → `LogOut`

> Saat loading, ikon boleh diganti spinner `Loader2 animate-spin`, tetapi state normal tetap wajib berikon.

---

## 12D. R50 — Penempatan Tombol Footer (Non-Negotiable)

Footer dialog/halaman dengan **dua tombol** WAJIB tersebar **kiri & kanan** (bukan menumpuk
di kanan): **Cancel/Batal di KIRI, tombol utama (Save/Confirm/Delete) di KANAN**.

- SSOT: `DialogFooter` & `AlertDialogFooter` default kini `sm:justify-between` (urutan DOM:
  Cancel dulu → primary) — jadi otomatis kiri/kanan tanpa util per-halaman.
- ❌ DILARANG menimpa dengan `sm:justify-end` untuk footer dua-tombol.
- Footer **satu tombol** tetap boleh rata kanan (`justify-end`).

> SSOT: `components/ui/dialog.jsx`, `components/ui/alert-dialog.jsx`.

---

## 12E. R51 — Pola Halaman Konfigurasi (Section Cards Bertumpuk) (Non-Negotiable)

Untuk halaman **konfigurasi/pengaturan satu-halaman yang panjang** (mis. Branding) yang berisi
**banyak grup field** — BUKAN list/CRUD (R47) dan BUKAN dialog. Pola ini menggantikan Tabs bila
kontennya berupa form bersambung yang di-scroll.

**R51.1 — Section cards bertumpuk.** Setiap grup field dibungkus **`Card`** terpisah dengan
`CardHeader` (judul section, `CardTitle text-base`) + `CardContent space-y-4`. Root halaman
`space-y-6`. Gunakan **satu komponen `Section` reusable** per halaman (jangan hand-roll Card
berulang). Contoh section: *Application Identity, Brand Assets, SEO & Metadata, Sitemap,
Link Preview, Contact & Footer*.

**R51.2 — Save bar di bawah (BUKAN sticky mengambang).** Tombol simpan diletakkan pada bar di
**akhir aliran halaman**: `flex justify-end border-t pt-4`, tombol `size="sm"` rata kanan (R48),
berikon (R49). **DILARANG** save bar `sticky`/`fixed` dengan `backdrop-blur`/negative-margin yang
**mengambang menutupi konten** (insiden Update 78 — dinilai "jelek" oleh user).

**R51.3 — Layout mengikuti referensi, teks tetap Inggris.** Bila user memberi screenshot
referensi, ikuti **struktur/urutan section** saja; **JANGAN** menambah field/fitur yang tidak
diminta dan **JANGAN** menerjemahkan teks (lihat §6 — Inggris saja).

**R51.4 — Grid field di dalam section.** Field pendek berpasangan `grid grid-cols-1 sm:grid-cols-2 gap-4`;
field teks panjang (textarea/description) full-width (selaras R41).

> SSOT contoh: `pages/app/BrandingPage.jsx` (komponen `Section` + save bar). Bedakan dari R47
> (halaman list/CRUD) dan R40 (Card+DataTable). Tabel apa pun di dalam section tetap tunduk R47/R43.

---






## 13. Governance Lanjutan (rujukan — SSOT di `DESIGN_SYSTEM.md`)

Bagian ini hanya **penunjuk**; definisi lengkap & otoritatif ada di `DESIGN_SYSTEM.md`:

- **Versioning & Release** (SemVer, Breaking Change, Deprecation, Migration, Changelog policy) → **2C.15**.
- **Component Lifecycle** (Experimental/Available/Established/Deprecated/Pending/Removed) → **2C.16**.
- **Feedback Pattern** (kapan Toast vs Inline vs Alert vs Dialog) → **2C.17**.
- **Empty State Registry** (No Data / No Search Result / First-Time / Permission Denied / Offline / Error) → **2C.18**.
- **Search, Filter & Sort** (global; Saved Filter = Deferred) → **2C.19**.
- **Data Display & Formatting** (Number/Currency/Percentage/Date/Time/Status/null) → **2C.20**.
- **Permission Pattern** (Hide/Disable/Read-only/Forbidden) → **2C.21**.
- **Testing Standard** (Visual/A11y/Interaction/Responsive — aturan saja) → **2C.22**.
- **Performance Guideline** (Lazy/Memo/Virtualization/Bundle/Chart/Large Table) → **2C.23**.
- **Application CRUD Page Pattern** (Card+DataTable, `DialogBody`, Delete destructive, states, `lib/api.js`) → **R40**; model backend & API → `ARCHITECTURE.md` §11.
- **Form Field Grid Pattern** (field utama full-width; field pendek terkait di `grid grid-cols-1 sm:grid-cols-2 items-start gap-4`; **`<FormItem>` polos konsisten** untuk semua field — dilarang campur `flex flex-col`; label ringkas 1 baris, opsionalitas via placeholder) → **R41**; dicek otomatis oleh `design-guard.sh` (#8/#9).
- **Responsive Design** (mobile-first; toolbar/filter menumpuk `flex-col sm:flex-row`; ≥2 kontrol kecil `grid grid-cols-2 sm:flex`; lebar kontrol `w-full sm:w-[Npx]` — dilarang fiks ≥120px tanpa fallback; tabel `overflow-auto`; dialog stack `sm:grid-cols-2`; verifikasi 375/768/≥1280px) → **R42 (Bagian 12)**; dicek sebagian oleh `design-guard.sh` (#10, scope `pages/app`).
- **Responsive Data Table** (WAJIB primitive shadcn `<Table>` yang `overflow-auto`; dilarang `<table>` mentah; jangan `overflow-hidden`/lebar tetap yang memotong scroll; pakai `[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap`) → **R43 (Bagian 12)**; dicek otomatis oleh `design-guard.sh` (#11).
- **Responsive Tabs** (`TabsList` WAJIB `w-full justify-start overflow-x-auto sm:w-auto`; dilarang `flex-wrap`; toolbar tab+aksi `flex-col sm:flex-row`; tombol submit penting di bawah pada mobile) → **R44 (Bagian 12)**; dicek otomatis oleh `design-guard.sh` (#12).
- **Skala Tipografi** (konten `pages/app`: judul/`CardTitle` `text-base font-semibold`, body/label/tabel `text-sm`, helper `text-xs`; dilarang `text-xl/2xl/3xl/4xl`; auth & katalog design-system dikecualikan) → **R45 (Bagian 12)**; dicek otomatis oleh `design-guard.sh` (#13).
- **Kolom Tabel Sortable** (setiap header konten wajib bisa di-sort; kecuali checkbox/Actions/Detail & kolom kontrol/switch/select; server-side untuk tabel berpaginasi; sub-tabel dialog & tabel tree dikecualikan) → **R46 (Bagian 12)**; diverifikasi via review/testing.
- **Tabel & Form Compact List/CRUD** (`.tbl-density` pada `<Table>`; header UPPERCASE; `td` 13px; toolbar `rounded-lg border bg-muted/40 p-2`; search `max-w-[15rem]` + `h-[var(--ctl-h-sm)] text-xs` placeholder "Search..."; pagination `h-/size-[var(--ctl-h-sm)]`; aksi `size-7`; menu **"Detail"+`Eye` paling atas** tanpa "Copy ID"; **tinggi baris seragam** via `td line-height:1.5rem`+`vertical-align:middle`; form `.form-dense` 13px + grid `gap-x-4 gap-y-2`; hapus `CardDescription`) → **R47 (Bagian 12A)**.
- **Pola Halaman Konfigurasi** (halaman pengaturan panjang non-CRUD: **section `Card` bertumpuk** via komponen `Section` reusable, root `space-y-6`; **save bar `flex justify-end border-t pt-4`** `size="sm"` — DILARANG sticky/fixed mengambang; ikuti *layout* referensi tapi teks tetap Inggris & jangan tambah field tak diminta) → **R51 (Bagian 12E)**; SSOT `pages/app/BrandingPage.jsx`.

> Setiap perubahan komponen/pattern **wajib** tunduk pada Versioning (2C.15) & tercatat di Changelog.
