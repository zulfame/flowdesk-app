# DESIGN SYSTEM — Master Registry (Single Source of Truth)

> **File ini adalah acuan pusat & wajib** untuk seluruh Komponen dan Aturan UI di
> project **UI Guidelines**. Dibangun **secara bertahap**: setiap komponen/aturan
> baru dari halaman apa pun **WAJIB didaftarkan di sini**.
>
> Hubungan antar dokumen:
> - `DESIGN_SYSTEM.md` (file ini) → **Master Registry** Komponen + Aturan (global).
> - `DESIGN_SYSTEM_RULES.md` → **kontrak/governance** (larangan improvisasi, prosedur).
> - `ARCHITECTURE.md` → **arsitektur teknis** (stack, folder, routing, state, build, code standards).
> - `LOGIN_PAGE_SPEC.md` → contoh ekstraksi per-halaman (Login) — bersifat historis.
>
> **Prinsip:** 100% shadcn/ui · token-first · monochrome-first · tanpa improvisasi.
> Jika butuh sesuatu di luar registry → lapor & tunggu persetujuan (lihat governance).

Status (lihat lifecycle lengkap di **2C.16**):
- 🧪 **Experimental** — dalam eksplorasi/uji coba, API belum stabil, **jangan** dipakai di produksi.
- ⚪ **Available** — komponen shadcn tersedia, belum dipakai (aktifkan saat perlu).
- ✅ **Established** — sudah dipakai & distandarkan (stabil).
- ⚠️ **Deprecated** — masih ada tapi akan dihapus; sediakan pengganti + migration note.
- 🔒 **Pending** — menunggu keputusan/persetujuan.

---

# BAGIAN 1 — COMPONENT REGISTRY

## 1.0 Panduan Registry (navigasi, konvensi, template)

### 1.0.1 Konvensi Penulisan (glossary — #5)
Untuk konsistensi istilah lintas dokumen:
- **Master Registry** = sebutan baku untuk `DESIGN_SYSTEM.md` (hindari varian "registry pusat"/"central registry").
- **WAJIB** (huruf besar) = penanda aturan **non-negotiable**. "wajib" dalam kalimat biasa bermakna sama; huruf besar hanya untuk penekanan pada aturan inti.
- **Primitive** = komponen shadcn di `src/components/ui/`. **Composite** = komposisi reusable di `src/components/composite/`. **Pattern** = pola gabungan (di 1.2).
- **Status** memakai enum lifecycle 2C.16 (🧪/⚪/✅/⚠️/🔒/🗑️).

### 1.0.2 Category Index (navigasi — #1)
Peta kategori untuk menavigasi registry (konsep tidak dipecah; ini hanya indeks). Komponen dapat masuk >1 kategori.
- **Form & Input:** button, input, label, textarea, checkbox, radio-group, switch, slider, select, native-select, input-otp, form, field, input-group, button-group · composite: **Combobox**, **DatePicker**, PasswordInput, Autocomplete, Phone Input, Input Mask, Rating.
- **Data Display:** table, badge, avatar, typography, chart, empty, skeleton, kbd, item · composite: Data Grid, Data Display (format), Widget, List, Code Block, Markdown · pattern: DataTable layout, Data Display block.
- **Navigation:** sidebar, breadcrumb, navigation-menu, menubar, pagination, tabs, command · pattern: AppSidebar, PageHeader, navigation config (R35).
- **Feedback:** alert, sonner (toast), progress, spinner · composite: Preloader, Placeholder/EmptyState · pattern: Error Boundary, Feedback matrix (2C.17), Empty States (2C.18).
- **Overlay:** dialog, alert-dialog, sheet, drawer, popover, tooltip, hover-card, dropdown-menu, context-menu, collapsible, accordion, carousel, resizable, aspect-ratio, scroll-area, calendar, toggle, toggle-group.
- **AI / Chat kit:** attachment, bubble, marker, message, message-scroller.
- **Layout & Shell:** card, separator, AppLayout, AuthLayout, ChartCard · pattern: Profile/Wizard/Permissions blocks, Form layouts.

### 1.0.3 Template Dokumentasi Komponen (keseragaman — #2/#8)
Standar minimum field untuk **setiap** entri komponen (terapkan bertahap; prioritaskan ✅ Established & yang sering dipakai). Bila field tidak relevan, tulis `—`:
- **Purpose** — untuk apa (1 baris).
- **Status** — enum lifecycle (2C.16).
- **Standard Usage** — pola pakai kanonik / lokasi (rujuk 2C.11 Composition bila ada).
- **Constraint** — batasan wajib (spacing/typography/token/density; rujuk R38/R39/2B).
- **Dependency** — library non-shadcn (rujuk **2C.24** & R37) bila ada.

> Tabel ringkas di 1.1–1.4 tetap dipertahankan sebagai indeks cepat; kolom "Catatan standar"/"Tersusun dari" berperan sebagai Standard Usage + Constraint. Entri baru **WAJIB** mengisi field template ini.


## 1.1 Primitives (shadcn/ui — `src/components/ui/`)
Hanya komponen berikut yang dianggap "ada" di design system. Komposisi boleh,
pembuatan primitive baru **dilarang**.

| Komponen | Status | Catatan standar |
|----------|--------|-----------------|
| button | ✅ | Variant: default, secondary, outline, ghost, link, destructive. Size: sm, default, lg, icon. |
| input | ✅ | `h-8`, `text-sm`; selalu berpasangan dengan `Label`/`FormLabel`. |
| label | ✅ | Selalu `htmlFor` terkait input (via `FormLabel`/`FormControl`). |
| card | ✅ | Struktur **header/body/footer**: `Card > CardHeader(CardTitle, CardDescription) > CardContent > CardFooter`. Header & footer dipisah divider token (`border-b` pada `CardHeader`, `border-t` pada `CardFooter`). Dipakai di Login, pembungkus tiap chart (`ChartCard`), & pembungkus Table di halaman Components. |
| checkbox | ✅ | Untuk boolean; dampingi `Label`. |
| separator | ✅ | Pemisah visual (divider) horizontal/vertikal. |
| form | ✅ | Wrapper `react-hook-form`: `Form/FormField/FormItem/FormLabel/FormControl/FormMessage`. |
| sonner (toast) | ✅ | Notifikasi transien; `<Toaster>` dipasang global di `App`. |
| alert | ✅ | Pesan blok. Dipakai form-level (variant `destructive`) untuk error autentikasi di `LoginForm`. |
| scroll-area | ✅ | Area scroll pada nav sidebar. |
| sheet | ✅ | Drawer navigasi mobile (side `left`). |
| breadcrumb | ✅ | Jejak lokasi di header dashboard. |
| avatar | ✅ | Placeholder identitas (header user + footer sidebar). |
| sidebar | ✅ | Komponen sidebar resmi shadcn (diport ke JSX). Dipakai sbg shell dashboard (sidebar-07, collapse-to-icon). Butuh hook `@/hooks/use-mobile` + token `--sidebar-*`. |
| dropdown-menu | ✅ | Menu user di footer sidebar (Account/Settings/Log out). |
| tooltip | ✅ | Tooltip label item nav saat sidebar collapse ke ikon. |
| skeleton | ✅ | Dependensi `SidebarMenuSkeleton` (loading nav). |
| collapsible | ✅ | Submenu sidebar yang bisa dilipat (Sample Blocks, Sample Charts). |
| chart | ✅ | Komponen chart resmi shadcn (diport ke JSX) di atas **recharts@2.15.4**. ChartContainer/ChartTooltip(Content)/ChartLegend(Content)/ChartStyle. |
| table | ✅ | Tabel data resmi shadcn. Dipakai di halaman Components (dibungkus Card). Empty state = baris `colSpan` penuh berteks `No Data Available` (R26). |
| badge | ✅ | Status accent. Dipakai di kolom Status halaman Components (variant `default`=Established, `secondary`=Available, `outline`=Pending). |
| dialog | ✅ | Modal preview komponen di halaman Components (`DialogContent/Header/Body/Title/Description/Footer`). **`DialogBody`** = wrapper body reusable (`px-6 py-4` + `space-y-[var(--field-gap)]`) — WAJIB untuk body form dialog (Update 71). |
| accordion | ✅ | Didemokan di preview dialog halaman Components (single, collapsible). |
| alert-dialog | ✅ | Didemokan di preview dialog halaman Components (nested trigger + confirm/cancel). |
| aspect-ratio | ✅ | Didemokan di preview dialog halaman Components (rasio 16/9 + surface `bg-muted`). |
| calendar, carousel, command, context-menu, drawer, hover-card, input-otp, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, select, slider, switch, tabs, textarea, toggle, toggle-group | ✅ | Established — semua punya preview live di halaman Base Components. |
| spinner, kbd, empty, button-group, input-group, field, item, native-select, typography | ✅ | Diport & Established (Update 23) dengan preview live. |
| attachment, bubble, marker, message | ✅ | Chat/AI kit presentational (100% Tailwind + cva, pola shadcn base). Established dengan preview (Update 24). |
| message-scroller | ✅ | Versi **styled** (tanpa engine `@shadcn/react`): Context lokal + auto-scroll-to-bottom + tombol jump-to-latest. Established (Update 25). |

> **Base Components: 61/61 Established.** Semua primitive shadcn/ui resmi kini diport ke `src/components/ui/` dan memiliki preview live.

Ikon: **lucide-react** — **WAJIB** & satu-satunya sumber ikon (`h-4 w-4` default, `aria-hidden` bila dekoratif). Emoji / SVG kustom / library ikon lain dilarang (Aturan R09).

## 1.2 Compositions / Patterns (dibangun dari primitives)

| Pattern | Status | Tersusun dari | Lokasi | Reusable untuk |
|---------|--------|---------------|--------|----------------|
| AuthLayout | ✅ | grid + aside/main + Separator + ikon + grid overlay | `components/layout/AuthLayout.jsx` | Semua halaman auth (login, forgot, reset) |
| LoginForm | ✅ | Form, Input, Label, Checkbox, Button, sonner | `components/auth/LoginForm.jsx` | Halaman login |
| Brand/Logo lockup | ✅ | ikon `lucide` dalam kotak `rounded-md` + teks nama | `AuthLayout` | Header/sidebar/auth |
| Password field + toggle | ✅ | Input + Button(ghost) + Eye/EyeOff | `LoginForm` | Form yang butuh password |
| Loading button | ✅ | Button + `Loader2 animate-spin` + disabled | `LoginForm` | Semua aksi async |
| Form-level error alert | ✅ | Alert (destructive) + AlertTitle + AlertDescription + AlertCircle | `LoginForm` | Semua form (error global) |
| AppLayout (dashboard shell) | ✅ | SidebarProvider + Sidebar (collapse-to-icon) + SidebarInset + header (SidebarTrigger + Breadcrumb) + Outlet | `components/layout/AppLayout.jsx` | Semua halaman aplikasi (dashboard) |
| AppSidebar (sidebar-07) | ✅ | Sidebar system: **area-switcher** header (Application / Design System — dropdown, area aktif diturunkan dari rute) + nav group per-area + user dropdown footer + rail | `components/layout/AppSidebar.jsx` | Sidebar desktop (icon-collapsible) + drawer mobile |
| PageHeader | ✅ | `h1` + deskripsi muted + slot actions | `components/layout/PageHeader.jsx` | Header setiap halaman |
| PlaceholderPage | ✅ | PageHeader + judul dari nav config (via `getBreadcrumb`) | `pages/PlaceholderPage.jsx` | Halaman blank reusable |
| ChartCard | ✅ | Card + header + ChartContainer (anak = 1 elemen chart Recharts) | `components/charts/ChartCard.jsx` | Semua halaman chart |
| Background grid decoration | ✅ | overlay `aria-hidden` + radial mask (token) | `AuthLayout` | Panel/hero gelap |
| Data Table (card-wrapped) + empty state | ✅ | Card + Table (Header/Body/Row/Head/Cell) + kolom No/Name/Action + tombol preview ikon (Eye) + fallback empty-state `colSpan` "No Data Available" | `pages/ComponentsPage.jsx` | Semua tampilan tabular; kolom action `text-right` (ghost icon button) |
| Component Preview Dialog | ✅ | Dialog + judul (nama + Badge status) + body preview live (`config/componentPreviews.jsx`); fallback "not available"/"not implemented" | `pages/ComponentsPage.jsx` + `config/componentPreviews.jsx` | Preview komponen dari tabel (tombol Eye) |
| Composite Components Table + Dialog | ✅ | Card + Table (kolom No/Name/**Dependency**/Status/Action) + Dialog preview live (`config/compositePreviews.jsx`) | `pages/CompositeComponentsPage.jsx` + `config/compositePreviews.jsx` | Katalog composite (kini digabung ke halaman Components — lihat Update 27) |
| DataTable layout | ✅ | **CRUD lengkap (state lokal)**: **Create/Update** via `UserFormDialog` (Dialog header/body/footer + rhf+zod: name/email/role/status) dari tombol **Add** (CardHeader) & row action **Edit** (prefilled); **Delete** (baris) & **Bulk Delete** (baris terpilih, tombol "Delete (n)" di toolbar) via `AlertDialog` konfirmasi; toast tiap aksi. **Toolbar** (global search + Faceted Filter Role/Status + Density) · Table row-selection (Checkbox+select-all, `getRowId`), **SortableHeader** full-cell (`aria-sort`), `thead bg-muted/50`, status Badge, row actions ber-ikon (View/Edit/Delete) · **Empty state 2 mode** (generik `No Data Available`; **filter-aware** "No users match your filters." + tombol **Clear filters** saat filter/search aktif) · **Footer** rows-per-page (8/16/24) + "{first}–{last} of {total}" + Page x/y. Density persist `localStorage`. Dep `@tanstack/react-table` (R37, `meta` untuk handler CRUD). | `pages/layouts/DataTableLayoutPage.jsx` | Halaman list/tabel data — contoh CRUD enterprise (rujuk 2C.7) |
| Form Elements gallery | ✅ | Grid Card per elemen form (Input/Textarea/Select/Native Select/Combobox/Date Picker/Checkbox/Radio Group/Switch/Slider/Input OTP) + Label, plus **Dialog Form** (contoh `AddUserDialog`: Dialog header/body/footer + rhf+zod validasi — Full name/Email/Role) | `pages/layouts/FormElementsPage.jsx` | Referensi elemen form |
| Form Layout (sample forms) | ✅ | 2 grid berdasarkan ukuran: form kecil (**Login, Reset Password, OTP Verification**) di `md:grid-cols-2 lg:grid-cols-3` + form besar (**Register, Change Password, Contact**) di `md:grid-cols-2` (keduanya `items-start`). Tiap card = header/body/footer + `react-hook-form`+`zod` | `pages/layouts/FormLayoutPage.jsx` | Kumpulan sample form dasar |
| Profile Block | ✅ | **Profile & Settings** form: Avatar + Change photo, grid name/email, Role Select, Bio Textarea, preferensi Switch ber-border, footer Cancel/Save dgn **unsaved-changes** (Save/Cancel disabled sampai `formState.isDirty`, indikator "Unsaved changes", `form.reset(data)` reset baseline saat save) | `pages/blocks/ProfileBlockPage.jsx` | Halaman profil/pengaturan |
| Wizard Block | ✅ | **Multi-step Wizard**: `StepIndicator` + 3 langkah Account/Profile/Review, validasi per-langkah via `form.trigger`, Back/Next/Finish | `pages/blocks/WizardBlockPage.jsx` | Alur multi-langkah |
| Design Tokens gallery | ✅ | PageHeader + Layer 1 swatch primitive (neutral/red/chart, nilai HSL mentah) + Layer 2 swatch semantic (badge L/D mapping, `hsl(var(--token))` remap live per theme) | `pages/DesignTokensPage.jsx` | Dokumentasi & referensi token |
| Theme system (Light/Dark/System) | ✅ | `ThemeProvider` (context + localStorage `ui-theme` + `matchMedia`) + `ModeToggle` (DropdownMenu Sun/Moon/Monitor) di header | `components/theme-provider.jsx` + `components/mode-toggle.jsx` | Seluruh aplikasi |
| Density system (Dense/Comfortable) | ✅ | `DensityProvider` (context + localStorage `ui-density`, set `data-density` di `<html>`) + `DensityToggle` (DropdownMenuRadioGroup, gaya outline "Density", ikon `Rows3`). CSS var `--ctl-h`/`--ctl-h-sm`/`--ctl-h-lg`/`--field-gap`/`--item-gap` di `index.css` di-remap `:root[data-density="comfortable"]`; primitives (input/select/native-select/button) & form-stack memakai var. Default **Dense** | `components/density-provider.jsx` + `components/density-toggle.jsx` | Seluruh aplikasi (2B.21/2C.4) |
| Application CMS — Offices | ✅ | **CRUD nyata** (FastAPI+MongoDB): Card + DataTable (search, sortable, selection+bulk delete, footer pagination, no-wrap+scroll-x), `OfficeFormDialog` (`DialogBody`, rhf+zod, inline 409, kirim `null` untuk clear opsional), Delete destructive (red), state loading/error/empty via `EmptyState`. Rute `/offices` | `pages/app/OfficesPage.jsx` + `lib/api.js` | Master data kantor |
| Application CMS — Roles/Jabatan | ✅ | **CRUD nyata** pohon `parent_id` (1 atasan langsung; rantai atasan otomatis): Card + DataTable tree-indent (chevron per depth), kolom Direct superior + Superiors chain `›`, dialog pemilih atasan **Combobox (searchable)** yang **mengecualikan diri+keturunan** (anti-siklus), Delete destructive (red) + promosi anak saat delete. Tombol **Structure** membuka Dialog **org-chart** (pohon top-down CSS murni monokrom, `buildOrgTree` iteratif tanpa komponen JSX rekursif, scroll-x). Rute `/roles` | `pages/app/RolesPage.jsx` | Master data jabatan/role |
| Empty States block | ✅ | Grid Card per jenis + composite **`EmptyState`** (6 varian: no-data/no-results/first-time/forbidden/offline/error, ikon lucide + aksi opsional) — implementasi konkret Registry **2C.18** | `pages/blocks/EmptyStatesBlockPage.jsx` + `components/composite/EmptyState.jsx` | Semua kondisi kosong/gagal/terlarang |
| Permissions block | ✅ | `ToggleGroup` role (Admin/Member/Viewer) mengendalikan 4 kartu strategi: **Hide** (render kondisional), **Disable** (`disabled`+Tooltip alasan), **Read-only** (`readOnly`+`bg-muted/50`), **Forbidden** (`EmptyState` variant `forbidden`) — implementasi konkret **2C.21** | `pages/blocks/PermissionsBlockPage.jsx` | Halaman/section ber-permission |
| Data Display block | ✅ | Card + Table nilai terformat via util `lib/format.js` (Number/Currency/Percentage/Date/Relative + Status Badge); angka `text-right tabular-nums`, negatif `text-destructive`, nil → `—` — implementasi konkret **2C.20** | `pages/blocks/DataDisplayBlockPage.jsx` + `lib/format.js` | Tampilan tabular/nilai terformat |
| Error Boundary (global) | ✅ | React class `ErrorBoundary` (`getDerivedStateFromError`/`componentDidCatch`) membungkus seluruh app di `App.js`; fallback = `EmptyState` variant `error` + tombol **Reload**; `componentDidCatch` = titik integrasi pelaporan error masa depan (Sentry, dll) | `components/ErrorBoundary.jsx` | Exception handling seluruh aplikasi |

## 1.3 Elemen Konten (placeholder generik)

| Elemen | Standar |
|--------|---------|
| Nama Aplikasi | `UI Guidelines` (placeholder) |
| Judul / Deskripsi | `CardTitle` + `CardDescription` (muted) |
| Footer | teks `text-xs text-muted-foreground` |
| Pesan validasi | `FormMessage` (`text-destructive`) |

## 1.4 Composite Components (`src/components/composite/`)

Pola pakai-ulang yang **disusun dari primitives Bagian 1.1** (+ dependency yang diizinkan R37).
Bukan primitive baru. Terdaftar & dipreview di halaman **"Composite Component"**. Semua **✅ Established**,
konten generik, monochrome-first.

| Composite | Tersusun dari (base) | Dependency (R37) | File |
|-----------|----------------------|------------------|------|
| Autocomplete | Command + Popover + Button | — | `Autocomplete.jsx` |
| Rating | (Tailwind + ikon `Star`) | — | `Rating.jsx` |
| Stepper | Button + ikon `Check`; ekspor **`StepIndicator`** (indikator langkah terkontrol: props `steps`/`current`) untuk dipakai ulang di wizard | — | `Stepper.jsx` |
| List | Item(+Group) + Separator + Button | — | `ListView.jsx` |
| Cookie Banner | Card + Button + ikon | — | `CookieBanner.jsx` |
| Preloader | Spinner + Skeleton + Button | — | `Preloader.jsx` |
| Widget | Card + Badge + ikon | — | `Widget.jsx` |
| Placeholder | Empty (+Header/Media/Title/Description/Content) + Button | — | `PlaceholderState.jsx` |
| Data Grid | Table + Input + Badge + Button (filter/sort/pagination) | `@tanstack/react-table` | `DataGrid.jsx` |
| Code Block | Button + ikon (Copy/Check) | `react-syntax-highlighter` (Prism `oneLight`) | `CodeBlock.jsx` |
| Markdown | (child-selector styling) | `react-markdown` + `remark-gfm` | `MarkdownRenderer.jsx` |
| Phone Input | Button + Popover + Command + Input + ikon (bendera di daftar) | `react-phone-number-input` (+ `/flags`) | `PhoneInputField.jsx` |
| Input Mask | Label (+ input bermask) | `react-imask` | `MaskedInput.jsx` |
| Kanban | Card + Badge + ikon (drag) | `@dnd-kit/core` + `sortable` + `utilities` | `KanbanBoard.jsx` |
| Sortable | (Tailwind + ikon `GripVertical`) | `@dnd-kit/sortable` + `core` + `utilities` | `SortableList.jsx` |
| Password Input | Input + Button (ghost icon) + state | — | `PasswordInput.jsx` |
| Combobox | Popover + Command (search) + Button trigger | — (Command/Popover) | `Combobox.jsx` |
| Date Picker | Popover + Calendar (single) + Button trigger | `react-day-picker` (via `ui/calendar`) | `DatePicker.jsx` |
| Empty State | Empty (+Header/Media/Title/Description/Content) + ikon lucide (+Button aksi) | — | `EmptyState.jsx` |

> **Aturan composite:** (a) tiap dependency HANYA dipakai oleh composite terkait — jangan menyebar;
> (b) tidak boleh membuat primitive UI baru — komposisi saja; (c) konten wajib placeholder generik (R31).

---

# BAGIAN 2 — RULE REGISTRY (Global, berlaku semua halaman)

| # | Aturan | Standar wajib (token/utility) |
|---|--------|-------------------------------|
| R01 | **Layout** | HTML semantik (`main/aside/section/nav`) + Flex/Grid. Kontainer form `max-w-md`/sesuai konteks. |
| R02 | **Grid** | Tailwind grid (`grid`, `grid-cols-*`, `gap-*`). Dekorasi grid berbasis token, low-opacity. |
| R03 | **Spacing** | Skala 4px shadcn (`space-y-*`, `gap-*`, `p-*`). Compact/enterprise, hindari whitespace berlebih. Ikuti **Spacing System resmi** (lihat **BAGIAN 2B**) untuk aturan lengkap (margin/padding/gap, section/component/form/card/table/modal/drawer/sidebar/header/list/nav/button/input/icon, container width, responsive, density, do's & don'ts). Nilai `px` arbitrer dilarang kecuali konstanta layout terdokumentasi. |
| R04 | **Typography** | **Font wajib: Geist** (primary) · fallback `Inter, system-ui, sans-serif`. Diimpor di `index.css`. Weight yang dipakai **400/500/600** (700 tersedia, jarang). Ikuti **Skala Tipografi resmi** (lihat **BAGIAN 2A**) untuk ukuran H1→terkecil & aturan `leading`/`tracking`. Warna teks via token semantik (`text-foreground`/`text-muted-foreground`). Dilarang font lain / ukuran di luar skala tanpa persetujuan. |
| R05 | **Color** | **Token only** (`bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `text-destructive`, dst). Termasuk keluarga token **`--sidebar-*`** (sidebar) & **`--chart-1..5`** (palet kategori chart). Dilarang warna hardcode/hex. |
| R06 | **Border** | `border-border` (default), `border-input` (field). Tanpa nilai warna literal. |
| R07 | **Radius** | `--radius: 0.5rem` → `rounded-sm/md/lg/xl` (turunan token). |
| R08 | **Shadow** | Shadow bawaan shadcn (`shadow`, `shadow-sm`). Tanpa shadow kustom. |
| R09 | **Icon** | **Wajib `lucide-react`** (satu-satunya sumber ikon). Ukuran default `h-4 w-4`; `aria-hidden` bila dekoratif. Dilarang emoji, SVG inline kustom, atau library ikon lain tanpa persetujuan. |
| R10 | **Responsive** | Mobile-first; breakpoint `sm/md/lg/xl`. Semua halaman wajib responsif. |
| R11 | **Focus State** | `focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none` (bawaan shadcn). |
| R12 | **Hover State** | Pakai hover bawaan varian (`hover:bg-primary/90`, `hover:bg-accent`, `hover:underline`). |
| R13 | **Active State** | Bawaan shadcn via `transition-colors`. Tanpa efek berlebihan. |
| R14 | **Disabled State** | `disabled:opacity-50 disabled:pointer-events-none`. |
| R15 | **Validation State** | `zod` + `react-hook-form` (`zodResolver`); pesan via `FormMessage`; `aria-invalid`. |
| R16 | **Loading State** | `Loader2 animate-spin` + teks status + kontrol disabled selama proses. |
| R17 | **Accessibility** | Label terkait input; `aria-*` untuk kontrol ikon; `aria-hidden` ikon dekoratif; kontras WCAG AA; `<form noValidate>` bila validasi custom. |
| R18 | **Animation / Motion** | Hanya fungsional (`animate-spin`, `transition-colors`). Tanpa animasi dekoratif berat. |
| R19 | **Alignment** | Flex utilities (`items-center`, `justify-between/center`). Konsisten antar elemen. |
| R20 | **Z-Index** | Konten `relative z-10` di atas overlay dekoratif. Hindari z-index acak. |
| R21 | **Overflow** | `overflow-hidden` pada kontainer berdekorasi/berpotensi meluber. |
| R22 | **Form Behavior** | `react-hook-form` (`mode: "onSubmit"`), nilai terkontrol, submit via `handleSubmit`. |
| R23 | **Keyboard Navigation** | Kontrol native (Tab/Shift+Tab); Enter submit; tombol non-submit `type="button"`. |
| R24 | **Error Handling** | Pesan dari schema; feedback aksi via `sonner`/`Alert`. |
| R25 | **Placeholder** | Teks netral/generik (`name@example.com`, `Search...`). |
| R26 | **Empty State** | `Skeleton` untuk loading; teks `No Data Available` untuk kosong. Placeholder surface memakai `bg-muted/50 rounded-xl` (blok dekoratif). |
| R27 | **Branding** | Logo + nama generik, monokrom; tanpa konten bisnis. |
| R28 | **Theme (Light/Dark)** | **Arsitektur token 2-layer** di `index.css`: **Layer 1 (primitives)** = skala netral mentah `--neutral-0..950` + `--red-500/900` + `--hue-chart-1..5` (theme-independent, HSL mentah, **jangan dikonsumsi langsung**); **Layer 2 (semantic)** = `--background/--foreground/--primary/...` yang **me-reference** Layer 1 via `var()` (mis. `--background: var(--neutral-0)`). Light di `:root`, Dark di `.dark` **hanya me-remap** semantic → primitive. Toggle **Light/Dark/System** aktif via `ThemeProvider` (`components/theme-provider.jsx`, persist `localStorage` key `ui-theme`, "system" tracking `matchMedia` live) + `ModeToggle` (`components/mode-toggle.jsx`) di header kanan atas. Dilarang menambah warna hardcode; komponen wajib pakai token semantic (R05). |
| R29 | **Consistency** | Semua nilai dari token/komponen. Tanpa magic number/warna. |
| R30 | **Reusability** | Utamakan komposisi reusable; pisahkan schema/validasi; hindari duplikasi. |
| R31 | **Content Rule** | Konten generik. Dilarang asumsi nama app/perusahaan/industri/istilah bisnis. |
| R32 | **No Improvisation** | Jika di luar registry → lapor (format governance) & tunggu persetujuan. |
| R33 | **Data Visualization / Charts** | Pakai komponen `chart` resmi + **recharts@2.15.4** (pinned). Warna via `config` (`{ key: { label, color } }`) & `var(--color-KEY)` yang bersumber dari `--chart-1..5`. Elemen chart **wajib anak langsung** `ChartContainer` (jangan dibungkus komponen). Ukuran: `aspect-video` (default), `aspect-square w-full max-w-[320px]` (pie/radar/radial). Warna per-slice via `<Cell>`. **`<Bar>` set `isAnimationActive={false}`** (StrictMode membuat animasi bar tersangkut di 0). Tooltip/legend via `ChartTooltip(Content)`/`ChartLegend(Content)`. Data = placeholder generik. |
| R34 | **App Shell & Scroll** | Shell dashboard: sidebar + header **fixed/diam**. Layout dikunci `h-svh`; hanya area konten (`overflow-y-auto`) yang scroll. Header konten `h-[65px]` agar garis bawahnya sejajar dengan header sidebar (auto 64px + 1px border) → satu garis menerus. Layering z-index konsisten (`z-10`). |
| R35 | **Navigation** | Config nav **terpusat** (`config/navigation.js`). Struktur **AREA** (`navAreas`: Application / Design System) ditampilkan via **area-switcher** di header sidebar (dropdown; area aktif **diturunkan dari rute** — `getAreaIdForPath`; memilih area → navigasi ke `getAreaDefaultPath`). Tiap area punya section ber-label, submenu **collapsible** (`children`), active-state (exact/prefix), breadcrumb trail diturunkan dari config (`getBreadcrumb`, menyertakan label area). `navSections` tetap diekspor (derivatif) untuk preview Sidebar block. Sidebar collapse-to-icon + tooltip; shortcut **Ctrl/Cmd+B**. Link internal via React Router. |
| R36 | **Routing** | React Router: layout route induk (`AppLayout` + `<Outlet />`) membungkus halaman; halaman auth standalone (`/login`); redirect root & fallback (`*`) terdefinisi; login sukses → `/`. Rute chart per-tipe → halaman masing-masing. |
| R37 | **Dependency Exception** | Library non-shadcn yang **diizinkan** (dependency resmi/pendukung). **Global:** **lucide-react** (ikon, R09), **recharts@2.15.4** (chart, R33). **Terikat komponen (hanya boleh dipakai composite terkait di 1.4):** `@tanstack/react-table` (Data Table & Data Grid), `react-syntax-highlighter` (Code Block), `react-markdown`+`remark-gfm` (Markdown), `react-phone-number-input` (Phone Input), `react-imask` (Input Mask), `@dnd-kit/core`+`@dnd-kit/sortable`+`@dnd-kit/utilities` (Kanban & Sortable). Setiap dependency **tidak boleh menyebar** ke luar komponennya. Di luar daftar ini, library UI/komponen lain **dilarang** tanpa persetujuan. |
| R38 | **Component Modification Invariants** (Non-Negotiable) | Karena komponen **reusable** (satu sumber → perubahan menyebar ke semua konsumen), setiap modifikasi pada `src/components/ui/` atau `src/components/composite/` **WAJIB** menjaga invarian berikut; melanggarnya = **regresi**: (a) **Compact/Spacing (2B)** — dilarang menambah whitespace; padding/margin tetap kelipatan-4 & seringkas mungkin; jangan menukar kepadatan demi tampilan. (b) **Typography (2A)** — skala ukuran & weight tidak berubah. (c) **Warna = token saja (R06/R29)** — gambar referensi hanya acuan **struktur/layout**, **bukan** warna; tetap monochrome, tanpa warna hardcode. (d) **Density** — ukuran kontrol (tombol/input) tetap compact. (e) **Verifikasi dampak menyeluruh** — sebelum menyatakan selesai, cek minimal 2–3 halaman konsumen (mis. Login, Components, Sample Layout). |
| R39 | **Compact Density — Semua UI (Non-Negotiable)** | Memperluas R03/R38 agar berlaku **tidak hanya saat memodifikasi komponen**, tetapi juga saat **membuat halaman/blok/section baru**. Setiap UI baru WAJIB compact sejak awal. **Tabel keputusan `space-y` (WAJIB, lihat 2B.5):** **root halaman** (`<div data-testid="*-page">`) = `space-y-6`; **antar-section besar** = `space-y-6`; **di dalam `CardContent`** = `space-y-3` (form/section, Dense) atau `space-y-4` (umum) — **`space-y-6` DILARANG di dalam Card**; **grup field/rapat** = `space-y-2`/`space-y-3`. **Batas density lain:** avatar profil `h-12 w-12` (jangan `h-16`), grid form `gap-4` (jangan `gap-5`), Card section `px-6 py-4`. **Sebelum finish**, jalankan **guard** `docs/design-guard.sh` (2C.14) + **Checklist Compact** (`DESIGN_SYSTEM_RULES.md` §7). Nilai `px` arbitrer & whitespace berlebih = **regresi**. |
| R40 | **Application CRUD Page Pattern (Non-Negotiable untuk halaman CMS)** | Setiap halaman list/CRUD di area **Application** (`pages/app/*`) WAJIB mengikuti pola konsumen design system yang sudah terbukti (Offices/Roles, meniru `DataTableLayoutPage`): **(1) Card wrapper** — `CardHeader` (`flex flex-row items-center justify-between space-y-0`) berisi `CardTitle` + tombol **Add** (kanan); `CardContent space-y-4` memuat toolbar → tabel → footer (JANGAN pakai `PageHeader` besar untuk list yang sudah jelas dari breadcrumb). **(2) Toolbar** — Search (kiri) + kontrol (kanan, mis. `DensityToggle`/filter). **(3) Tabel** `@tanstack/react-table` — selection (Checkbox+select-all, `getRowId`), sortable header bila perlu, `[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap` (no-wrap + scroll-x, JANGAN truncate teks data). **(4) Form dialog** — `Dialog > Form > form > DialogHeader > **DialogBody** > DialogFooter` (WAJIB `DialogBody`, 2B.10), `react-hook-form`+`zod`, kirim `null` untuk mengosongkan field opsional (backend `exclude_unset`). Untuk field pilihan **ber-opsi banyak** (mis. parent/relasi), gunakan composite **`Combobox`** (searchable), bukan `Select` biasa. **(5) Destructive** — aksi/tombol **Delete WAJIB merah**: row-action `text-destructive focus:text-destructive`, konfirmasi via `AlertDialog` dgn tombol `bg-destructive text-destructive-foreground hover:bg-destructive/90`. **(6) States** — loading (Skeleton)/error/empty/first-time/filtered via composite `EmptyState`. **(7) Data** — via `lib/api.js` (axios `/api`); model backend & index unik terdokumentasi di `ARCHITECTURE.md` §11. Guard + checklist §7 tetap berlaku. |
| R41 | **Form Field Grid Pattern (Non-Negotiable untuk form)** | Field di dalam form dialog WAJIB tertata rapi & **sejajar**: **(1) Layout** — field utama/teks panjang (mis. `Name`) **full-width**; field pendek yang berkaitan dikelompokkan berpasangan dalam baris **`grid grid-cols-1 sm:grid-cols-2 items-start gap-4`** (hindari tumpukan 1 kolom yang panjang & tidak seimbang). **(2) FormItem konsisten** — pakai **`<FormItem>` polos untuk SEMUA field** (composite `Combobox` sudah block-level & `w-full`, jadi TIDAK perlu `flex flex-col`). **DILARANG mencampur** `<FormItem className="flex flex-col">` dengan `<FormItem>` di baris grid yang sama → menyebabkan tinggi label/kontrol tidak sinkron sehingga kontrol **tidak sejajar** (akar bug Update 76). **(3) Label** — ringkas & **1 baris** (mis. "Direct superior", bukan "Direct superior (Optional)"); opsionalitas cukup lewat **placeholder** ("(Optional)"/"None"). Dicek otomatis oleh `design-guard.sh` (#8 `flex flex-col` di FormItem, #9 label verbose "(Optional)"). |

---

# BAGIAN 2A — TYPOGRAPHY SCALE (resmi, turunan R04)

**Font:** Geist (primary) · fallback `Inter, system-ui, sans-serif`.
**Weight:** 400 (body) · 500 (label/aktif) · 600 (heading). 700 tersedia tapi jarang.
**Skala ukuran = subset Tailwind:** `12 / 14 / 16 / 24 / 30 / 36 px` (sengaja ringkas, gaya enterprise — hindari display size besar tanpa persetujuan).

## 2A.1 Skala ukuran (H1 → terkecil)

| Peran | Kelas Tailwind | px | Weight | Line-height | Tracking |
|-------|----------------|----|--------|-------------|----------|
| **H1 — judul halaman** (`PageHeader`) | `text-2xl font-semibold tracking-tight` | 24 | 600 | `leading-tight` | `tracking-tight` |
| **H1 — hero / auth** (`AuthLayout`) | `text-3xl xl:text-4xl font-semibold leading-tight tracking-tight` | 30→36 | 600 | `leading-tight` | `tracking-tight` |
| **H2 — judul Card besar** (`CardTitle`, auth) | `text-2xl` | 24 | 600 | tight | normal |
| **H3 — judul section / Card kecil** | `text-base font-semibold` | 16 | 600 | normal | normal |
| **Body — UI text default** | `text-sm` | 14 | 400 | `leading-normal` | normal |
| **Body — prosa / deskripsi panjang** | `text-base leading-relaxed` | 16 | 400 | `leading-relaxed` | normal |
| **Label form / meta** | `text-sm font-medium` | 14 | 500 | normal | normal |
| **Deskripsi muted** (`CardDescription`, desc `PageHeader`) | `text-sm text-muted-foreground` | 14 | 400 | normal | normal |
| **Terkecil — caption / footer / hint** | `text-xs text-muted-foreground` | 12 | 400 | normal | normal |

> Belum ada penggunaan `text-lg/xl/5xl/6xl` (sengaja). Butuh ukuran di luar skala → lapor (R32).

## 2A.2 Line-spacing (leading)

- **Heading (H1–H3):** `leading-tight` (≈1.25–1.3) — judul padat & tegas.
- **Body pendek / UI text:** default `leading-normal` (≈1.5).
- **Paragraf/prosa multi-baris:** `leading-relaxed` (≈1.625).
- **Dilarang** `leading-loose` tanpa alasan (terlalu renggang untuk enterprise).
- **`tracking-tight`** hanya untuk heading; body selalu tracking normal.

---

# BAGIAN 2B — SPACING SYSTEM (resmi, turunan R03)

> Basis: **skala 4px shadcn/Tailwind** (`1`=4px, `2`=8px, `4`=16px, `6`=24px, dst).
> Gaya sistem = **compact/enterprise**. Semua komponen (termasuk preview di halaman
> Components) **wajib** mengikuti nilai di bawah. Angka `px` arbitrer **dilarang**
> kecuali konstanta layout terdokumentasi (`h-[65px]`, lebar sidebar `16rem/3rem/18rem`).

**1. Spacing Scale** — Langkah resmi: `0, 0.5(2px), 1(4px), 1.5(6px), 2(8px), 2.5(10px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 14(56px)`. Utamakan langkah genap. Tanpa nilai di luar skala.

**2. Margin** — Hindari margin untuk ritme layout; pakai `gap`/`space-y` pada induk. Margin hanya untuk nudge lokal (mis. `-ml-1` pada `SidebarTrigger`, `mt-6` catatan auth). Jangan campur margin + gap untuk ritme yang sama.

**3. Padding** — Kontainer konten `p-4` → `lg:p-6`. Card & Dialog memakai section `px-6 py-4` (header/body/footer; lihat 2B.8 & 2B.10). Sheet `p-6`. Panel auth `p-10` → `xl:p-14`. Field kecil ikut default komponen (jangan tambah padding manual).

**4. Gap (Flex & Grid)** — Klaster kontrol inline `gap-2` (ikon+teks, header). Grid kartu/section `gap-4`. Internal Dialog/Sheet `gap-4`. Grup padat `gap-1` (menu sidebar).

**5. Section Spacing** — Ritme antar-section di root halaman **`space-y-6`** (24px) — wajib di setiap page root. Hero/auth boleh `space-y-8`.

> **TABEL KEPUTUSAN `space-y` (SSOT — hafalkan sebelum menulis layout, R39):**
>
> | Konteks | Kelas WAJIB | Contoh |
> |---|---|---|
> | Root halaman (`<div data-testid="*-page">`) | **`space-y-6`** | wrapper terluar setiap page |
> | Antar-section besar di root | **`space-y-6`** | section "Layer 1" vs "Layer 2" |
> | **Isi `CardContent`** (form/section) | **`space-y-3`** | field-stack di dalam Card (Dense) |
> | **Isi `CardContent`** (umum/non-form) | **`space-y-4`** | blok konten di dalam Card |
> | Grup terkait / rapat | **`space-y-3`** / **`space-y-2`** | baris preferensi, label+control |
>
> ❌ **`space-y-6` DILARANG di dalam `CardContent`/`CardHeader`/`CardFooter`** — itu ritme **root halaman**, bukan isi Card. Salah-pakai ini = penyebab UI "tidak compact" (insiden Update 45–46).

**6. Component Spacing** — Tumpukan komponen terkait `space-y-4`; grup rapat `space-y-2`.

**7. Form Spacing (Dense — default)** — `<form>` antar-field **`space-y-3`**; `FormItem` internal `space-y-1.5` (label→control→message); baris checkbox `gap-2`.

**8. Card Spacing** — `CardHeader` `px-6 py-4 space-y-1.5` + `border-b` (pemisah header↔body); `CardContent` `px-6 py-4`; `CardFooter` `px-6 py-4` + `border-t` (pemisah body↔footer). Ritme vertikal `py-4` (16px) menjaga **compact**; horizontal `px-6` (24px). Antar-kartu di grid `gap-4`. Jangan bungkus padding ganda di dalam Card. **INVARIAN (wajib):** stacking **di dalam `CardContent`** memakai **`space-y-3`** (form/section, Dense) atau **`space-y-4`** (umum) — **`space-y-6` DILARANG di dalam Card**. `space-y-6` **hanya** untuk **root halaman** (2B.5), **bukan** isi Card. Berlaku juga untuk **halaman/blok baru** (bukan hanya modifikasi komponen R38).

**9. Table Spacing** — `TableHead` `h-10 px-2`; `TableCell` `p-2`; empty-state cell `h-24 text-center`; bungkus tabel `rounded-md border` (padding milik sel, bukan wrapper).

**10. Modal (Dialog & AlertDialog) Spacing** — `DialogContent`/`AlertDialogContent` `p-0 gap-0 max-w-lg` (pola header/body/footer, Update 31 & 54); `DialogHeader`/`AlertDialogHeader` `border-b px-6 py-4 space-y-1.5` (hanya **judul**); **body form Dialog WAJIB pakai `<DialogBody>`** (reusable — `px-6 py-4` + `space-y-[var(--field-gap)]`, density-aware; **jangan hand-roll `<div>`** karena `DialogContent` `p-0` sehingga lupa `px-6` = form melenceng/berantakan, lihat Update 71); untuk AlertDialog konfirmasi, bungkus body `px-6 py-4` dan tempatkan **`AlertDialogDescription` di body** (bukan di dalam header) agar 3 seksi terlihat; `DialogFooter`/`AlertDialogFooter` `border-t px-6 py-4 gap-2 sm:justify-end`; tombol close `right-4 top-4`. **Kedua primitive wajib konsisten** (jangan salah satu saja). **Susunan wajib:** `DialogContent > Form > form > DialogHeader > DialogBody > DialogFooter`.

**11. Drawer (Sheet) Spacing** — `SheetContent` `p-6 gap-4`; header `space-y-2`; footer `sm:space-x-2`; close `right-4 top-4`.

**12. Sidebar Spacing** — Lebar `16rem` (expanded) / `3rem` (icon) / `18rem` (mobile). Grup `p-2`, menu `gap-1`, sub-item indent via `SidebarMenuSub`, header/footer `p-2`.

**13. Header & Toolbar Spacing** — App header `h-[65px] px-4 gap-2`; preview header `h-14 px-4 gap-2`; separator vertikal `h-4` + `mr-1/mx-1`.

**14. List Item Spacing** — Item daftar/menu tumpuk `gap-1`; internal item `gap-2` (ikon+label); padding vertikal ikut default komponen.

**15. Navigation Spacing** — `SidebarGroup` `p-2` + `SidebarGroupLabel`; breadcrumb antar-item `gap-1.5` (default `BreadcrumbList`); crumb antara `hidden md:block`.

**16. Button Internal Spacing (Dense)** — default `h-8 px-4 py-2 gap-2`; `sm` `h-7 px-3`; `lg` `h-9 px-8`; `icon` `h-8 w-8` (persegi, tanpa `px`). Tombol ikon di tabel `h-8 w-8`.

**17. Input Internal Spacing** — `h-8 px-3 py-1 text-sm`; input dgn ikon trailing `pr-10`; tombol dalam field `absolute right-1`.

**18. Icon Spacing** — Ukuran default `h-4 w-4`; jarak ke teks lewat `gap-2` induk (jangan `ml-*` manual); dekoratif `aria-hidden`.

**19. Content Width & Container Padding** — Area konten `p-4 lg:p-6`; form auth `max-w-md`; Dialog `max-w-lg`; kotak rasio preview `max-w-sm`. Konten selalu di dalam `SidebarInset` (hindari full-bleed).

**20. Responsive Spacing Rules** — Naikkan padding di `lg` (`p-4`→`lg:p-6`), panel auth `p-10`→`xl:p-14`. Grid `1-col`→`md:grid-cols-*`. Jangan pernah lebih rapat dari basis mobile.

**21. Density (Dense — default)** — Default = **Dense** (kontrol `h-8`, sel tabel `p-2`, `FormItem space-y-1.5`, form field-stack `space-y-3`). Mode "Comfortable" **aktif & runtime-switchable** via `DensityProvider`/`DensityToggle` (CSS var, persist `localStorage`; lihat 2C.4 & Update 69). Jangan pakai spacing longgar (`space-y-8`+) di luar hero/auth.

**22. Spacing Do's & Don'ts**
- **Do:** pakai skala 4px; ritme via `gap`/`space-y` induk; Sheet `p-6`, Card/Dialog section `px-6 py-4`; root halaman `space-y-6`.
- **Don't:** nilai `px` arbitrer (kecuali konstanta terdokumentasi); campur `margin`+`gap` untuk ritme sama; padding bersarang berlebih (div ber-padding di dalam Card ber-padding); `space-y` + `gap` pada kontainer yang sama; `m-*` untuk ritme global.

**Tambahan (khusus sistem ini):**
- **23. Chart Spacing** — `ChartCard` = `Card p-6` (CardTitle `text-base`); chart `margin={{ left: 12, right: 12 }}` (area/line); `tickMargin={8}` (semua chart, konsisten).
- **24. Empty-state Spacing** — sel `colSpan` `h-24 text-center` (lihat Table Spacing).
- **25. Overlay Offset** — `sideOffset`/`sideOffset={4}` untuk dropdown/tooltip/popover (default shadcn).
- **26. Separator Spacing** — separator vertikal di header `h-4` + `mr-1`; horizontal ikut `space-y` induk (tanpa margin ekstra).

---

# BAGIAN 2C — EXTENDED REGISTRIES & RULES

> Penambahan (tidak menggantikan Bagian 1/2/2A/2B/R01–R38). Bila sebuah topik sudah
> punya aturan, sub-bagian ini **merujuk** ke sana (bukan menduplikasi) dan hanya
> menambah yang belum ada. Semua komponen/halaman **wajib** mengacu ke registri ini.

## 2C.1 State Registry (global)

Sumber tunggal state komponen. Setiap komponen mengacu ke tabel ini (memperluas R11–R16).

| State | Utility/Token kanonik | Catatan |
|-------|-----------------------|---------|
| Default | token semantik dasar (`bg-*`, `text-*`, `border-*`) | Kondisi awal. |
| Hover | varian bawaan (`hover:bg-primary/90`, `hover:bg-accent`, `hover:underline`) | R12. |
| Focus | `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` | R11; ring dari `--ring`. |
| Active/Pressed | `transition-colors` + perubahan warna varian / `data-[state=active]` | R13. |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` | R14. |
| Loading | `Loader2 animate-spin` + teks status + kontrol disabled | R16. |
| Error/Invalid | `aria-invalid` + `FormMessage` `text-destructive` (+ Alert destructive form-level) | R15/R24. |
| Success | Alert non-destructive / teks `text-xs` konfirmasi (mis. reset sukses) | Feedback positif; hemat warna. |
| Readonly | `readOnly` + `bg-muted/50 cursor-default` (tanpa `opacity-50`) | Berbeda dari disabled (nilai tetap terbaca). |

## 2C.2 Size System (global — SSOT dimensi)

SSOT untuk **dimensi** (tinggi/lebar/ukuran ikon). 2B mengatur **jarak** (gap/padding);
di sini **dimensi**. Komponen **dilarang** menentukan ukuran sendiri bila standar ada.

| Aspek | Nilai standar |
|-------|---------------|
| Control height (button/input/select) | `sm` 1.75rem(28) · **default 2rem(32) `h-8`** · `lg` 2.25rem(36) |
| Icon button | `h-8 w-8` (default) · `h-8 w-8` (padat, mis. aksi tabel) |
| Icon size | 14 (`h-3.5`) · **16 (`h-4 w-4`) default** · 20 (`h-5`) · 24 (`h-6`) |
| Table head height | `h-10` (40) |
| Toolbar / preview header | `h-14` (56) |
| App header (fixed) | `h-[65px]` (64 + 1px border) — konstanta terdokumentasi |
| Sidebar width | expanded `16rem` · icon `3rem` · mobile `18rem` |
| Modal (Dialog) width | `max-w-lg` (32rem) |
| Drawer (Sheet) width | mengikuti `side` (default konten `p-6`, lebar responsif) |
| Form/auth container | `max-w-md` (28rem) |
| Preview aspect box | `max-w-sm` (24rem) |

Skala ukuran interaktif: `sm | default | lg` (+ `icon` untuk button). Selaras Density (2C.4).

## 2C.3 Responsive Rules

Breakpoint Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. (Memperluas R10 & 2B.20.)

| Aspek | Perilaku |
|-------|----------|
| Layout Changes | Padding konten `p-4` → `lg:p-6`; panel auth `p-10` → `xl:p-14`. |
| Sidebar Behavior | ≥`md`: sidebar icon-collapsible (shortcut Ctrl/Cmd+B). <`md`: berubah jadi **Sheet drawer** (off-canvas, side kiri). |
| Grid Behavior | Mobile 1 kolom → `md:grid-cols-2/3`; `gap-4`. |
| Table Behavior | Bungkus `overflow-x-auto` pada layar kecil; pertahankan lebar minimum kolom (tanpa memaksa wrap). |
| Modal Behavior | Desktop: `max-w-lg` center; mobile: lebar penuh dengan margin (default `DialogContent`). |
| Drawer Behavior | Nav mobile = Sheet side kiri; panel kontekstual boleh side kanan/bawah. |
| Navigation Behavior | Crumb antara `hidden md:block`; label nav disembunyikan saat sidebar collapse (tooltip label). |

## 2C.4 Density Rules

Filosofi: **Compact/Dense Enterprise UI**. Dua mode (memperluas 2B.21):

| Aspek | Dense (default) | Comfortable (dicadangkan) |
|-------|-------------------|---------------------------|
| Component height | `h-8` (32) | `h-10` (40) |
| Padding (surface) | `p-4` | `p-6` |
| Gap | `gap-2` (kontrol) | `gap-3` |
| Table row height | head `h-10`, cell `p-2` | cell `py-2.5` |
| Toolbar height | `h-14` | `h-16` |
| Form spacing | `space-y-3` / item `space-y-1.5` | `space-y-6` / item `space-y-2.5` |

Default sistem = **Dense**. Mode **Comfortable** kini **aktif & runtime-switchable**
via `DensityProvider` + `DensityToggle` (CSS var `--ctl-h`/`--field-gap`/`--item-gap` di-remap oleh `:root[data-density="comfortable"]`, persist `localStorage` `ui-density`). Lihat Changelog Update 69.

## 2C.5 Interaction Rules

Konsolidasi (merujuk aturan yang ada + menambah Cursor & Click Feedback):

| Aspek | Standar |
|-------|---------|
| Hover | Varian bawaan (R12). |
| Focus Ring | `focus-visible:ring-1 ring-ring outline-none` (R11); offset dari surface bila perlu. |
| Transition | Hanya properti spesifik (`transition-colors`/`opacity`/`transform`); **dilarang `transition: all`** (R18). |
| Cursor | Aksi klik → `cursor-pointer` (bawaan Button); teks/nonaktif → default; disabled → `pointer-events-none` (bukan `cursor-not-allowed`). |
| Disabled Interaction | `disabled:opacity-50 disabled:pointer-events-none` (R14). |
| Click Feedback | Perubahan warna varian saat active; hasil aksi async → `sonner`/`Alert` (R24), bukan animasi berlebihan. |
| Keyboard Navigation | Tab/Shift+Tab; Enter submit; Esc menutup overlay; focus-trap + kembalikan fokus ke pemicu; Ctrl/Cmd+B sidebar (R23). |

## 2C.6 Form Rules

Standar wajib semua form (memperluas R15/R22; jarak lihat 2B.7):

- **Label Position:** di atas kontrol (`FormLabel`), rata kiri. `text-sm font-medium`.
- **Required Indicator:** asterisk `*` `text-destructive` setelah label.
- **Optional Field:** akhiri label dengan `(optional)` `text-muted-foreground`.
- **Helper Text:** `text-xs text-muted-foreground` di bawah field.
- **Validation Message:** via `FormMessage` `text-destructive text-xs` + `aria-invalid` (R15).
- **Error Message (global):** `Alert` variant `destructive` di atas form.
- **Success Message:** `Alert` non-destructive / teks konfirmasi ringkas (pola reset sukses).
- **Field Spacing (Dense):** `<form>` `space-y-3`; `FormItem` `space-y-1.5` (2B.7).
- **Grouping:** field terkait dikelompokkan dengan judul seksi (`text-sm font-medium`) + `Separator`; gunakan semantik `fieldset` bila relevan.
- **Autocomplete:** base `Input`/`Textarea` default **`autoComplete="off"`** (mencegah autofill browser di form generik). Field auth boleh **override** dengan nilai semantik (`email`, `current-password`, `new-password`) demi password manager — ini bukan pelanggaran.

## 2C.7 Table Rules

Standar Data Table (memperluas pattern "Data Table" & 2B.9):

- **Header:** `TableHead h-10 px-2 font-medium text-muted-foreground`.
- **Toolbar:** bar di atas tabel — `flex items-center justify-between gap-2` (kiri: search/filter; kanan: actions).
- **Filter:** via `Select`/`DropdownMenu` di toolbar.
- **Search:** `Input` dengan ikon leading, placeholder `Search...`; memakai **global filter** tanstack (`globalFilter`, lintas kolom).
- **Sorting:** header sortable pakai `SortableHeader` (ikon `ArrowUp/ArrowDown/ArrowUpDown`, full-cell — lihat aturan khusus di bawah) + **wajib set `aria-sort`** pada `TableHead` (`ascending`/`descending`/`none`).
- **Pagination:** komponen `Pagination` di bawah, rata kanan; page-size opsional.
- **Row Selection:** kolom `Checkbox` di depan + select-all di header.
- **Empty State:** `No Data Available` — cell `colSpan` `h-24 text-center` (R26). **Filter-aware:** bila ada filter/search aktif tetapi 0 baris cocok, tampilkan pesan spesifik (mis. "No users match your filters.") + tombol **Clear filters** (`outline` `sm`, ikon `FilterX`) yang me-reset `globalFilter` & `columnFilters`. Ref: `DataTableLayoutPage.jsx`.
- **Loading State:** baris `Skeleton` atau `Spinner`.
- **Alignment:** angka `text-right`; teks `text-left`; status/badge kiri; actions `text-right`.
- **Actions Column:** kolom terakhir, `text-right`, ghost icon button (mis. Eye/Edit/Delete) + `aria-label`.
- **Row Density (opsional, pola "Data Table 1"):** kontrol `DropdownMenu` + `DropdownMenuRadioGroup` di toolbar (label "Density"). Preset: **Compact `py-1`** (default, R39) · Standard `py-2` (default primitive) · Comfortable `py-3`; header ikut `h-8`/`h-10`/`h-12`. Terapkan class via `className` pada `TableHead`/`TableCell` (twMerge menimpa `p-2`). Preferensi boleh dipersist ke `localStorage`. Ref: `DataTableLayoutPage.jsx`.
- **Header Background (opsional):** baris `thead` boleh diberi `bg-muted/50` (+ `hover:bg-muted/50`) agar terpisah jelas dari body — token monochrome, di level konsumen (bukan mengubah primitive).
- **Sortable Header (konsisten + full-cell):** SEMUA header yang bisa di-sort pakai satu komponen (`SortableHeader`) berbasis `Button variant="ghost"` yang **mengisi seluruh sel** (`h-full w-full justify-start rounded-none px-2`, `TableHead` diberi `p-0` untuk kolom sortable) sehingga **hover menutupi seluruh `th`**, bukan hanya teks. Gaya teks selaras (`text-muted-foreground font-medium`) + ikon `ArrowUp/ArrowDown/ArrowUpDown` sesuai state. **Jangan** campur header tombol (foreground) dengan header teks polos (muted) — itu inkonsistensi (insiden Update 49).
- **Faceted Column Filter (opsional):** filter multi-pilih per-kolom di toolbar (`FacetedFilter` = `Button` border-dashed + `DropdownMenu` checkbox items + Badge jumlah + Clear). Kolom terkait set `filterFn` array-includes. Terapkan hanya pada kolom kategorikal (mis. Role, Status). Wiring: state `columnFilters` + `onColumnFiltersChange` + `getFilteredRowModel`.
- **Rows-per-page (footer):** `Select` (`h-8`) diapit teks — pola `Rows per page [select] of {total} rows` (kiri) + `Page x of y` & tombol prev/next (kanan). Total baris menyatu inline dengan selector (rujuk `DataTableLayoutPage.jsx`).
- **Row Actions:** ghost icon `MoreHorizontal` → `DropdownMenu` **tanpa** label judul; tiap item beri ikon leading `lucide` (mis. `Eye`/`Pencil`/`Trash2`), aksi destruktif `text-destructive focus:text-destructive`.

## 2C.8 Icon Rules

Satu standar (memperluas R09 & 2B.18):

- **Icon Library:** **lucide-react** (satu-satunya). Emoji/SVG kustom/library lain dilarang.
- **Icon Size:** default `h-4 w-4` (16); skala 14/16/20/24 mengikuti ukuran kontrol.
- **Icon Position:** leading (sebelum teks) default; trailing untuk chevron/eksternal.
- **Icon + Text:** jarak `gap-2` (induk), rata tengah vertikal.
- **Icon Only Button:** `size="icon"` (`h-8 w-8`) + **wajib `aria-label`**.
- **Decorative Icon:** `aria-hidden="true"`.
- **Functional Icon:** menyampaikan makna/aksi → wajib punya nama aksesibel (aria-label / teks berdampingan).

## 2C.9 Content Rules

Konten UI **generik** (memperluas R25/R27/R31; ukuran teks lihat 2A):

> 🔴 **Bahasa UI = Inggris saja (Non-Negotiable).** SEMUA teks di layar (label, judul section,
> placeholder, tombol, hint, toast, error/validasi, header tabel) WAJIB Bahasa Inggris — tak
> peduli bahasa komunikasi user atau bahasa pada screenshot referensi. Bila user memberi
> referensi berbahasa lain, ikuti **layout**-nya saja, terjemahkan teks kembali ke Inggris.
> (Insiden Update 78. Detail: `DESIGN_SYSTEM_RULES.md` §6.)

| Elemen | Aturan |
|--------|--------|
| Page Title | Sentence case, ringkas (`PageHeader` H1). |
| Section Title | Sentence case, `text-base/sm font-medium`. |
| Button Label | Verb-first, sentence case ("Sign in", "Send reset link"). |
| Placeholder | Generik (`name@example.com`, `Search...`) — R25. |
| Empty State | `No Data Available` (R26). |
| Dialog | Title = aksi/pertanyaan; description 1 baris. |
| Tooltip | Singkat, tanpa tanda baca akhir. |
| Toast | Title + deskripsi opsional; ringkas. |
| Validation Message | Spesifik & solutif ("Please enter a valid email address."). |
| Error Message | Jelas, non-teknis, generik. |

## 2C.10 Naming Convention

| Aspek | Standar |
|-------|---------|
| Component | `PascalCase`, **named export** (`export const X`). |
| Page | `PascalCase`, **default export**. |
| Folder | Berkelompok: `components/ui`, `components/layout`, `components/auth`, `pages/*`, `config`. |
| File | Komponen/Page `PascalCase.jsx`; primitive shadcn `kebab-case.jsx` (konvensi upstream). |
| Props | `camelCase`; boolean positif (`isOpen`); handler `onX`. |
| CSS Variables | `--kebab-case`, berprefiks makna (`--sidebar-*`, `--chart-*`). |
| Design Tokens | HSL. **Arsitektur 2-layer:** Layer 1 primitives `--neutral-0..950`/`--red-*`/`--hue-chart-*` (mentah, theme-independent) → Layer 2 semantic (`--background`, dst) me-reference via `var()`. Light/Dark hanya remap Layer 2 (R28). |
| Variant | string lowercase (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`). |
| Size | `sm | default | lg` (+ `icon`) — selaras 2C.2. |
| Icon | import lucide `PascalCase`; `data-testid` kebab-case (deskriptif fungsi). |

## 2C.11 Composition Rules

Urutan komposisi kanonik (jangan mengarang urutan lain; hanya anak terdokumentasi):

- **Card:** `Card > CardHeader(CardTitle[, CardDescription]) > CardContent [> CardFooter]`. Section `px-6 py-4`. Konsep **header/body/footer** dipisah divider token: `border-b` pada header, `border-t` pada footer.
- **Dialog:** `DialogContent(p-0) > DialogHeader(border-b) > DialogBody(px-6 py-4) > DialogFooter(border-t)`. Konsep **header/body/footer** identik Card (section `px-6 py-4`, divider token, monochrome). Body form **selalu** `<DialogBody>` (reusable).
- **Form:** `Form > FormField > FormItem(FormLabel, FormControl, [helper], FormMessage) …> Button submit` (`space-y-3`).
- **Dialog:** `Dialog > (DialogTrigger) + DialogContent(DialogHeader(DialogTitle, DialogDescription), body, [DialogFooter])`.
- **Toolbar:** `flex items-center justify-between gap-2` (kiri: search/filter; kanan: actions).
- **Table:** `[Toolbar] + div.rounded-md.border > Table(TableHeader>TableRow>TableHead ; TableBody>TableRow>TableCell) + [Pagination]`.
- **Sidebar:** `Sidebar > SidebarHeader(brand) + SidebarContent(SidebarGroup>SidebarGroupLabel+SidebarMenu…) + SidebarFooter(user) + SidebarRail`.

**Contoh (#7) — Card & Dialog header/body/footer (R38, divider token):**

```jsx
// Card
<Card>
  <CardHeader>                       {/* border-b, px-6 py-4 */}
    <CardTitle className="text-base">Title</CardTitle>
    <CardDescription>Muted description.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3"> {/* px-6 py-4 · space-y-3 (form/Dense) / space-y-4 (umum) — JANGAN space-y-6 */}
    {/* fields / content */}
  </CardContent>
  <CardFooter className="justify-end gap-2"> {/* border-t, px-6 py-4 */}
    <Button variant="outline">Cancel</Button>
    <Button>Save</Button>
  </CardFooter>
</Card>

// Dialog (DialogContent p-0; body dibungkus konsumen)
<DialogContent className="sm:max-w-md">
  <DialogHeader> {/* border-b px-6 py-4 */}
    <DialogTitle>Add User</DialogTitle>
    <DialogDescription>All fields are required.</DialogDescription>
  </DialogHeader>
  <div className="space-y-3 px-6 py-4">{/* body */}</div>
  <DialogFooter> {/* border-t px-6 py-4 */}
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </DialogFooter>
</DialogContent>
```


## 2C.12 Page Template Registry

**Semua halaman WAJIB memiliki Page Specification** (mengikuti format `LOGIN_PAGE_SPEC.md`).
Struktur standar tiap spec: **Tujuan · Route · Layout (AppLayout/AuthLayout) · Struktur
(PageHeader + sections) · Komponen dipakai (rujuk registry) · State (loading/empty/error)
· Data/Props · Responsive · Aksesibilitas · Konten (generik)**.

| Template | Status |
|----------|--------|
| Login | ✅ (spec ada: `LOGIN_PAGE_SPEC.md`) |
| Dashboard | 🔵 Proposed (spec ada: `DASHBOARD_PAGE_SPEC.md`) |
| Master Data (list/table) | 🔵 Proposed (spec ada: `MASTER_DATA_PAGE_SPEC.md`) |
| Detail | ⚪ Deferred |
| Form (create/edit) | ⚪ Deferred |
| Settings | ⚪ Deferred |
| Profile | ⚪ Deferred |
| Error Page (404/500) | ⚪ Deferred |

Belum perlu membuat semua halaman — cukup standar & struktur dokumentasi ini. **Halaman
baru → buat Page Specification lebih dulu**, lalu implementasi. **Template acuan:
`PAGE_SPEC_TEMPLATE.md`** (wajib disalin untuk setiap spec baru).

> **Roadmap (revisi):** pembuatan Page Specification konkret **DITUNDA** hingga fondasi
> matang. Urutan prioritas pengembangan:
> **1) Foundation → 2) Component Registry → 3) Base Components → 4) Composite Components →
> 5) Sample Blocks → 6) Layout Patterns → 7) `PAGE_SPEC_TEMPLATE.md` (selesai) →
> 8) Page Specifications.** Alasan: agar setiap spec memakai komponen & pola yang sudah
> distandarkan, sehingga tidak perlu revisi berulang saat Design System berubah.

## 2C.13 Registry Audit (Single Source of Truth)

- **Temuan & perbaikan:** baris `card` sebelumnya terdaftar **dua kali** di 1.1 → **disatukan** menjadi satu baris (SSOT).
- **Aturan:** setiap primitive/pattern **hanya satu baris** di registry. Sebelum menambah, **cek keberadaan**; jangan membuat entri ganda. Daftar ⚪ (available) dan baris ✅ tidak boleh memuat komponen yang sama.
- **Audit penomoran (#6, 2026-06):** referensi `R01–R39` & `2C.1–2C.24` diverifikasi — semua **terdefinisi & tereferensi tanpa dangling**; semua rujukan file `.md` (LOGIN/DASHBOARD/MASTER_DATA/PAGE_SPEC_TEMPLATE/PROPOSAL/ARCHITECTURE/BACKLOG) valid. Ulangi audit ini setiap kali aturan dipindah/ditambah.

## 2C.14 Compact Guard (pemeriksaan otomatis — WAJIB sebelum finish)

Untuk mencegah UI longgar lolos (insiden Update 45–46), tersedia skrip grep
**`docs/design-guard.sh`** yang men-scan `src/` dan **gagal (exit 1)** bila menemukan
anti-pattern. **WAJIB dijalankan & lolos sebelum menyatakan selesai** (R39).

```bash
bash frontend/docs/design-guard.sh
```

Anti-pattern yang dideteksi (semua = **regresi**):
- `space-y-6` **di dalam** `CardHeader/CardContent/CardFooter` (harus `space-y-3` form / `space-y-4` umum).
- Warna hardcode Tailwind (`bg-white`, `text-black`, `bg-blue-500`, dll) & hex literal → pakai token (R05/R06).
- Emoji sebagai ikon → pakai `lucide-react` (R09).
- Avatar profil `h-16 w-16`+ (density; pakai `h-12 w-12`).
- `gap-5` / `space-y-7`/`space-y-8` di luar konteks auth/hero.
- `console.log/debug/info` tersisa di kode fitur (bersihkan sebelum finish; `console.error` untuk pelaporan error diizinkan) — logging hygiene.

> Guard bersifat **heuristik** (bukan pengganti review), tetapi menangkap 90% kasus
> "tidak compact"/warna hardcode secara cepat. Jika sebuah temuan memang disengaja &
---

## 2C.15 Versioning & Release Policy (governance — #1)

> 🔵 **Forward-looking (belum wajib di scope saat ini).** Kebijakan ini relevan penuh
> saat Design System dipakai **lintas-tim** atau **dipublikasikan**. Untuk sekarang cukup
> jadi acuan; penerapan ketat (rilis bertag SemVer) diaktifkan saat trigger tersebut tercapai.

Design System diperlakukan sebagai **satu paket berversi** (bukan per-komponen) memakai
**SemVer**: `MAJOR.MINOR.PATCH`. Perubahan kecil pada primitive (Button/Input) menyebar ke
banyak halaman, jadi setiap rilis **wajib** diklasifikasikan.

| Bagian | Aturan |
|--------|--------|
| **SemVer** | **MAJOR** = perubahan breaking (lihat bawah). **MINOR** = penambahan backward-compatible (komponen/variant/token baru, pattern baru). **PATCH** = bug fix, penyesuaian gaya non-breaking, dokumentasi. |
| **Breaking Change** | Hapus/rename komponen, prop, atau token; ubah default behavior/appearance yang memaksa konsumen menyesuaikan; ubah struktur komposisi wajib (mis. header/body/footer). Contoh **bukan** breaking: menambah variant baru, menambah prop opsional dgn default aman. |
| **Deprecation** | Tandai item **⚠️ Deprecated** (2C.16) + catat pengganti. Wajib bertahan **≥ 1 siklus MINOR** sebelum dihapus. Dihapus **hanya** pada rilis **MAJOR**. Setiap Deprecated **wajib** punya rekomendasi migrasi. |
| **Migration Guide** | **Wajib** untuk tiap rilis **MAJOR**. Format: *Apa yang berubah · Alasan · Sebelum→Sesudah (kode) · Langkah migrasi · Deadline penghapusan*. Simpan di Changelog (Bagian 5) atau dokumen `MIGRATION.md` bila panjang. |
| **Changelog Policy** | Setiap perubahan **wajib** tercatat di **Bagian 5**. Gunakan tag tipe (gaya *Keep a Changelog*): **Added / Changed / Deprecated / Removed / Fixed**, plus dampak versi ([MAJOR]/[MINOR]/[PATCH]). Tidak ada perubahan yang boleh masuk tanpa entri Changelog. |

> **Baseline versi saat ini:** perlakukan state sekarang sebagai `0.x` (pra-1.0, API masih
> bisa berubah). Naik ke `1.0.0` saat design system dinyatakan stabil untuk konsumsi luas.

## 2C.16 Component Lifecycle (governance — #2)

Memperluas legenda status di header file. Setiap komponen/pattern menempati **satu** fase
lifecycle. Transisi wajib dicatat di Changelog (2C.15).

| Fase | Makna | Boleh dipakai di produksi? |
|------|-------|----------------------------|
| 🧪 **Experimental** | Eksplorasi/uji coba; API & gaya belum stabil, bisa berubah/hilang tanpa MAJOR. | ❌ Tidak (hanya demo/eksperimen) |
| ⚪ **Available** | Tersedia (mis. primitive shadcn ter-port) tetapi belum distandarkan/dipakai. | ⚠️ Boleh, aktifkan → jadikan Established |
| ✅ **Established** | Stabil, distandarkan, dipakai konsumen. Perubahan tunduk SemVer. | ✅ Ya |
| ⚠️ **Deprecated** | Masih ada demi kompatibilitas, tetapi akan dihapus; ada pengganti + migration note. | ⚠️ Hindari untuk fitur baru |
| 🔒 **Pending** | Menunggu keputusan/persetujuan (mis. dependency berat). | ❌ Belum |
| 🗑️ **Removed** | Dihapus (hanya pada MAJOR). Tercatat di Changelog + Migration Guide. | — |

**Alur transisi normal:** `Experimental → Available → Established → Deprecated → Removed`.
Item juga bisa langsung `Pending → Available/Established` setelah disetujui.

## 2C.17 Feedback Pattern (kapan pakai apa — #7)

Komponen feedback sudah tersedia (Sonner, Alert, Dialog/AlertDialog, `FormMessage`).
**Matriks keputusan (WAJIB)** — pilih berdasarkan *blocking-ness* & *lifespan* pesan:

| Mekanisme | Kapan dipakai | Sifat | Komponen |
|-----------|---------------|-------|----------|
| **Toast** | Konfirmasi hasil aksi async yang **tidak butuh keputusan** (saved/created/deleted/copied). | Transien, non-blocking, auto-dismiss. | `sonner` (`toast.success/error`) |
| **Inline Validation** | Kesalahan/masukan **per-field** dalam form. | Kontekstual di field, muncul saat submit/blur. | `FormMessage` + `aria-invalid` (R15) |
| **Alert (inline block)** | Pesan **tingkat halaman/form** yang persisten sampai diatasi (error global, info penting, sukses reset). | Blok tetap dalam layout, tidak menutup konten. | `alert` (variant `destructive`/default) |
| **Dialog / AlertDialog** | Aksi yang **memblokir & butuh keputusan** (konfirmasi hapus, aksi destruktif, review sebelum lanjut). | Modal, interupsi, fokus-trap. | `dialog` / `alert-dialog` (pola R38) |

**Prinsip:** semakin permanen/berbahaya dampaknya, semakin "berat" mekanismenya
(Toast → Inline → Alert → Dialog). **Jangan** pakai Dialog untuk sekadar notifikasi sukses,
dan **jangan** pakai Toast untuk error yang butuh tindakan pengguna.

## 2C.18 Empty State Registry (klasifikasi — #5)

Memperluas R26 & 2C.7. Bedakan **jenis** kekosongan; jangan pakai satu teks generik untuk semua.

| Jenis | Kapan | Pola tampilan | Copy contoh (generik) |
|-------|-------|---------------|------------------------|
| **No Data** | Dataset memang kosong (belum ada isi). | Teks netral `text-muted-foreground` (tabel: cell `colSpan h-24`). | `No Data Available` |
| **No Search/Filter Result** ✅ | Ada query/filter aktif tetapi 0 hasil. | Pesan spesifik + tombol **Clear filters** (`FilterX`). *(Sudah diimplementasi di DataTable.)* | `No users match your filters.` |
| **First-Time / Onboarding** | Pengguna baru, belum membuat apa pun. | Composite **Placeholder** (`Empty`) + judul + deskripsi + **CTA primer** (mis. "Create your first item"). | `Get started by creating…` |
| **Permission Denied / Forbidden** | Tidak punya akses (lihat 2C.21). | Empty state tanpa CTA aksi (opsional "Request access"); ikon `Lock`/`ShieldOff`. | `You don't have access to this.` |
| **Offline / Connection** | Jaringan terputus. | Pesan + tombol **Retry**; ikon `WifiOff`. | `You're offline. Check your connection.` |
| **Error / Failed to load** | Gagal memuat data (bukan kosong). | Pesan error non-teknis + tombol **Retry**; ikon `AlertTriangle`. | `Something went wrong. Try again.` |

Semua memakai token monochrome, ikon `lucide-react`, copy generik & solutif (2C.9).

> **Implementasi:** composite **`EmptyState`** (`components/composite/EmptyState.jsx`, 6 varian) + halaman **Empty States** (`pages/blocks/EmptyStatesBlockPage.jsx`). "No Search Result" juga aktif di DataTable.

## 2C.19 Search, Filter & Sort Pattern (global — #9)

Mengangkat aturan tabel (2C.7) menjadi **pola global** (berlaku di list, tabel, katalog, dsb).

| Aspek | Standar | Status |
|-------|---------|--------|
| **Search** | `Input` ikon leading (`Search`), placeholder `Search...`; tanstack **global filter** lintas kolom (untuk tabel). Debounce opsional bila sumber data mahal. | ✅ |
| **Filter** | **Faceted** multi-pilih per kolom kategorikal (`FacetedFilter` = `Button` border-dashed + checkbox items + Badge jumlah + Clear). Hanya untuk kolom kategorikal (Role/Status). | ✅ |
| **Sort** | `SortableHeader` full-cell + wajib `aria-sort` (`ascending`/`descending`/`none`). Ikon `ArrowUp/ArrowDown/ArrowUpDown`. | ✅ |
| **Reset Filter** | Tombol **Clear filters** (`outline sm`, ikon `FilterX`) yang reset `globalFilter` **dan** `columnFilters`. Muncul saat ada filter aktif (mis. via empty-state No-Result, 2C.18). | ✅ |
| **Saved Filter** | Simpan kombinasi filter (nama + persist ke `localStorage`/backend) untuk dipakai ulang. | ⚪ **Deferred** (butuh persistensi; ajukan bila diperlukan) |
| **Placement** | Toolbar: **kiri** = search/filter, **kanan** = actions (`flex items-center justify-between gap-2`). | ✅ |

## 2C.20 Data Display & Formatting Pattern (#10)

Konvensi menampilkan nilai data (tetap generik, tanpa konteks bisnis). Formatter aktual
(locale/currency) diserahkan ke konsumen; di sini **aturan tampilan**-nya.

| Tipe | Aturan tampilan |
|------|-----------------|
| **Number** | Rata **kanan** (`text-right`); gunakan `tabular-nums` agar sejajar; pemisah ribuan sesuai locale. |
| **Currency** | Rata **kanan**, `tabular-nums`; simbol/kode konsisten (mis. `1,250.00`); negatif via `text-destructive` (accent, hemat). |
| **Percentage** | Rata **kanan**; 0–2 desimal konsisten; sufiks `%`. |
| **Date** | Format konsisten satu gaya (disarankan `YYYY-MM-DD` atau `MMM D, YYYY`); teks `text-muted-foreground` bila sekunder. |
| **Time / Relative** | 24-jam konsisten; relative time ("2h ago") untuk aktivitas, absolute pada tooltip. |
| **Status** | **`Badge`** dengan mapping variant tetap: `default` (aktif/utama), `secondary` (netral), `outline` (idle/pending), `destructive` (error/critical). Jangan pakai warna hardcode. |
| **Boolean** | Ikon `Check`/`X` atau Badge; hindari teks "true/false" mentah. |
| **Empty / null** | Tampilkan **em dash** `—` (`text-muted-foreground`), bukan string kosong. |

**Alignment aturan umum:** teks kiri, angka/mata-uang/persen kanan, status/badge kiri,
actions kanan (selaras 2C.7).

> **Implementasi:** util **`lib/format.js`** (`formatNumber/Currency/Percent/Date/Time/Relative`, `statusBadgeVariant`, nil → `—`) + halaman **Data Display** (`pages/blocks/DataDisplayBlockPage.jsx`).

## 2C.21 Permission Pattern (generik enterprise — #6)

Pola menangani elemen/halaman yang bergantung hak akses. Tetap generik (tanpa model RBAC nyata).

| Strategi | Kapan dipakai | Implementasi |
|----------|---------------|--------------|
| **Hide** | Pengguna **tidak boleh tahu** fitur itu ada. | Jangan render elemen (conditional). Tanpa jejak DOM. |
| **Disable** | Fitur terlihat tetapi tak boleh dipakai **saat ini** (konteks/izin). | `disabled` (`opacity-50 pointer-events-none`, R14) + **Tooltip** alasan singkat. |
| **Read-only** | Nilai boleh **dibaca**, tidak boleh diubah. | `readOnly` + `bg-muted/50 cursor-default` (2C.1 Readonly), tanpa `opacity-50`. |
| **Forbidden** | Seluruh **halaman/section** tak boleh diakses. | Empty state **Permission Denied** (2C.18) / pola halaman 403; tanpa data sensitif. |

**Panduan Hide vs Disable:** *Hide* bila keberadaan fitur bersifat rahasia/tak relevan bagi peran;
*Disable* bila fitur relevan tapi terkunci sementara (beri konteks agar tidak membingungkan).

> **Implementasi:** halaman **Permissions** (`pages/blocks/PermissionsBlockPage.jsx`) — `ToggleGroup` role mendemokan Hide/Disable/Read-only/Forbidden (Forbidden pakai `EmptyState` variant `forbidden`).

## 2C.22 Testing Standard (aturan, bukan implementasi — #3)

> 🔵 **Forward-looking (belum wajib di scope saat ini).** Standar minimum ini menjadi acuan;
> automasi penuh & kewajiban formal relevan saat lintas-tim/publikasi. Guard + review manual
> tetap jadi DoD sekarang.

Standar minimum verifikasi setiap UI (melengkapi Definition of Done di `DESIGN_SYSTEM_RULES.md` §10).

| Jenis | Standar |
|-------|---------|
| **Visual** | Jalankan `docs/design-guard.sh` (lolos exit 0) + review screenshot pada ≥2–3 halaman konsumen saat memodifikasi komponen (R38). Konsistensi token/spacing/typography. |
| **Accessibility (A11y)** | Label terkait input, `aria-*` untuk kontrol ikon, `aria-hidden` dekoratif, focus-visible terlihat, kontras **WCAG AA**, `aria-sort` pada header sortable (R17, 2C.7/2C.8). |
| **Interaction** | Cakup semua state relevan (2C.1: default/hover/focus/active/disabled/loading/error/success/readonly); alur form (validasi kosong, sukses, error global); keyboard (Tab/Enter/Esc, 2C.5). |
| **Responsive** | Verifikasi breakpoint `sm/md/lg/xl` (2C.3), mobile-first; tabel `overflow-x-auto`; sidebar → Sheet di `<md`. |

> Cukup **aturan**; automasi penuh (mis. Playwright/axe/Chromatic) bersifat opsional & diajukan bila diperlukan.

## 2C.23 Performance Guideline (#4)

> 🔵 **Forward-looking (belum wajib di scope saat ini).** Panduan ini penting saat data/halaman
> membesar atau saat backend nyata masuk; untuk mock frontend sekarang cukup sebagai acuan.

Panduan agar tetap ringan saat data/halaman bertambah (formalisasi; sebagian sudah dipraktikkan).

| Aspek | Standar |
|-------|---------|
| **Lazy Loading** | Halaman berat / rute jarang dipakai di-`React.lazy` + `Suspense` (code-splitting). Chart & editor besar dimuat saat dibutuhkan. |
| **Memoization** | `React.memo`/`useMemo`/`useCallback` untuk list/tabel & handler mahal; `getRowId` stabil (tanstack) untuk hindari re-render tak perlu. |
| **Virtualization** | Untuk daftar/tabel **besar** (> ~100–200 baris terlihat), gunakan virtualization. *(Butuh dependency → ajukan persetujuan R37; saat ini ⚪ Deferred.)* |
| **Bundle Size** | Hindari dependency berat; setiap dependency lewat **R37** (tidak menyebar). Impor ikon `lucide-react` per-nama (tree-shakeable). |
| **Chart Performance** | `recharts@2.15.4` (pinned); `isAnimationActive={false}` (R33); batasi jumlah titik data; hindari re-compute config tiap render. |
| **Large Table** | Skala di luar mock → **server-side pagination/sort/filter** (jangan muat semua baris ke klien). Default sistem = client-side (mock kecil). |


> terdokumentasi (mis. panel auth `p-10`), kecualikan lewat komentar & catat di Changelog.


## 2C.24 Dependency Registry (SSOT dependency — #3)

Konsolidasi semua library non-shadcn yang diizinkan (memperluas R37 — tak lagi tersebar).
Setiap dependency **wajib** punya: alasan, batas pemakaian (scope), & komponen pemakai.
Menambah dependency baru = **butuh persetujuan** (R32) lalu daftarkan di sini.

| Dependency | Versi | Alasan | Batas pemakaian (scope) | Dipakai oleh |
|------------|-------|--------|--------------------------|--------------|
| **lucide-react** | latest | Satu-satunya sumber ikon (R09) | **Global** (semua UI); dilarang emoji/SVG kustom/ikon lain | Semua komponen |
| **recharts** | `2.15.4` (pinned) | Engine chart resmi shadcn (R33); 3.x menyebabkan render parsial | **Global** untuk chart; elemen wajib anak langsung `ChartContainer` | `ui/chart`, Sample Charts, ChartCard |
| **@tanstack/react-table** | `8.21.3` | Tabel data (sort/filter/pagination/selection) | Terikat: **Data Table & Data Grid saja** | `DataTableLayoutPage`, composite Data Grid |
| **react-hook-form** + **zod** + **@hookform/resolvers** | latest | Form state & validasi skematik (R15/R22) | **Global** untuk form | Semua form/dialog form, Wizard |
| **react-syntax-highlighter** | latest | Highlight kode (Prism `oneLight`) | Terikat: **Code Block** saja | composite Code Block |
| **react-markdown** + **remark-gfm** | latest | Render markdown + GFM | Terikat: **Markdown** saja | composite Markdown |
| **react-phone-number-input** | latest | Input telepon internasional + bendera | Terikat: **Phone Input** saja | composite Phone Input |
| **react-imask** | latest | Masking input | Terikat: **Input Mask** saja | composite Input Mask |
| **react-day-picker** | latest | Kalender/date picker (dasar `ui/calendar`) | Terikat: **Calendar / Date Picker** saja | `ui/calendar`, composite `DatePicker` |
| **@dnd-kit/core** + **/sortable** + **/utilities** | latest | Drag & drop | Terikat: **Kanban & Sortable** saja | composite Kanban, Sortable |

> **Aturan (dari R37):** dependency **terikat komponen tidak boleh menyebar** ke luar komponennya.
> Versi `latest` mengikuti `package.json` (SSOT versi sebenarnya); hanya **recharts** & **@tanstack/react-table** yang di-pin di dokumen karena sensitif versi.



---


# BAGIAN 3 — PENDING / BUTUH KEPUTUSAN

Item yang ditunda dipindahkan ke **`BACKLOG.md`** (parkir resmi). Ringkasan:

| ID | Item | Status | Keterangan |
|----|------|--------|------------|
| ~~P1~~ | Alert form-level | ✅ Done | Diaktifkan di `LoginForm` (variant `destructive`). |
| ~~P2~~ | Message Scroller | ✅ Done | Diport versi **styled** tanpa engine `@shadcn/react` (Update 25). **Base Components kini 61/61 Established.** |
| B1 | Dark mode toggle | ✅ Done | **Arsitektur token 2-layer + toggle Light/Dark/System** (Update 37). `ThemeProvider`+`ModeToggle` di header; halaman **Design Tokens** menampilkan swatch primitive & semantic. |
| B2 | Empty State pattern | ✅ Done | Composite **Placeholder** (`Empty`) di halaman Composite Component (Update 25). |

---

# BAGIAN 4 — CARA MENAMBAH (Proses Bertahap)

Setiap kali membangun UI baru:
1. Cek apakah komponen/pola sudah ada di **Bagian 1**. Jika ada → pakai.
2. Jika komponen shadcn tersedia tapi belum dipakai (⚪) → pakai, lalu ubah status jadi ✅.
3. Jika **tidak ada** di shadcn → **jangan improvisasi**; lapor & tunggu persetujuan.
4. Setelah UI selesai → **daftarkan** komponen/pattern baru ke Bagian 1 dan aturan
   baru ke Bagian 2, lalu catat di Changelog.
5. Verifikasi dengan **Checklist** di `DESIGN_SYSTEM_RULES.md` (Bagian 7).

---

# BAGIAN 5 — CHANGELOG

| Tanggal | Perubahan |
|---------|-----------|
| Awal | Seed registry dari halaman **Login**: 8 primitives ✅ (button, input, label, card, checkbox, separator, form, sonner), 6 patterns ✅ (AuthLayout, LoginForm, Brand lockup, Password+toggle, Loading button, Grid decoration), 32 aturan global (R01–R32). |
| Update 1 | **Alert form-level ✅** diaktifkan di `LoginForm` (variant `destructive`, mock auth: `user@example.com` / `password`). `alert` → ✅ di primitives; pattern "Form-level error alert" ditambahkan. Item ditunda (Dark mode, Empty State) dipindah ke `BACKLOG.md`. |
| Update 2 | **Foundations ditetapkan:** Font **Geist** (primary) + fallback `Inter, system-ui, sans-serif` (R04); Ikon **wajib `lucide-react`** (R09). Font diperbarui di `index.css`. |
| Update 3 | **Dashboard shell** ditambahkan: primitives ✅ scroll-area, sheet, breadcrumb, avatar; patterns ✅ AppLayout, AppSidebar, PageHeader. Navigasi terpusat di `src/config/navigation.js` (menu: Dashboard, Components, Blocks, Charts). Rute `/dashboard/*` di `App.js`; login sukses → redirect `/dashboard`. Halaman utama & sub-halaman sengaja **kosong** dulu. |
| Update 4 | **Sidebar resmi shadcn (sidebar-07) ditambahkan ke design system.** Primitive `ui/sidebar.jsx` (diport TSX→JSX, Tailwind v3, `@radix-ui/react-slot`) + hook `hooks/use-mobile.js` + token `--sidebar-*` di `index.css` (dinetralkan ke monochrome) & mapping `colors.sidebar` di `tailwind.config.js`. Primitives ✅ dropdown-menu, tooltip, skeleton mulai dipakai. `AppLayout`/`AppSidebar` di-refactor memakai Sidebar system (collapse-to-icon, keyboard `Ctrl/Cmd+B`, user dropdown → Log out ke `/login`). |
| Update 5 | **Struktur menu bergrup + submenu collapsible.** `navigation.js` kini `navSections` (grup: Greetings, Design System) dengan item bercabang (`children`); primitive ✅ collapsible dipakai untuk Sample Blocks & Sample Charts. Dashboard dipindah ke `/`; rute `/design-system/{components, blocks/*, charts/*}` (semua **blank**) via `PlaceholderPage` reusable (judul dari nav config). Breadcrumb kini menampilkan trail bertingkat. Login sukses → redirect `/`. |
| Update 6 | **Kustomisasi sidebar-07** (styling, tanpa primitive baru): (a) header sidebar pakai `border-b border-sidebar-border` + `sticky top-0 bg-sidebar`, dan header konten dinaikkan ke `h-16` (64px) agar garis bawah keduanya **sejajar presisi** membentuk satu garis menerus (referensi sidebar-12); (b) blok user footer dibuat "timbul" (`bg-sidebar-accent` + border + `shadow-sm`) menyerupai state hover. |
| Update 7 | **App-shell fixed header + presisi 1px.** Layout dikunci `h-svh`; hanya area konten (`overflow-y-auto`) yang scroll → header & sidebar benar-benar diam. Header konten `h-[65px]` untuk menyamai tinggi header sidebar (auto 64px + 1px border) → garis benar-benar sejajar. |
| Update 8 | **Sample Charts diisi konten.** Ditambahkan primitive resmi ✅ `chart` (`ui/chart.jsx`, diport TSX→JSX) + **recharts di-pin ke `2.15.4`** (versi yang didukung shadcn; recharts 3.x menyebabkan `width(-1)` & render parsial). Pattern ✅ `ChartCard`; data contoh generik di `config/chartSampleData.js`. 7 halaman chart (Area/Bar/Line/Pie/Radar/Radial/Tooltips) via Recharts. Catatan: (a) container pie/radar/radial pakai `aspect-square w-full max-w-[320px]` agar tak kolaps; (b) RadialBar diberi warna per-slice via `<Cell>`; (c) `<Bar>` diberi `isAnimationActive={false}` karena React StrictMode membuat animasi bar tersangkut di tinggi 0; (d) elemen chart harus anak langsung `ChartContainer` (jangan dibungkus komponen). Dashboard `/` diisi blok placeholder (`bg-muted/50`) yang cukup tinggi untuk uji scroll. |
| Update 9 | **Aturan diformalkan.** Ditambahkan **R33 Charts**, **R34 App Shell & Scroll**, **R35 Navigation**, **R36 Routing**, **R37 Dependency Exception**; R05 diperluas (token `--sidebar-*` & `--chart-1..5`); R26 mencatat placeholder surface `bg-muted/50`. Governance (`DESIGN_SYSTEM_RULES.md`) memuat daftar library yang diizinkan (lucide-react, recharts). |
| Update 10 | **Sample Blocks lengkap.** (a) `SidebarBlockPage` di-wire ke rute `/design-system/blocks/sidebar` dan dibuat **self-contained/inert**: sidebar preview dibangun langsung dari primitive shadcn + struktur `navSections`, memakai `SidebarMenuButton onClick` (bukan `<Link>`) sehingga **klik menu tidak pernah navigate ke URL host** — hanya memperbarui seleksi lokal (breadcrumb) & menampilkan placeholder kosong (`bg-muted/50`). (b) Pattern ✅ **ForgotPasswordForm** + halaman standalone `/forgot-password` (reuse `AuthLayout`; schema `resetSchema` di `authSchema.js`; sukses → Alert non-destructive). Link "Forgot password?" di `LoginForm` kini navigate ke `/forgot-password`. (c) Pattern ✅ **Block Preview via iframe**: `LoginBlockPage` & `ForgotBlockPage` merender rute nyata (`/login`, `/forgot-password`) di dalam `<iframe>` berbingkai `h-[680px]`. |
| Update 11 | **Typografi diformalkan + halaman Components dikembalikan blank.** (a) Ditambahkan **BAGIAN 2A — Typography Scale** (tabel resmi H1→terkecil: `text-2xl/3xl/4xl` heading, `text-sm/base` body, `text-xs` terkecil; weight 400/500/600; aturan `leading-tight/normal/relaxed` & `tracking-tight` khusus heading); **R04** diperbarui untuk merujuk skala ini. (b) **ComponentsPage dihapus** — rute `/design-system/components` dikembalikan ke `PlaceholderPage` (blank) karena pengisian sebelumnya tidak diinstruksikan user. |
| Update 12 | **Halaman Components mulai diisi (atas instruksi user).** Primitive ✅ **table** diaktifkan. Pattern ✅ **Data Table (card-wrapped)**: `Table` shadcn dibungkus `Card`. Kolom awal: **No** (urut), **Name** (daftar **All Components** shadcn/ui — 63 item, sumber `ui.shadcn.com/docs/components`), **Action** (`text-right`, tombol ghost icon **Eye/preview** dgn `aria-label` + toast placeholder). Tetap ada fallback empty-state R26 (`No Data Available`). Rute `/design-system/components` kembali ke `ComponentsPage`. |
| Update 13 | **Kolom Status ditambahkan di tabel Components.** Tiap komponen shadcn dipetakan ke legenda design system via Badge: **Established** (`default`, sudah dipakai), **Available** (`secondary`, tersedia di `ui/`, belum dipakai), **Pending** (`outline`, belum diport ke `ui/` — mis. Attachment/Bubble/Combobox/Data Table/Date Picker/Field/Spinner/Typography). Primitive ✅ **badge** diaktifkan (dipakai untuk status). |
| Update 14 | **Tombol Eye → Preview Dialog nyata (mulai komponen awalan "A").** Pattern ✅ **Component Preview Dialog**: klik Eye membuka `Dialog` berisi judul (nama + Badge status) & **preview live** dari `config/componentPreviews.jsx`. Diimplementasi untuk **Accordion, Alert, Alert Dialog, Aspect Ratio, Avatar** (konten placeholder generik); **Attachment** (pending) menampilkan pesan "not yet available". Primitive ✅ diaktifkan: **dialog, accordion, alert-dialog, aspect-ratio**; status baris tabel untuk komponen ini diperbarui ke Established. Komponen lain (non-A) membuka dialog dengan fallback "Preview not implemented yet". |
| Update 15 | **Spacing System diformalkan.** Ditambahkan **BAGIAN 2B — Spacing System** (26 poin: Spacing Scale, Margin, Padding, Gap, Section, Component, Form, Card, Table, Modal, Drawer, Sidebar, Header/Toolbar, List Item, Navigation, Button, Input, Icon, Content Width & Container Padding, Responsive, Density, Do's & Don'ts + tambahan Chart/Empty-state/Overlay Offset/Separator). Semua nilai diturunkan dari penggunaan nyata (mis. root `space-y-6`, form `space-y-5`, Card/Dialog/Sheet `p-6`, tabel `h-10 px-2`/`p-2`, button `h-9 px-4 py-2 gap-2`, input `h-9 px-3 py-1`, sidebar `16rem/3rem/18rem`). **R03** diperbarui merujuk skala ini. |
| Update 16 | **Menu "Components" jadi grup + submenu.** `navigation.js`: item **Components** kini collapsible dgn children **Base Components** (`/design-system/components/base`) & **Composite Component** (`/design-system/components/composite`). Base = halaman tabel shadcn (judul → "Base Components"); Composite = `PlaceholderPage` (blank, menunggu konten). Rute lama `/design-system/components` → redirect ke `/base`. Sidebar preview & breadcrumb otomatis mengikuti (bersumber dari `navSections`). |
| Update 17 | **Audit konsistensi Typography (2A) & Spacing (2B) pada halaman existing.** Diperiksa: Login, Dashboard, Base Components, Sample Blocks (semua), Sample Charts (semua). Deviasi diperbaiki: (a) `AuthLayout` list item `gap-3.5` (off-scale) → `gap-3`; (b) `tickMargin` diseragamkan ke **8** (Bar & Tooltips sebelumnya 10) agar konsisten dgn area/line & rule Chart Spacing; (c) `ChartCard` `CardTitle` → `text-base` (eksplisit H3 sesuai 2A, selaras `ComponentsPage`). Sisanya sudah patuh (root `space-y-6`, grid `gap-4`, Card `p-6`, form `space-y-5`, PageHeader H1 `text-2xl`). Dashboard tetap `flex gap-4` (blok demo, nilai on-scale). |
| Update 18 | **Audit Improvement — registri & aturan baru (BAGIAN 2C).** Ditambahkan (tanpa mengubah aturan lama): **2C.1 State Registry**, **2C.2 Size System (SSOT dimensi)**, **2C.3 Responsive Rules**, **2C.4 Density Rules** (Compact default / Comfortable dicadangkan), **2C.5 Interaction Rules** (+Cursor, Click Feedback), **2C.6 Form Rules**, **2C.7 Table Rules**, **2C.8 Icon Rules**, **2C.9 Content Rules**, **2C.10 Naming Convention**, **2C.11 Composition Rules**, **2C.12 Page Template Registry**, **2C.13 Registry Audit**. Sub-bagian merujuk R11–R16/R09/R25/R31 & 2A/2B untuk hindari duplikasi. **Dedup:** baris `card` yang terdaftar dua kali di 1.1 disatukan (SSOT). |
| Update 19 | **Page Specification: template + 2 spec turunan.** Dibuat `PAGE_SPEC_TEMPLATE.md` (acuan wajib, struktur: Informasi Halaman, Tujuan, Layout, Component Registry, Component Composition, User Interaction Flow, Responsive, Accessibility, States, Empty/Loading/Error, Permissions opsional, Notes, Changelog — semua generic). Ditambah `DASHBOARD_PAGE_SPEC.md` & `MASTER_DATA_PAGE_SPEC.md` (🔵 Proposed, UI/struktur saja, tanpa konteks bisnis). Registry 2C.12 diperbarui (Login/Dashboard/Master Data = ✅ ada spec) + rujukan template. |
| Update 20 | **Koreksi Roadmap — Page Specification ditunda.** `DASHBOARD_PAGE_SPEC.md` & `MASTER_DATA_PAGE_SPEC.md` **dihapus** (dibuat terlalu dini). `PAGE_SPEC_TEMPLATE.md` dipertahankan sebagai **template dokumentasi generic** (struktur diselaraskan: "User Interaction Flow"→**User Flow**, bagian **Permissions dihapus**; bagian akhir: Notes, Changelog). 2C.12 diperbarui: semua Page Spec konkret → ⚪ Deferred + urutan roadmap resmi (Foundation → Registry → Base → Composite → Sample Blocks → Layout Patterns → Template → Page Specs). Fokus dev berikutnya: menuntaskan Base & Composite Components, Sample Blocks reusable, Layout Patterns. |
| Update 21 | **Base Components — preview huruf B.** Ditambah preview live di `config/componentPreviews.jsx` untuk **Badge** (4 varian), **Breadcrumb** (trail generic Application Name › Feature One › Current Page), **Button** (6 varian + ukuran sm/default/lg/icon/disabled). **Bubble** & **Button Group** = pending → dialog menampilkan "not yet available". Diverifikasi via 5 assertion Playwright (PASS). |
| Update 22 | **Base Components — SEMUA preview selesai.** `config/componentPreviews.jsx` kini memuat preview live untuk **seluruh 45 komponen non-pending** (A–Z), termasuk yang kompleks: Calendar, Chart (recharts), Carousel, Command, Resizable, Sidebar (mini), Menubar, Navigation Menu, Select, Dialog/Sheet/Drawer (nested), Input OTP, dll. Semua status **Available → Established** (karena kini didemokan). 18 komponen **pending** (Attachment, Bubble, Button Group, Combobox, Data Table, Date Picker, Empty, Field, Input Group, Item, Kbd, Marker, Message, Message Scroller, Native Select, Spinner, Typography) menampilkan "not yet available". **Diverifikasi testing_agent (frontend 100%)**: 29 preview berisiko-tinggi render tanpa error runtime, 3 pending fallback benar, tabel tetap berfungsi setelah buka/tutup beruntun. |
| Update 23 | **12 komponen "pending" diport → Established.** Ditambah primitive JSX baru: `spinner, kbd, empty, button-group, input-group, field, item, native-select, typography` (+ preview live), serta 3 komposisi stateful di `components/previews/AdvancedPreviews.jsx`: **Combobox** (Popover+Command), **Date Picker** (Popover+Calendar), **Data Table** (dependency baru **`@tanstack/react-table@8.21.3`**). Semua 12 kini Established dgn preview. **Tetap Pending (6, sesuai keputusan):** chat/AI kit `Attachment, Bubble, Marker, Message, Message Scroller` (di luar scope enterprise). Perbaikan minor: Date Picker auto-close saat pilih tanggal; teks fallback dialog dikonsolidasi jadi satu ("...not yet available..."). **Diverifikasi testing_agent (frontend 100%, 0 console error).** |
| Update 24 | **`Direction` dihapus total + 3 komponen chat diport → Established.** (a) Komponen **`Direction` (RTL)** dihapus tuntas dari kode & seluruh dokumentasi (atas perintah user). (b) Diport primitive JSX baru presentational (100% Tailwind + cva, pola `message.jsx`): **`attachment.jsx`** (Attachment/Media/Content/Title/Description/Actions/Action/Trigger/Group; state idle→done, 3 size, orientation, shimmer via `animate-pulse`), **`bubble.jsx`** (7 varian via cva + align start/end, BubbleGroup, BubbleContent context, BubbleReactions), **`marker.jsx`** (varian default/border/separator + MarkerIcon/MarkerContent). Ketiganya + **Message** (diport lebih dulu) kini **Established** dgn preview live di `componentPreviews.jsx`. (c) **Tetap Pending (1):** `Message Scroller` — bukan primitive styling, melainkan **engine headless streaming `@shadcn/react`** (MessageScrollerProvider + hooks imperatif untuk anchoring/auto-scroll/prepend). Menunggu keputusan user untuk menambah dependency berat tsb. **Base Components: 60/61 Established.** Diverifikasi via screenshot (3 preview render, 0 error). |
| Update 25 | **Message Scroller diport (versi styled) + submenu Composite Component diisi 15 komponen.** (a) **`message-scroller.jsx`** dibuat sebagai versi *styled sederhana tanpa engine `@shadcn/react`* (Context lokal: viewportRef + auto-scroll-to-bottom saat di dasar + tombol "jump to latest" muncul saat scroll ke atas). Parts: MessageScroller/Viewport/Content/Item/Button. Status → **Established** dgn preview live. **Base Components: 61/61 Established (tuntas).** (b) **Submenu "Composite Component"** (sebelumnya PlaceholderPage) kini halaman tabel `CompositeComponentsPage.jsx` (kolom: No, Name, **Dependency**, Status, Action/Eye→Dialog) + config `config/compositePreviews.jsx`. Berisi **15 composite** (semua Established, generik, monochrome): **Tanpa dep (9):** Autocomplete (Command+Popover), Rating, Stepper, List (Item), Cookie Banner, Preloader (Spinner+Skeleton), Widget (Card+Badge), Placeholder (Empty), Data Grid (`@tanstack/react-table` — sudah ada). **Dengan dep baru (6):** Code Block (`react-syntax-highlighter`, Prism oneLight), Markdown (`react-markdown`+`remark-gfm`), Phone Input (`react-phone-number-input`), Input Mask (`react-imask`), Kanban (`@dnd-kit/core`+`sortable`+`utilities`, multi-kolom drag), Sortable (`@dnd-kit/sortable`, reorder vertikal). Semua composite disimpan di `src/components/composite/`. **R37 (Dependency Exception) diperluas** untuk mengizinkan lib di atas. Compile sukses (0 error webpack). *Catatan: verifikasi visual screenshot tertunda karena gangguan tool platform; kode ter-compile bersih.* |
| Update 26 | **Sinkronisasi Governance (siap review).** Registry & aturan diselaraskan penuh dgn kode: (a) **1.1 Primitives** diperbarui → semua ✅ (tambah baris: chat kit `attachment/bubble/marker/message`, `message-scroller` styled, serta `spinner/kbd/empty/button-group/input-group/field/item/native-select/typography`), ditandai **61/61 Established**. (b) **1.2** ditambah pattern **Composite Components Table + Dialog**. (c) **Baru: 1.4 Composite Components** — tabel 15 composite (base penyusun + dependency + file). (d) **R37** diperluas + aturan "dependency terikat komponen, tidak boleh menyebar". (e) **Bagian 3 Pending** dimutakhirkan: Message Scroller ✅ Done, Empty State pattern ✅ Done (composite Placeholder). (f) `DESIGN_SYSTEM_RULES.md` disinkronkan (Bagian 1 pengecualian dependency + Bagian 5 inventaris 61 primitive + daftar composite). Semua verifikasi visual composite (15/15) render 0-error. |
| Update 27 | **Menu "Components" digabung (single) + menu baru "Sample Layout".** (a) **Navigasi:** item **Components** diubah dari grup collapsible menjadi **item tunggal** → route `/design-system/components`. Route lama `/base` & `/composite` kini **redirect** ke `/components`. (b) **Halaman Components gabungan:** `ComponentsPage.jsx` kini menggabungkan **Base (62) + Composite (15) = 77** komponen, diurut **A–Z** (`localeCompare`), dengan kolom baru **Type** (Base/Composite Badge). Preview di-resolve per-`kind` (`componentPreviews` vs `compositePreviews`); `CompositeComponentsPage.jsx` menjadi tidak terpakai (tak dirute) tetapi `config/compositePreviews.jsx` tetap dipakai. (c) **Menu baru "Sample Layout" (grup, ikon `LayoutTemplate`)** dgn 3 halaman di `pages/layouts/`: **DataTable** (`DataTableLayoutPage.jsx` — tanstack: toolbar search + Columns visibility + Add, row-selection, sortable, status Badge, row actions DropdownMenu, pagination), **Form Elements** (`FormElementsPage.jsx` — galeri semua elemen form dalam grid Card), **Form Layout** (`FormLayoutPage.jsx` — form rhf+zod bersection, 2-kolom, Save/Cancel). Route `/design-system/layouts/{datatable, form-elements, form-layout}`. 1.2 Patterns ditambah 3 baris. **Diverifikasi via screenshot:** merged 77 baris A–Z + preview Composite (Kanban) resolve benar; 3 halaman render; validasi Form Layout jalan (4 pesan error). 0 console error. |
| Update 28 | **Card → konsep header/body/footer (uji reusability).** Primitive tunggal `ui/card.jsx` diubah: `CardHeader` +`border-b border-border` (pemisah header↔body), `CardContent` `p-6 pt-0`→`p-6`, `CardFooter` +`border-t border-border` (pemisah body↔footer). Semua warna tetap **monochrome token** (referensi gambar hanya acuan struktur, bukan warna biru). Perubahan **satu file** otomatis terpropagasi ke seluruh Card di app (Login, Components, Form Elements, Form Layout, ChartCard, Widget) — **membuktikan reusability**. Docs disinkronkan: 1.1 (baris `card`), 2B.8 (Card Spacing), 2C.11 (Composition). Diverifikasi via screenshot (4 halaman render, divider tampil, 0 error). |
| Update 29 | **Card spacing dirapatkan ke Compact.** Update 28 sempat memakai `p-6` penuh per section → batas divider jadi 48px (terlalu lega, melanggar R03 Compact). Diperbaiki: `CardHeader/Content/Footer` → **`px-6 py-4`** (horizontal 24px, vertikal 16px; keduanya kelipatan-4) sambil mempertahankan divider `border-b`/`border-t`. Docs 2B.8 disinkronkan. Typography (title `text-base`, body `text-sm`) & warna monochrome tetap sesuai. |
| Update 30 | **Aturan keras baru: R38 — Component Modification Invariants (Non-Negotiable).** Dipicu insiden Update 28→29 (spacing sempat longgar saat modifikasi Card). Ditambah **R38** di registry aturan `DESIGN_SYSTEM.md`: setiap modifikasi komponen `ui/`/`composite` wajib menjaga Compact/2B, Typography/2A, warna token-only (R06/R29 — gambar referensi = acuan struktur, bukan warna), density, + verifikasi dampak ke semua konsumen (min. 2–3 halaman). Disinkronkan ke `DESIGN_SYSTEM_RULES.md`: **Bagian 8** (kontrak non-negotiable, merujuk R38 sebagai SSOT) + 1 item **Checklist Bagian 7**. |
| Update 31 | **Dialog → konsep header/body/footer (selaras Card, patuh R38).** `ui/dialog.jsx`: `DialogContent` `p-6 gap-4`→`p-0 gap-0`; `DialogHeader` +`border-b border-border px-6 py-4`; `DialogFooter` +`border-t border-border px-6 py-4 gap-2`. Body dibungkus `px-6 py-4` oleh konsumen. Compact (py-4), monochrome, tanpa perubahan typography. Konsumen disesuaikan: `ComponentsPage.jsx` (wrapper body preview) & preview `Dialog` di `componentPreviews.jsx` (tambah body placeholder). `command.jsx` (CommandDialog) sudah `p-0` (aman); `alert-dialog.jsx` primitive terpisah (di luar scope). Docs disinkronkan: 2B.3/2B.4/2B.10, Do-list, 2C.11 (+baris Dialog). **Verifikasi R38 (2 konsumen):** outer preview dialog & sample dialog render header↔body↔footer ber-divider; 0 console error. |
| Update 32 | **Audit Compact UI menyeluruh (R03/2B).** Diperiksa seluruh `ui/`, `composite/`, & pages. Hasil: mayoritas patuh (button/input `h-9`, Card/Dialog section `px-6 py-4`, composite `gap-4` + tombol `sm`). **Diperbaiki:** `FormLayoutPage` yang lebih longgar → `space-y-8`→`space-y-6`, `space-y-5`→`space-y-4`, `grid gap-5`→`gap-4`. **Bukan pelanggaran (dikecualikan/terdokumentasi):** panel auth `p-10/xl:p-14` & judul auth `text-2xl/3xl` (2B/2A), `PageHeader` H1 `text-2xl` (24px, dalam skala 2A), metric Widget `text-2xl`. **Default shadcn (dibiarkan):** Command palette `h-12`/item `py-3`, Empty state `gap-6 p-6` — standar shadcn, bisa dirapatkan bila diminta. |
| Update 33 | **Command & Empty dirapatkan → 100% seragam compact (patuh R38).** `command.jsx`: `CommandInput` `h-10 py-3`→`h-9 py-2`; wrapper `CommandDialog` `cmdk-input h-12`→`h-9`, `cmdk-item py-3`→`py-1.5`, svg `h-5 w-5`→`h-4 w-4`; `CommandEmpty` `py-6`→`py-4`. `empty.jsx`: root `gap-6`→`gap-4` (`p-6` tetap). Semua pada 4px-grid, monochrome, typography tak berubah. **Verifikasi R38 (konsumen):** preview Command, Empty, & composite Placeholder render compact & rapi; 0 console error. Kini seluruh komponen (base + composite) konsisten ritme compact enterprise. |
| Update 34 | **`autoComplete="off"` jadi default base `Input` & `Textarea`.** Mencegah autofill browser di seluruh form generik (overridable via prop). Field auth tetap pakai nilai semantik (`current-password`/`email`) demi password manager. Ditambah aturan **2C.6 Form Rules → Autocomplete**. |
| Update 35 | **Komponen baru: `PasswordInput` (composite) — toggle mata distandarkan.** Pola show/hide password dari halaman Login diekstrak jadi `components/composite/PasswordInput.jsx` (Input + Button ghost + state; `pr-10`, ikon `Eye`/`EyeOff` `h-4 w-4`, `aria-label` dinamis, `tabIndex={-1}`). **Single-source:** `LoginForm` di-refactor memakainya (perilaku identik), dan `FormElementsPage` field Password kini memakainya. Didaftarkan: `compositePreviews.jsx` + `ComponentsPage` (Composite; total merged 77→**78**), Registry 1.4 +1 baris. **Verifikasi R38 (2 konsumen):** Login toggle reveal berfungsi & Form Elements menampilkan ikon mata; autofill hilang; 0 console error. |
| Update 36 | **Form Layout → kumpulan 4 sample form dasar.** `FormLayoutPage.jsx` diubah dari 1 form profil menjadi grid (`lg:grid-cols-2`) berisi 4 card auth: **Login** (email + password + remember me), **Register** (name + email + password + confirm), **Reset Password** (email), **Change Password** (current + new + confirm). Semua pakai Card header/body/footer (submit `w-full` di footer ber-divider), `react-hook-form`+`zod` (termasuk `refine` cocok-password), `PasswordInput`, field-stack `space-y-5` (2B.7). 1.2 Patterns diperbarui. **Verifikasi:** 4 card render + validasi Register (4 pesan error) jalan; 0 console error. Fondasi untuk menambah sample form berikutnya. |
| Update 37 | **P3 selesai: Design Token 2-layer + Dark Mode.** (a) **`index.css` di-refaktor jadi arsitektur token 2-layer:** **Layer 1 primitives** `--neutral-0..950` (skala monochrome mentah) + `--red-500/900` (destructive) + `--hue-chart-1..5` — theme-independent, HSL mentah, tidak dikonsumsi langsung. **Layer 2 semantic** (`--background/--foreground/--primary/--border/--sidebar-*/...`) me-*reference* Layer 1 via `var()` (mis. `--background: var(--neutral-0)`). `:root`=light, `.dark`=remap semantic→primitive (chain `hsl(var(--background))`→`hsl(var(--neutral-0))`). (b) **Dark Mode aktif:** `components/theme-provider.jsx` (context Light/Dark/System, persist `localStorage` key `ui-theme`, "system" tracking `matchMedia` live + listener) di-wire di `index.js`; `components/mode-toggle.jsx` (DropdownMenu Sun/Moon/Monitor, highlight opsi aktif) dipasang di header kanan atas `AppLayout`. (c) **Halaman baru "Design Tokens"** (`pages/DesignTokensPage.jsx`, route `/design-system/tokens`, ikon `Palette` di nav) — Layer 1 swatch (nilai HSL) + Layer 2 swatch (`hsl(var(--token))` remap live) dgn badge L/D mapping. (d) Docs disinkronkan: **R28** (arsitektur 2-layer + toggle), **B1 ✅ Done**, 2C.10 (Design Tokens), 1.2 Patterns (+Design Tokens gallery, +Theme system, Form Layout diperbarui). **Verifikasi via screenshot:** light & dark render benar (semantic swatch remap live, primitive konstan), toggle→`.dark` pada `<html>` bekerja; 0 console error. |
| Update 38 | **P2: Page Specifications (Dashboard & Master Data) — dokumen spec dibuat.** Layout Patterns kini matang → roadmap membuka pembuatan Page Spec konkret. Dibuat 2 dokumen (🔵 Proposed, **struktur & UI saja**, generik, turunan `PAGE_SPEC_TEMPLATE.md`, semua nilai **merujuk** registry/aturan): (a) **`DASHBOARD_PAGE_SPEC.md`** — `AppLayout`, route `/`; section: PageHeader → **Stat Cards** (grid Widget) → **Charts** (1–2 ChartCard, R33) → **Recent Activity** (Table card-wrapped, 2C.7); lengkap dgn Composition tree, User Flow, Responsive (2C.3), A11y (R17), States (Empty/Loading/Error). (b) **`MASTER_DATA_PAGE_SPEC.md`** — pola **DataTable layout** (`DataTableLayoutPage`); section: PageHeader(+Add Item) → Toolbar (search + filter/Columns) → DataTable (row-selection, sortable `aria-sort`, status Badge, row actions DropdownMenu + Delete→AlertDialog) → Pagination; A11y & States sesuai 2C.1/2C.7. Registry **2C.12** diperbarui: Dashboard & Master Data → **🔵 Proposed** (spec ada). Implementasi halaman **belum** dibuat (sesuai keputusan user: dokumen spec saja). |
| Update 39 | **Fix: Combobox & Date Picker full-width di Form Elements.** Trigger `ComboboxPreview` (`w-[220px]`) & `DatePickerPreview` (`w-[240px]`) berlebar tetap → di `FormElementsPage` label tampil inline & kontrol tidak selaras dgn Select/Native Select (yang `w-full`). Ditambah prop opsional `className` pada kedua preview; `FormElementsPage` meneruskan `w-full` (Combobox: PopoverContent ikut `w-[--radix-popover-trigger-width]`). Lebar tetap dipertahankan sebagai default saat tanpa prop (dialog preview halaman Components tak berubah). Input OTP kini juga full-width di Form Elements (lihat Update 40). Diverifikasi via screenshot: kedua kontrol kini full-width, label bertumpuk, seragam. |
| Update 40 | **Input OTP full-width di Form Elements (awalnya override per-halaman).** Disempurnakan di Update 41 menjadi default komponen (hibrida). |
| Update 41 | **Hibrida: Combobox, Date Picker & Input OTP → default full-width + opt-out lebar tetap.** Atas keputusan user (filosofi design system konsisten): ketiga kontrol kini **default `w-full`** (mengikuti lebar container, perilaku paling umum untuk form) dengan **opt-out** bila butuh lebar tetap. (a) **`AdvancedPreviews.jsx`** — `ComboboxPreview`/`DatePickerPreview` trigger default `w-full` (opt-out via prop `className`, mis. `w-[220px]`); PopoverContent Combobox pakai `w-[--radix-popover-trigger-width]` (selalu match trigger, full/fixed). (b) **Primitive `ui/input-otp.jsx`** — `InputOTP` container `w-full`, `InputOTPGroup` `w-full`, `InputOTPSlot` `w-9`→**`flex-1`** (slot melebar rata); opt-out lebar tetap via `className` (mis. slot `flex-none w-9`, group `w-auto`). (c) Override per-halaman di `FormElementsPage` **dihapus** (kini ikut default). **Verifikasi R38 (3 konsumen):** Form Elements (Combobox/Date Picker/OTP full-width, label bertumpuk), Form Layout (kartu OTP mengisi lebar kartu), dialog preview Components (Input OTP 6 slot penuh & rapi) — semua render benar, 0 console error. |
| Update 42 | **Form Layout diperkaya: Multi-step Wizard + Profile/Settings (section full-width).** Atas permintaan user. (a) **Composite `Stepper.jsx` di-refactor** → ekstrak sub-komponen **`StepIndicator`** (presentational, terkontrol via `steps`/`current`) yang reusable; `Stepper()` standalone (katalog) tetap identik perilakunya (R38 — preview Composite tak berubah). (b) **`WizardCard`** — 1 `react-hook-form`+`zod`, 3 langkah **Account** (email+password) → **Profile** (full name+Role Select) → **Review** (ringkasan read-only); **validasi per-langkah** via `form.trigger(fields)` sebelum lanjut; navigasi Back/Next, langkah akhir Finish (toast). (c) **`ProfileSettingsCard`** — Avatar (fallback "JD") + Change photo + hint, grid Full name/Email, Role Select, Bio Textarea (max 200), 2 preferensi **Switch** ber-border (Email/Marketing) dgn `FormDescription`, footer Cancel(reset)/Save. Keduanya Card header/body/footer, monochrome, generik, diletakkan **full-width** di bawah grid form yang ada. Docs 1.2 (Form Layout) & 1.4 (Stepper→StepIndicator) disinkronkan. **Verifikasi via screenshot:** wizard maju ke step Profile setelah isi Account+Next (validasi per-langkah jalan); Profile/Settings render lengkap (Switch, footer); 0 console error. |
| Update 43 | **Wizard & Profile dipindah ke "Sample Blocks" + peningkatan unsaved-changes.** Atas permintaan user, keduanya dikeluarkan dari halaman **Form Layout** (kembali ke 6 form dasar) menjadi halaman block tersendiri. (a) **`pages/blocks/ProfileBlockPage.jsx`** (submenu **Profile**, route `/design-system/blocks/profile`) — Profile & Settings + **unsaved-changes**: tombol **Save & Cancel disabled sampai `form.formState.isDirty`**, indikator "Unsaved changes" di footer, `form.reset(data)` me-reset baseline setelah save (form tak lagi dirty). (b) **`pages/blocks/WizardBlockPage.jsx`** (submenu **Wizard**, route `/design-system/blocks/wizard`) — Multi-step Wizard (StepIndicator + validasi per-langkah). Nav `Sample Blocks` kini: Sidebar, Login, Forgot, **Profile**, **Wizard**. `FormLayoutPage` dibersihkan (import & komponen Wizard/Profile dihapus). Docs 1.2 disinkronkan (Form Layout direvert; +Profile Block, +Wizard Block). **Verifikasi via screenshot:** Profile (Save disabled→enabled saat edit, indikator muncul), Wizard (step Account→indicator), 0 console error. |
| Update 44 | **Composite Phone Input dirombak (pola "Phone Input 1").** `PhoneInputField.jsx` dibangun ulang di atas `react-phone-number-input` low-level dgn komponen shadcn: **country selector** = `Popover`+`Command` (search "e.g. United States" + daftar scrollable **bendera + nama + kode negara** dari `react-phone-number-input/flags` & `getCountryCallingCode`, ikon `Check` untuk terpilih) yang **digabung** dgn Input nomor (`rounded-e-none`/`rounded-s-none`). Sesuai permintaan user: **trigger menampilkan KODE negara (mis. `+1`), bukan bendera**. Format input **nasional** (mis. `(201) 555-0123`) agar tak duplikat kode; nilai tersimpan tetap E.164. Dependency `react-phone-number-input` tetap terikat composite ini (R37). **Verifikasi via screenshot (dialog preview Components):** trigger `+1`, dropdown bendera+nama+kode, input format nasional; 0 console error. |
| Update 45 | **Profile block dirapatkan ke ritme compact (R03/2B).** Feedback user: UI terasa longgar. `ProfileBlockPage.jsx`: `CardContent` `space-y-6`→**`space-y-5`**, Avatar `h-16 w-16`→**`h-12 w-12`** (fallback `text-base`→`text-sm`), grid name/email `gap-5`→**`gap-4`**. Semua tetap 4px-grid, monochrome, typography & fungsi (unsaved-changes) tak berubah. Diverifikasi via screenshot. |
| Update 46 | **Wizard block dirapatkan + aturan compact diperketat (cegah kambuh).** Audit pemicu feedback user: `WizardBlockPage.jsx` `CardContent` masih `space-y-6` (longgar) → **`space-y-5`**. **Akar masalah:** `space-y-6` dipakai di dalam Card, padahal `space-y-6` khusus **root halaman** (2B.5). **Perbaikan aturan:** **2B.8 Card Spacing** kini memuat **INVARIAN wajib** — stacking di dalam `CardContent` = `space-y-5`/`space-y-4`, **`space-y-6` DILARANG di dalam Card**, berlaku juga untuk **halaman/blok baru**. Audit menyeluruh: seluruh `space-y-6` lain adalah **root `-page`** (benar) & 2 `<section>` di DesignTokens (tingkat page, dibiarkan). Diverifikasi via screenshot. |
| Update 47 | **Governance diperkuat + guard otomatis (cegah insiden compact terulang).** Atas permintaan user setelah insiden Update 45–46. (a) **Aturan formal baru `R39` — "Compact Density — Semua UI (Non-Negotiable)"** di registry `DESIGN_SYSTEM.md`: memperluas R03/R38 agar berlaku untuk **halaman/blok/section baru**, bukan hanya modifikasi komponen. (b) **Tabel Keputusan `space-y` (SSOT)** ditambah di **2B.5**: root/section = `space-y-6`; isi `CardContent` = `space-y-5`/`space-y-4`; **`space-y-6` DILARANG di dalam Card**. (c) **`docs/design-guard.sh`** — skrip grep heuristik yang men-scan kode fitur (pages/composite/layout; kecualikan `ui/` primitive & file preview/katalog) untuk anti-pattern: space-y-6-di-Card, warna hardcode, hex, emoji, avatar oversize, gap-5; **gagal (exit 1)** bila ada pelanggaran. Didokumentasikan di **2C.14** (wajib lolos sebelum finish). (d) **`DESIGN_SYSTEM_RULES.md`** ditambah: 2 item Checklist §7 (COMPACT + GUARD), **Bagian 9** (Compact Density + tabel `space-y`), **Bagian 10** (Panduan Kepatuhan Agen: baca-dulu → tiru pola → tanya root/Card saat menulis → jalankan guard + checklist sebelum finish → lapor bila ragu → `// guard-allow` untuk pengecualian terdokumentasi). **Verifikasi:** `design-guard.sh` dijalankan → **clean (exit 0)** setelah perbaikan Profile & Wizard. |
| Update 48 | **DataTable: audit compact (lolos) + kontrol Density ("Data Table 1").** Cek atas permintaan user. **Audit:** `DataTableLayoutPage.jsx` sudah patuh (CardContent `space-y-4`, toolbar `gap-2`, tombol `size-sm`/`size-8`, tabel default primitive); guard **clean**. **Fitur baru** (mengikuti referensi shadcnstudio "Data Table 1" = *density table*): kontrol **Density** di toolbar (`DropdownMenu`+`DropdownMenuRadioGroup`, ikon `Rows3`+`ChevronDown`) dengan preset **Compact (`py-1`, default) / Standard (`py-2`) / Comfortable (`py-3`)**; class density diterapkan ke `TableHead` (`h-8/10/12`) & `TableCell` (`py-*`) via `className` (twMerge). Docs **2C.7** disinkronkan (+baris Row Density). **Verifikasi:** padding sel terkomputasi cocok (4/8/12px) + screenshot default compact; guard clean; 0 console error. |
| Update 49 | **DataTable disempurnakan (permintaan user berturut).** `DataTableLayoutPage.jsx`: (a) **Density dipersist ke `localStorage`** (`dt-density`, default compact) via `useEffect`. (b) Tombol **Add dipindah ke `CardHeader`** (`flex-row justify-between space-y-0`); tombol & **fungsi Columns dihapus** (state `columnVisibility` dibuang). (c) **Rows-per-page** `Select` (`h-8`, opsi 8/16/24) di footer + teks rentang `{first}–{last} of {total}` & `Page x of y`. (d) **Semua header sortable & konsisten** — komponen baru `SortableHeader` (ghost button bergaya `text-muted-foreground font-medium`, ikon `ArrowUp/ArrowDown/ArrowUpDown`) dipakai untuk Name/Email/Role/Status (sebelumnya hanya Name = tombol foreground, sisanya teks muted → **inkonsistensi diperbaiki**). (e) **`thead` diberi `bg-muted/50`** agar kontras dari body. (f) **Row actions**: hapus label "Actions", tiap item beri ikon (`Eye`/`Pencil`/`Trash2`), Delete `text-destructive focus:text-destructive`. Docs **2C.7** ditambah 5 aturan. **Verifikasi via screenshot:** Add di header, tanpa Columns, 4 header ber-ikon-sort seragam, thead abu-abu, menu aksi ber-ikon tanpa judul, rows-per-page + showing; guard clean; 0 console error. |
| Update 50 | **DataTable: hover sort full-cell + Faceted Column Filter (Role & Status).** Atas permintaan user. (a) **Hover sort menutupi seluruh `th`** (bukan hanya teks): `SortableHeader` kini `h-full w-full justify-start rounded-none px-2` dan `TableHead` sortable diberi `p-0` (via `cn` + `h.column.getCanSort()`). (b) **Filter per-kolom** untuk **Role & Status** saja (kategorikal): komponen `FacetedFilter` (Button border-dashed + `DropdownMenuCheckboxItem` + Badge jumlah + Clear); kolom `role`/`status` set `filterFn` array-includes; wiring state `columnFilters` + `onColumnFiltersChange`. Sort tetap di semua kolom (tidak dibatasi). Docs **2C.7** disinkronkan (Sortable Header full-cell + Faceted Column Filter). **Verifikasi via screenshot:** Role=Admin → 8 baris (footer "1–8 of 8", badge "1"), hover Email menutupi sel penuh; guard clean; 0 console error. |
| Update 51 | **Sinkronisasi dokumentasi DataTable (implemented-vs-docs) + `aria-sort`.** Atas permintaan user (catat yang sudah diterapkan tapi belum terdokumentasi). (a) **1.2 Patterns — baris "DataTable layout" dimutakhirkan** dari deskripsi usang ("search + Columns + Add + sortable + pagination") menjadi snapshot lengkap saat ini: global search + Faceted Filter (Role/Status) + Density, Add di `CardHeader`, SortableHeader full-cell (`aria-sort`), `thead bg-muted/50`, row actions ber-ikon tanpa label, empty state, footer rows-per-page + rentang "showing", density persist `localStorage`. (b) **Kode: `aria-sort` ditambahkan** ke `TableHead` sortable (`ascending`/`descending`/`none`) agar sesuai aturan **2C.7 Sorting** (sebelumnya aturan mensyaratkan tapi kode belum menyetel) — perbaikan a11y. (c) **2C.7 disempurnakan:** butir *Search* menyebut **global filter** tanstack; butir *Sorting* dirujuk ke `SortableHeader` + wajib `aria-sort`. **Verifikasi:** guard clean; compile sukses; `aria-sort` aktif di header. |
| Update 52 | **Contoh Dialog Form (Add User) di Form Elements.** Atas permintaan user. Ditambah kartu **"Dialog Form"** berisi tombol full-width pembuka **`AddUserDialog`** (`pages/layouts/FormElementsPage.jsx`): `Dialog` dgn pola **header/body/footer ber-divider** (R38 — `DialogContent p-0`, header/footer `px-6 py-4` + border, body wrapper `space-y-4 px-6 py-4`), form **`react-hook-form`+`zod`** (Full name, Email, Role Select — semua wajib, `FormMessage`), footer **Cancel** (`DialogClose`) + **Save user** (submit → `toast` sukses + tutup + `form.reset()`); reset otomatis saat dialog ditutup. 1.2 Patterns (baris Form Elements) disinkronkan. **Verifikasi via screenshot:** dialog buka, submit kosong menampilkan 3 pesan validasi, layout compact/monochrome; guard clean; 0 console error. |
| Update 53 | **DataTable → CRUD lengkap (contoh enterprise, state lokal) + fix doc 2B.10.** Atas permintaan user. **(Doc)** 2B.10 Modal Spacing diperbaiki dari nilai usang `DialogContent p-6 gap-4` → **`p-0 gap-0`** + header/body/footer `px-6 py-4` ber-border (selaras Update 31; **tidak ada perubahan komponen dasar**, hanya sinkronisasi doc). **(Fitur)** `DataTableLayoutPage.jsx`: data jadi **state lokal** (`rows`); **Create/Update** via `UserFormDialog` (Dialog header/body/footer, rhf+zod: name/email/role/status) — tombol **Add** (CardHeader) buka mode add, row action **Edit** buka mode edit prefilled (`useEffect`→`form.reset`); **Delete** via **`AlertDialog`** konfirmasi (aksi `bg-destructive`); handler CRUD lewat `table.options.meta` (onView/onEdit/onDelete), `getRowId` stabil; **toast** tiap aksi (created/updated/deleted). Tanpa backend (sesuai permintaan). Docs 1.2 (baris DataTable) disinkronkan. **Verifikasi via automation:** Create (validasi 6 pesan + baris "Zed Alpha" muncul), Delete (konfirmasi → terhapus + toast); guard clean; compile sukses; 0 console error. |
| Update 54 | **Fix primitive `AlertDialog` → pola header/body/footer (root cause) + Bulk Delete.** **Akar masalah (dijawab ke user):** pola divider Update 31 hanya menyentuh primitive `Dialog`; **`AlertDialog` tak pernah diselaraskan** → dialog Delete tampil tanpa divider. **Fix di level primitive** (`ui/alert-dialog.jsx`, R38): `AlertDialogContent` `p-0 gap-0`, `AlertDialogHeader` `border-b px-6 py-4 space-y-1.5`, `AlertDialogFooter` `border-t px-6 py-4 gap-2 sm:justify-end`, `AlertDialogCancel` buang `mt-2` (pakai gap footer) → **semua AlertDialog otomatis patuh** (prevention by default). Konsumen diverifikasi: `DataTableLayoutPage` (delete) & `componentPreviews` (katalog). **Pencegahan doc:** 2B.10 diperluas jadi "Dialog & AlertDialog" (kedua primitive wajib konsisten). **Fitur (Potential improvement): Bulk Delete** — tombol **"Delete (n)"** (`text-destructive`) muncul di toolbar saat ada baris terpilih → `AlertDialog` konfirmasi → hapus baris terpilih (`getFilteredSelectedRowModel`) + clear selection + toast. Docs 1.2 (baris DataTable) disinkronkan. **Verifikasi via screenshot/automation:** dialog Delete kini ber-divider header/footer; pilih 2 baris → Delete(2) → konfirmasi → 24→22 baris; guard clean; 0 console error. |
| Update 55 | **AlertDialog: deskripsi dipindah ke BODY (3 seksi terlihat).** Atas permintaan user. Pada `DataTableLayoutPage` (dialog Delete tunggal & Bulk), `AlertDialogDescription` dikeluarkan dari `AlertDialogHeader` ke **wrapper body `px-6 py-4`** tersendiri → struktur jelas **Header (judul, border-b) · Body (deskripsi) · Footer (tombol, border-t)**. Doc 2B.10 diperbarui: header hanya judul; taruh `AlertDialogDescription` di body untuk konfirmasi. **Verifikasi via screenshot:** dialog Delete menampilkan 3 seksi terpisah divider; guard clean; 0 console error. |
| Update 56 | **Sinkronisasi dokumentasi menyeluruh + audit UI site-wide (pra Save-to-GitHub) + Empty-state filter DataTable.** Atas permintaan user (finalisasi sebelum review ahli). **(Audit)** Ditelusuri seluruh halaman utama (Components, Form Elements, Form Layout, DataTable, Profile, Wizard, Design Tokens) terhadap R38 (header/body/footer + divider), R39/2B.5 (`space-y` compact), token monochrome, ikon lucide. **Temuan & fix:** `DesignTokensPage` H2 section memakai `text-lg` (di luar skala 2A yang mendokumentasikan `text-lg` sengaja tak dipakai) → dibetulkan ke **`text-base font-semibold`** (H3 section). **(Fitur backlog) DataTable empty-state filter-aware:** saat search/faceted-filter aktif tetapi 0 baris cocok, tampil pesan **"No users match your filters."** + tombol **Clear filters** (`outline sm`, ikon `FilterX`) yang reset `globalFilter`+`columnFilters`; empty-state generik `No Data Available` tetap dipakai saat data memang kosong. Docs 2C.7 (Empty State) & 1.2 (baris DataTable) disinkronkan. **Verifikasi:** guard clean (exit 0); testing agent frontend. |
| Update 57 | **Governance maturity — 9 section baru dari review ahli (doc-only).** Atas permintaan user (menindaklanjuti 10 catatan ahli pra-review GitHub). Ditambah **2C.15 Versioning & Release Policy** (SemVer, Breaking Change, Deprecation, Migration Guide, Changelog Policy gaya *Keep a Changelog*; baseline `0.x`), **2C.16 Component Lifecycle** (fase 🧪 Experimental / ⚪ Available / ✅ Established / ⚠️ Deprecated / 🔒 Pending / 🗑️ Removed + alur transisi; legenda status header diperluas), **2C.17 Feedback Pattern** (matriks Toast vs Inline vs Alert vs Dialog), **2C.18 Empty State Registry** (klasifikasi: No Data / No Search Result ✅ / First-Time / Permission Denied / Offline / Error), **2C.19 Search, Filter & Sort Pattern** (global: search/filter/sort/reset ✅; Saved Filter ⚪ Deferred), **2C.20 Data Display & Formatting** (Number/Currency/Percentage/Date/Time/Status/Boolean/null), **2C.21 Permission Pattern** (Hide/Disable/Read-only/Forbidden + panduan Hide vs Disable), **2C.22 Testing Standard** (Visual/A11y/Interaction/Responsive — aturan saja), **2C.23 Performance Guideline** (Lazy Loading/Memoization/Virtualization/Bundle/Chart/Large Table). Catatan ahli **#8 Navigation** dinilai sudah tercakup (R35/2B.15/2C.3) → tidak ada section duplikat. **Tanpa perubahan kode UI** (semua governance/dokumentasi); guard tetap clean. |
| Update 58 | **Implementasi 3 pattern dari governance → komponen nyata + halaman.** Atas permintaan user (mengubah sebagian dokumentasi 2C.18/2C.20/2C.21 jadi implementasi). **(Composite)** **`EmptyState`** (`components/composite/EmptyState.jsx`) — 6 varian terklasifikasi (no-data/no-results/first-time/forbidden/offline/error) via `Empty` primitive + ikon lucide + aksi opsional; terdaftar di Registry 1.4 & RULES §5. **(Util)** **`lib/format.js`** — `formatNumber/Currency/Percent/Date/Time/Relative` + `statusBadgeVariant`; nil → em dash `—`. **(Halaman baru di Sample Blocks)** **Empty States** (`/design-system/blocks/empty-states`, grid 6 varian), **Permissions** (`/design-system/blocks/permissions`, `ToggleGroup` role mengendalikan Hide/Disable+Tooltip/Read-only/Forbidden), **Data Display** (`/design-system/blocks/data-display`, Table nilai terformat, angka `text-right tabular-nums`, negatif `text-destructive`). Nav (`navigation.js`) + rute (`App.js`) ditambah; docs 1.2 (3 pattern rows), 1.4 (EmptyState), 2C.18/2C.20/2C.21 (catatan "Implementasi") disinkronkan. **Verifikasi:** guard clean (exit 0); compile sukses; screenshot Empty States render 6 kartu; testing agent. |
| Update 59 | **Polish footer DataTable.** Atas permintaan user. `DataTableLayoutPage.jsx`: hapus teks **"n of N row(s) selected."** (`dt-selected`) di kiri-bawah; **"Rows per page"** dipindah ke **pojok kiri-bawah**; kanan-bawah tetap "{first}–{last} of {total}" · "Page x of y" · prev/next. (Variabel `selectedCount` tetap dipakai untuk tombol Bulk Delete.) **Verifikasi via screenshot:** footer sesuai; guard clean; 0 console error. |
| Update 60 | **Footer DataTable disesuaikan ke pola referensi UI** (atas gambar acuan user; UI saja, konten tetap). `DataTableLayoutPage.jsx`: grup rows-per-page kiri jadi **`Rows per page [Select] of {total} rows`** (total menyatu inline dgn selector). Teks rentang **`{first}–{last} of {total}`** yang berdiri sendiri dihapus (redundan) — total kini di kiri; kanan menyisakan **`Page x of y`** + prev/next. Variabel `firstRow`/`lastRow` yang tak terpakai dibersihkan. 2C.7 (Rows-per-page) disinkronkan. **Verifikasi via screenshot:** footer sesuai referensi; guard clean; 0 console error. |
| Update 61 | **Code-quality & docs (review ahli, batch A→C).** Atas permintaan user (frontend-only). **(A) Exception Handling:** `components/ErrorBoundary.jsx` — React class boundary (`getDerivedStateFromError`/`componentDidCatch`) membungkus app di `App.js`; fallback `EmptyState error` + Reload; `componentDidCatch` siap untuk pelaporan error. Terdaftar di 1.2. **(B) Code Readability + Architecture:** tambah `.prettierrc` + `.prettierignore` (2 spasi, double quote, trailing comma all, printWidth 88); buat **`docs/ARCHITECTURE.md`** (stack, folder, routing, state, token, error handling, code standards, build, DoD, rencana fase backend). **(C) Separation of Concerns + Logging:** mock data dipindah ke **`config/sampleData.js`** (`SAMPLE_USERS`/`USER_ROLES`/`USER_STATUSES`/`SAMPLE_DISPLAY_ROWS`) — dipakai `DataTableLayoutPage` & `DataDisplayBlockPage` (hapus inline data/const usang); `design-guard.sh` kini mendeteksi **`console.log/debug/info` tersisa** (`console.error` diizinkan) + 2C.14 disinkronkan. **Item tidak relevan (frontend-only):** Database & API Documentation ditunda ke fase backend (dicatat di ARCHITECTURE.md §11). **Verifikasi:** guard clean (exit 0); compile sukses; screenshot DataTable 8 baris + footer benar, ErrorBoundary tidak ter-trigger. |
| Update 62 | **Maintainability & konsistensi dokumentasi (review ahli, 9 catatan, doc-only).** Atas permintaan user. **#1 Category Index** + **#2/#8 Template Dokumentasi Komponen** + **#5 Konvensi Penulisan/glossary** ditambah di **1.0** (Panduan Registry) tanpa memecah konsep. **#3 Dependency Registry** dikonsolidasi jadi **2C.24** (alasan + batas pakai + pemakai; memperluas R37). **#4 BACKLOG.md** dirombak berkolom (Alasan ditunda · Trigger aktivasi · Status implementasi) + item usang (Dark Mode/Empty State) dipindah ke "Done"; tambah item nyata (Reduced Motion, Comfortable density, Saved Filter, Virtualization) & bagian "Sengaja tidak ditambahkan". **#5** istilah dibakukan (Master Registry). **#6 Audit penomoran** dijalankan → `R01–R39` & `2C.1–2C.24` bersih tanpa dangling (dicatat di 2C.13). **#7 Contoh implementasi** Card/Dialog (R38) ditambah di 2C.11. **#9** item forward-looking (**2C.15 Versioning, 2C.22 Testing, 2C.23 Performance**) ditandai **🔵 Forward-looking** (aktif saat lintas-tim/publikasi) & dicatat di BACKLOG §2 — dipertahankan, tidak dihapus (opsi a). Yang memang belum ada (i18n/token baru/prinsip baru/a11y guide terpisah) **tidak ditambahkan**. **Verifikasi:** guard clean; audit referensi lolos. |
| Update 63 | **Promosi Combobox & Date Picker → composite reusable (refactor reusability, R30).** Atas permintaan user (audit: komponen ber-dependency harus reusable). Sebelumnya keduanya hanya **preview** di `previews/AdvancedPreviews.jsx` (Combobox bahkan opsinya hardcoded). Kini: **`components/composite/Combobox.jsx`** (props `options/value/onChange/placeholder/searchPlaceholder/emptyText`, full-width default) & **`components/composite/DatePicker.jsx`** (props `value/onChange/placeholder`, dep `react-day-picker` via `ui/calendar`). `AdvancedPreviews` diubah jadi **wrapper tipis** (katalog tetap jalan, DRY). `FormElementsPage` kini memakai composite terkontrol + melempar `FRAMEWORK_OPTIONS` (bukti reusability). **Audit tuntas:** hanya 2 item ini yang preview-only; chart pages memang demo per-tipe (unit reusable = `ChartCard`), `DataTablePreview` = katalog (pola reusable = `DataTableLayoutPage`). Docs: Registry 1.4 (+Combobox/Date Picker), **2C.24** (+react-day-picker), Category Index diperbarui. **Verifikasi:** guard clean; compile sukses. |
| Update 64 | **Sidebar → Area Switcher (Application / Design System).** Atas permintaan user (persiapan menuju CMS; pola diambil dari referensi TeamSwitcher shadcn — bukan kontennya). Header sidebar statis diubah jadi **area-switcher** (`DropdownMenu` + `SidebarMenuButton`, tetap berlabel "UI Guidelines / Enterprise"). `config/navigation.js` direstruktur ke **`navAreas`**: **Application** (item: Dashboard `/`) & **Design System** (semua menu `/design-system/*` — tidak ada yang dihapus). Area aktif **diturunkan dari rute** (`getAreaIdForPath`); memilih area → navigasi ke `getAreaDefaultPath` (Application→`/`, Design System→`/design-system/tokens`). Default saat buka `/` = **Application**. `navSections` tetap diekspor derivatif (preview Sidebar block tidak rusak); `getBreadcrumb` menyertakan label area. Docs 1.2 (AppSidebar) & **R35** disinkronkan. **Verifikasi via screenshot:** `/` → Application (Dashboard), `/design-system/*` → Design System (menu lengkap); compile sukses; guard clean. |
| Update 65 | **CMS scope awal — menu Application (placeholder).** Atas permintaan user (mulai fase CMS). Area **Application** ditambah grup **Management**: **Users** (`/users`), **Roles** (`/roles`), **Offices** (`/offices`) — ikon `Users`/`ShieldCheck`/`Building2`. Ketiganya memakai **`PlaceholderPage`** (judul otomatis dari breadcrumb) sebagai placeholder; rute didaftarkan di `App.js`. Fungsionalitas nyata **menunggu struktur DB dari user** (hindari revisi bolak-balik). **Verifikasi via screenshot:** sidebar Application (General→Dashboard, Management→Users/Roles/Offices), breadcrumb "Application / Users"; compile sukses; guard clean. |
| Update 66 | **Aksi Account & Settings (dropdown user) → halaman placeholder.** Atas permintaan user. Item **Account** (`/account`) & **Settings** (`/settings`) di footer user-dropdown `AppSidebar` kini bernavigasi (`onClick navigate`) + `data-testid` (`user-menu-account`/`user-menu-settings`). Rute → **`PlaceholderPage`** di `App.js`; `getBreadcrumb` diberi peta judul untuk `/account`→"Account" & `/settings`→"Settings" (trail 1 level). **Verifikasi via screenshot:** `/account` render (breadcrumb "Account", placeholder); compile sukses; guard clean. |
| Update 67 | **CMS modul pertama: OFFICES (FastAPI + MongoDB, CRUD nyata).** Atas permintaan user (skema dari Laravel migration). **Backend** (`server.py`): model `Office`/`OfficeCreate`/`OfficeUpdate` + endpoint `POST/GET/PUT/DELETE /api/offices` & `POST /api/offices/bulk-delete`; unique **code & name** (app-level 409 + **MongoDB unique index** via startup event); validasi `latitude∈[-90,90]`, `longitude∈[-180,180]`, `radius≥0`, `radius` default 100 (422 bila invalid); `created_at/updated_at` ISO. **Frontend** (`pages/app/OfficesPage.jsx`): pola **DataTable** design system (search, sortable header, selection + bulk delete, pagination footer "Rows per page … of N rows"), **OfficeFormDialog** (R38, react-hook-form + zod, inline 409 di field code/name), state loading (Skeleton)/error/empty/first-time/filtered via composite **EmptyState**; axios client `lib/api.js` (baseURL `REACT_APP_BACKEND_URL+/api`). Rute `/offices` (area Application). **Verifikasi:** testing agent **backend 18/18 + frontend semua alur 100%**, 0 bug; pytest suite di `backend/tests/test_offices.py`. Ini konsumen pertama design system → membuktikan pola reusable. |
| Update 68 | **[MINOR] Density default → DENSE (h-8 + space-y-3), global.** Atas permintaan user (dialog Offices terasa "longgar" untuk UI Compact; pilih opsi buat varian Dense global + ubah aturan). **Primitives** (`ui/`): tinggi kontrol `h-9`→**`h-8`** di `input.jsx`, `select.jsx` (SelectTrigger), `native-select.jsx`, `button.jsx` (default `h-9`→`h-8`, `sm` `h-8`→`h-7`, `lg` `h-10`→`h-9`, `icon` `h-9 w-9`→`h-8 w-8`); `form.jsx` `FormItem` `space-y-2`→**`space-y-1.5`** (label→control). **Konsumen form** field-stack `space-y-4/5`→**`space-y-3`**: `OfficesPage` (dialog body), `FormElementsPage`, `DataTableLayoutPage` (UserFormDialog), `FormLayoutPage`, `ProfileBlockPage`, `WizardBlockPage`. **Docs/SSOT disinkronkan**: 1.1 (input `h-8`), 2B.5 (tabel `space-y` — form/section `space-y-3`), 2B.7 (Form Spacing Dense), 2B.8 (INVARIAN), 2B.10 (Modal body `space-y-3`), 2B.16 (Button Dense), 2B.17 (Input `h-8`), 2B.21 (Density = Dense), 2C.2 (Control height default `h-8`, icon `h-8 w-8`), 2C.4 (tabel Density = Dense), 2C.6 (Field Spacing Dense), 2C.8 (Icon-only `h-8 w-8`), 2C.11 (contoh Card/Dialog), 2C.14 & `RULES.md` §7/§9/§10 (fallback space-y-3 form). Umum/non-form Card tetap `space-y-4`. Verifikasi: guard clean + screenshot konsumen (Offices dialog, Form Elements, Form Layout, Base Components). |
| Update 69 | **[MINOR] Density runtime toggle (Dense ⇄ Comfortable) + Offices layout tweak + tabel no-wrap.** Atas permintaan user. (a) **Density jadi runtime-switchable via CSS var**: `index.css` `:root` menambah token density Dense (default) `--ctl-h:2rem`/`--ctl-h-sm:1.75rem`/`--ctl-h-lg:2.25rem`/`--field-gap:0.75rem`/`--item-gap:0.375rem`, di-remap oleh `:root[data-density="comfortable"]` (`2.5/2.25/2.75rem`, `1.25rem`, `0.5rem`). Primitives kini pakai var: `input`/`select`/`native-select` `h-[var(--ctl-h)]`, `button` size (default/sm/lg/icon) → var, `FormItem` `space-y-[var(--item-gap)]`; form field-stack konsumen → `space-y-[var(--field-gap)]`. **`DensityProvider`** (`components/density-provider.jsx`, context + localStorage `ui-density`, set `data-density` di `<html>`) dipasang di `index.js` (default `dense`). **`DensityToggle`** (`components/density-toggle.jsx`, DropdownMenu Dense/Comfortable, ikon `Rows3`/`Rows2`). (b) **Layout Offices**: tombol **Add Office** dipindah ke `PageHeader` (satu box dgn judul, via slot `children`); **DensityToggle** ditaruh di toolbar (posisi tombol Add sebelumnya). (c) **Tabel Offices no-wrap + scroll horizontal**: `Table` diberi `[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap`, kolom Address dilepas truncation `line-clamp-1 max-w-[240px]` → teks penuh, scroll-x memakai wrapper `overflow-auto` bawaan primitive `Table`. Verifikasi: guard clean, compile sukses, screenshot Dense vs Comfortable (kontrol membesar) + teks tabel utuh. |
| Update 70 | **[MINOR] Offices page mirror Sample DataTable + Delete destructive (red).** Atas permintaan user ("sesuaikan seperti sample layout", "action delete harus merah", "bereskan CRUD Offices dulu"). (a) **Struktur Offices = Sample DataTable**: `PageHeader` (judul "Offices" + deskripsi) **dihapus** (info dinilai sudah jelas dari breadcrumb); halaman dibungkus **`Card`** — `CardHeader` (`flex flex-row items-center justify-between space-y-0`) berisi `CardTitle` "Offices" + tombol **Add Office**; `CardContent space-y-4` memuat toolbar (Search kiri + `DensityToggle` kanan) → tabel (`rounded-md border`) → footer pagination. (b) **`DensityToggle` di-restyle** meniru dropdown "Density" sample: `Button variant="outline" size="sm"` (`Rows3` + "Density" + `ChevronDown`) + `DropdownMenuRadioGroup` (label "UI density", opsi Dense/Comfortable) — tetap toggle global (data-density). (c) **Delete = destructive/merah**: row-action Delete pakai `className="text-destructive focus:text-destructive"` (bukan prop `variant` yg tak didukung `DropdownMenuItem`); tombol konfirmasi `AlertDialogAction` (single + bulk) diberi `bg-destructive text-destructive-foreground hover:bg-destructive/90`; toolbar bulk-delete `border-destructive/50 text-destructive`. **Verifikasi:** testing agent **backend 19/19** (termasuk test baru clear optional via null) **+ frontend 100%**, 0 bug (iteration_6.json); guard clean. CRUD Offices dinyatakan solid sebelum modul data lain. |
| Update 71 | **[MINOR] Roles/Jabatan CMS module + reusable `DialogBody` (fix dialog form berantakan).** (a) **Modul Roles**: backend FastAPI `roles` (id, name unique, `parent_id` nullable, timestamps) — model **pohon** (1 atasan langsung; rantai atasan berjenjang dihitung dari `parent_id`); CRUD + `bulk-delete`; validasi nama unik (409), parent wajib ada & **anti-siklus** (400 bila parent = diri/keturunan); **delete mempromosikan anak** ke atasan terdekat yang tersisa; index unik `roles.name`. Frontend `pages/app/RolesPage.jsx` gaya DataTable (Card, tree-indent + chevron, kolom **Direct superior** & **Superiors (top ↑)** rantai `›`, red Delete, DensityToggle), dialog dgn pemilih atasan yang **mengecualikan diri + keturunan** (cegah siklus). Rute `/roles`. (b) **`DialogBody` (reusable)** ditambah ke `components/ui/dialog.jsx` + diekspor: `<div className="space-y-[var(--field-gap)] px-6 py-4">`. **Latar**: RolesPage sempat pakai body `py-2` **tanpa `px-6`** → form tak selaras dgn header/footer (berantakan, laporan user). Karena `DialogContent` `p-0`, body **WAJIB** kasih padding sendiri; `DialogBody` mencegah lupa. **Migrasi semua form dialog** ke `<DialogBody>`: OfficesPage, RolesPage, DataTableLayoutPage (UserFormDialog), FormElementsPage (AddUserDialog); RolesPage juga distandarkan (`Form>form>DialogHeader>DialogBody>DialogFooter`). Docs 1.1 (registry dialog), 2B.10, 2C.11 disinkron. **Verifikasi:** guard clean, compile sukses, screenshot dialog Roles rapi & selaras; backend Roles diverifikasi curl (hierarki, 409, 400 siklus, promosi delete). |
| Update 72 | **[DOC] Sinkronisasi dokumentasi menyeluruh pasca CRUD Offices & Roles (pra Save-to-GitHub).** Atas permintaan user. **`ARCHITECTURE.md` dirombak** dari "frontend-only, belum ada backend" → realita sekarang: dua area (Design System + Application/CMS), **backend FastAPI + MongoDB (motor)** aktif, axios `lib/api.js`, `DensityProvider`, folder `backend/` & `pages/app/`, Area Switcher routing, **§11 Backend & Data** kini berisi skema koleksi (`offices`, `roles`) + kontrak API (CRUD seragam, `bulk-delete`, `exclude_unset`/null-clear). **Registry `DESIGN_SYSTEM.md` 1.2** +3 baris: **Density system** (`DensityProvider`/`DensityToggle`), **Application CMS — Offices**, **Application CMS — Roles**. **Aturan wajib baru `R40 — Application CRUD Page Pattern`** (Card+CardHeader title+Add, toolbar, DataTable no-wrap, form dialog **wajib `DialogBody`**, **Delete destructive/merah**, states `EmptyState`, data `lib/api.js`). **`DESIGN_SYSTEM_RULES.md`** disinkron: §5 (catat `DialogBody` + Density system + halaman CMS sbg reusable), §7 (checklist item R40), §11 (pointer R40 + ARCHITECTURE §11). Semua komponen reusable terbaru (DialogBody, DensityToggle/Provider) kini tercatat di registry & aturan. **Verifikasi:** guard clean. |
| Update 73 | **[MINOR] Roles parent selector → `Combobox` searchable.** Atas permintaan user (Select biasa tidak nyaman saat opsi role banyak). `RolesPage` `RoleFormDialog`: field **Direct superior** diganti dari `Select` → composite **`Combobox`** (Popover+Command, ada search); opsi tetap **mengecualikan diri + keturunan** (anti-siklus), `NONE` = top level, `onChange` map `""`→`NONE`. **Fix composite `Combobox`**: `CommandItem value={o.label}` (dulu `o.value`/uuid) → pencarian cmdk kini cocokkan **label** yang terlihat (berlaku untuk semua konsumen: ComboboxPreview, FormElements). Docs: 1.2 (baris Roles), R40 (form dialog — pakai Combobox utk opsi banyak). **Verifikasi:** guard clean, compile sukses, screenshot ketik "Kepala" memfilter tepat. |
| Update 74 | **[MINOR] Judul list + org-chart Roles.** Atas permintaan user. (a) `CardTitle`: Offices → **"Office List"**, Roles → **"Role List"**. (b) **RolesPage** dapat tombol **Structure** (ikon `Network`, outline sm, di `CardHeader` samping Add Role) yang membuka **Dialog org-chart** hierarki jabatan mengikuti data roles & design system (monokrom): pohon **top-down CSS murni** (kelas `.org-chart` di `index.css` — konektor pakai `hsl(var(--border))`, node = kartu `bg-card border rounded-md text-xs`), Dialog lebar `w-[95vw]` + body `overflow-auto max-h-[75vh]` (scroll-x utk pohon lebar), multi-root didukung (tanpa konektor palsu antar root). **Catatan teknis:** pohon dibangun **iteratif** via `buildOrgTree()` + `React.createElement` (post-order, `Map` id→`<li>`) — **bukan** komponen JSX rekursif, karena `<OrgNode>` yang mereferensi dirinya membuat plugin `@emergentbase/visual-edits` **stack overflow** (RangeError saat build). **Verifikasi:** guard clean, compile sukses, screenshot org-chart tampil rapi. |
| Update 75 | **[MINOR] Org-chart level (swimlane) + warna + ekspor + reorder; Roles form fields.** Atas permintaan user (cocokkan bagan resmi + kerapihan). (a) **Entitas `Level`** (backend `levels`: id, name unik, order, **color** opsional; CRUD `/api/levels`; delete-level meng-null-kan `role.level_id`). **Role** +`level_id`, `dotted_parent_id`, `order` (validasi: level ada, dotted ≠ diri & ada; delete role bersihkan referensi dotted). (b) **OrgChart** dirombak → **SVG swimlane** (`composite/OrgChart.jsx`, non-rekursif): node dikelompokkan per level (band + label berwarna), urut kiri→kanan by `order`, konektor **solid=atasan langsung / dashed=dotted-line**; tiap level punya **warna** (fill+border node & band) — palet preset. **Ekspor PNG/PDF** (`html-to-image`+`jspdf`). (c) **Manage Levels** dialog: color-picker (Popover swatch), **reorder panah ↑/↓**, add/edit/delete. (d) **RolesPage**: tabel +kolom Level & Order; row-action **Move left/right** (reindex `order` dalam swimlane); form +field Dotted-line/Level/Order. **Verifikasi:** testing agent iteration_8 (backend 14/14, frontend 100%), screenshot org-chart & ekspor PNG/PDF sukses, guard clean. |
| Update 76 | **[BUGFIX] Field Level & Order tidak sejajar di form Role + aturan baru R41.** Laporan user ("level dan order masih tidak sejajar aneh"). **Akar masalah (kesalahan komposisi, BUKAN komponen/aturan yang rusak):** di baris `grid grid-cols-2`, field **Level** memakai `<FormItem className="flex flex-col">` sedangkan **Order** memakai `<FormItem>` polos → mode layout campur membuat tinggi label/kontrol tak sinkron sehingga kontrol tidak sejajar (terukur: sebelumnya top berbeda; sesudah fix `levelTop == orderTop == 629`, tinggi 32/32). **Fix:** semua field RoleFormDialog distandarkan ke `<FormItem>` polos (Combobox sudah `w-full` block-level) + grid diberi `items-start`; label diringkas 1 baris (buang suffix "(Optional)", opsionalitas via placeholder). **Guardrail baru `R41 — Form Field Grid Pattern`** + 2 cek di `design-guard.sh` (#8 larang `flex flex-col` di FormItem, #9 larang label verbose "(Optional)"). Docs: R41 (registry + §7 checklist + §11 pointer). **Verifikasi:** guard clean, screenshot form Add/Edit rapi & sejajar. |
| Update 77 | **[CONSISTENCY] Tombol Reset di toolbar CMS (Offices & Roles).** Laporan user: pola Reset/Clear (2C.19/R40) sudah didokumentasikan & dipakai sample `DataTableLayoutPage`, tetapi halaman CMS `pages/app/*` belum menampilkannya sebagai kontrol toolbar. **Fix:** tambah tombol **Reset** (`outline sm`, ikon `FilterX`) di toolbar Offices & Roles yang muncul saat `globalFilter` aktif → reset pencarian; empty-state no-match juga menampilkan tombol **Reset** (label diseragamkan dari "Clear search" → "Reset" di Offices, ditambah di Roles yang sebelumnya hanya teks). **R40 diperbarui** mewajibkan toolbar Reset untuk semua halaman CMS. **Verifikasi:** screenshot Offices & Roles — tombol Reset tampil saat search, klik memulihkan daftar (20 baris); guard clean. |
| Update 78 | **[MINOR+FIXED] Redesign halaman Branding (section cards) + tuntas punch list UI + aturan baru R51.** Atas permintaan user (redesign Branding "ikuti referensi **layout**"). (a) **`BrandingPage.jsx` dirombak** dari Tabs → **section `Card` bertumpuk** (komponen `Section` reusable): *Application Identity* (+ preview card inisial diturunkan otomatis dari `app_name` — TANPA field baru), *Brand Assets*, *SEO & Metadata*, *Sitemap* (dipertahankan penuh), *Link Preview (Open Graph)* + tombol Test, *Contact & Footer*; **save bar `flex justify-end border-t pt-4`** `size="sm"` di akhir halaman. **Aturan baru `R51 — Pola Halaman Konfigurasi`** (Bagian 12E RULES). (b) **Punch list (Msg 819 & 837):** ikon `LogIn` di tombol Login; hapus hint User ID; **"Detail" dipindah ke posisi paling atas** menu aksi Roles & Clients (**R47.6 diperbarui**); R47 `.tbl-density` diterapkan ke tabel Broadcast/Database/Sitemap/Account/Settings/Login Security (via `DataTableCard` bersama & lokal — toolbar card + search `h-[var(--ctl-h-sm)]` + pagination Density); tombol `size="sm"` di Database/Push/Email Templates/Settings/Branding (R48); switch Sessions disamakan tinggi dgn tombol Refresh; **tinggi baris badge vs non-badge diseragamkan** via `.tbl-density td { line-height:1.5rem; vertical-align:middle }` (**R47.8 baru**). (c) **🔴 [FIXED] Pelanggaran bahasa:** sempat menerjemahkan teks Branding + save bar sticky mengambang ke Bahasa Indonesia → **dikembalikan ke Bahasa Inggris** & footer non-sticky; **§6 RULES diperketat** (UI = Inggris saja walau referensi/komunikasi user berbahasa lain; ikuti *layout* bukan bahasa). Data branding sempat ter-overwrite ke default saat testing → **dipulihkan** dari `seed_snapshot.json`. **Verifikasi:** testing_agent frontend 100% (iteration_32), `design-guard.sh` exit 0, compile bersih. |

