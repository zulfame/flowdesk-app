# ARCHITECTURE — UI Guidelines (Design System Template)

> Ringkasan arsitektur teknis. Untuk aturan komponen/visual (SSOT), lihat
> `docs/DESIGN_SYSTEM.md` & `docs/DESIGN_SYSTEM_RULES.md`.

## 1. Ikhtisar

Proyek ini berisi **dua area** (dapat ditukar via **Area Switcher** di sidebar):

1. **Design System** — katalog/dokumentasi UI enterprise (Base Components, Composite,
   Blocks, Layouts, Charts, Tokens). Data di sini **mock/placeholder** (state lokal / `src/config/`).
2. **Application (CMS)** — aplikasi nyata yang **mengonsumsi** design system, didukung
   **backend FastAPI + MongoDB**. Modul live saat ini: **Offices** & **Roles/Jabatan**
   (CRUD nyata, tersimpan di database). Auth halaman masih **mock** (frontend-only).

Tujuan: fondasi UI konsisten, monochrome-first, compact, 100% shadcn/ui — sekaligus
membuktikannya lewat modul CMS nyata.

## 2. Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Framework (FE) | React 19 (CRA + **CRACO**) |
| Routing | React Router v7 (Area Switcher: `/` Application · `/design-system/*` Design System) |
| Styling | Tailwind CSS v3 + design token HSL 2-layer (`src/index.css`) |
| Komponen | **shadcn/ui** (`src/components/ui/`) — 100% resmi, tidak dimodifikasi tanpa persetujuan |
| Ikon | **lucide-react** (satu-satunya sumber ikon) |
| Form & Validasi | `react-hook-form` + `zod` (`zodResolver`) |
| Tabel | `@tanstack/react-table` |
| Chart | `recharts@2.15.4` (pinned) |
| Tema | `ThemeProvider` (Light/Dark/System) + `DensityProvider` (Dense/Comfortable) — keduanya `localStorage` |
| **Backend** | **FastAPI** (`backend/server.py`, prefix `/api`) + **MongoDB** via **motor** (async) |
| **HTTP client** | **axios** (`src/lib/api.js`, baseURL `REACT_APP_BACKEND_URL` + `/api`) |
| Dependency lain | Terkurasi & terikat komponen — lihat **R37** |

## 3. Struktur Folder

```
backend/
├── server.py          # FastAPI app: /api routes (offices, roles), Mongo (motor), indexes
├── requirements.txt
└── .env               # MONGO_URL, DB_NAME (jangan diubah kuncinya)

frontend/src/
├── components/
│   ├── ui/            # Primitives shadcn/ui (protected — jangan diedit tanpa izin)
│   │                  #   + DialogBody (wrapper body form dialog: px-6 py-4 + space-y field-gap)
│   ├── composite/     # Pola reusable dari primitives (Autocomplete, EmptyState, dll)
│   ├── layout/        # AppLayout, AppSidebar (Area Switcher), PageHeader, AuthLayout
│   ├── auth/          # LoginForm, dsb.
│   ├── charts/        # ChartCard
│   ├── previews/      # Demo/katalog (di-exclude dari guard)
│   ├── theme-provider.jsx / mode-toggle.jsx
│   ├── density-provider.jsx / density-toggle.jsx   # Density global (Dense/Comfortable)
│   └── ErrorBoundary.jsx   # Exception handling global
├── pages/
│   ├── app/           # Application/CMS nyata: OfficesPage, RolesPage (CRUD via API)
│   ├── blocks/        # Sample Blocks (Profile, Wizard, EmptyStates, Permissions, ...)
│   ├── layouts/       # Sample Layout (DataTable, FormElements, FormLayout)
│   └── charts/        # Sample Charts (Area, Bar, ...)
├── config/            # navigation.js, chartSampleData.js, sampleData.js
├── lib/               # utils.js (cn), format.js (formatter), api.js (axios → /api)
├── hooks/             # use-mobile, dll
└── index.css          # Design tokens (2-layer) + font + density vars (--ctl-h/--field-gap/--item-gap)
```

## 4. Routing

- Shell `AppLayout` (Sidebar + header + `<Outlet/>`) membungkus semua halaman.
- **Area Switcher** di `AppSidebar`: **Application** (`/`, `/offices`, `/roles`, `/users`,
  `/account`, `/settings`) & **Design System** (`/design-system/*`). Menu per area
  diturunkan dari `config/navigation.js`.
- Halaman auth (`/login`, `/forgot-password`) berdiri sendiri (standalone).
- Breadcrumb & sidebar dari `getBreadcrumb`. Fallback `*` → `/`.
- Auth-guard masih **mock** (belum ada proteksi backend).

## 5. State Management

- **Lokal per-komponen** (`useState`) — belum ada global store.
- **Data aplikasi nyata** (Offices, Roles) diambil dari **backend via axios** (`lib/api.js`);
  Design System & Users/Account/Settings masih mock/placeholder.
- **Tema** via `ThemeProvider` + **Density** via `DensityProvider` (Dense default ⇄ Comfortable),
  keduanya Context + `localStorage` (`vite-ui-theme` / `ui-density`).
- Preferensi UI lain (mis. row-density DataTable showcase) juga di `localStorage`.

## 6. Styling & Design Tokens

- Token **2-layer** di `index.css`: Layer 1 primitives (`--neutral-*`, dll) → Layer 2
  semantic (`--background`, `--primary`, ...) via `var()`. Light di `:root`, Dark di `.dark`.
- **Hanya token semantik** yang boleh dipakai komponen (dilarang warna hardcode) — R05/R06.

## 7. Error & Exception Handling

- **Validasi input**: `zod` + `react-hook-form` di semua form.
- **Feedback**: matriks Toast/Inline/Alert/Dialog (2C.17).
- **Empty/Error states**: composite `EmptyState` (6 varian, 2C.18).
- **Exception boundary**: `ErrorBoundary` global (`components/ErrorBoundary.jsx`)
  membungkus app → fallback `EmptyState error` + Reload; `componentDidCatch` = titik
  integrasi pelaporan error masa depan (mis. Sentry).

## 8. Code Standards

- **Naming**: 2C.10 (Komponen `PascalCase` named-export; Page `PascalCase` default-export;
  primitive shadcn `kebab-case`; props `camelCase`; `data-testid` kebab-case).
- **Formatting**: **Prettier** (`.prettierrc` — 2 spasi, double quotes, trailing comma `all`,
  printWidth 88). **ESLint** via CRA/CRACO (`eslint-plugin-react/-hooks/-jsx-a11y/-import`).
- **Reusability**: utamakan komposisi; ekstrak schema/data ke `config/`/modul terpisah.
- **Logging**: dilarang meninggalkan `console.log/debug/info` di kode final (dicek guard);
  `console.error` hanya untuk pelaporan error (mis. ErrorBoundary).
- **Setiap `data-testid`** wajib pada elemen interaktif & info penting.

## 9. Build & Run

- Dev: `yarn start` (CRACO, port 3000, hot reload) — di lingkungan ini dikelola supervisor.
- Build: `yarn build`.
- Env: `REACT_APP_BACKEND_URL` (frontend) — dipakai saat backend ditambahkan.

## 10. Definition of Done (UI)

1. `bash docs/design-guard.sh` **lolos (exit 0)**.
2. Checklist `DESIGN_SYSTEM_RULES.md` §7 tercentang (Compact/Guard).
3. Testing Standard 2C.22 (Visual/A11y/Interaction/Responsive).
4. Perubahan tercatat di Changelog (Bagian 5) sesuai Versioning 2C.15.

## 11. Backend & Data (aktif)

Backend **FastAPI + MongoDB** (`backend/server.py`, semua rute prefix `/api`; koneksi
via `MONGO_URL`/`DB_NAME`). Index unik dibuat saat startup.

### Database (koleksi MongoDB)

**`offices`** — `id` (uuid str), `code` (unik), `name` (unik), `address?`, `telephone?`,
`longitude?` [-180..180], `latitude?` [-90..90], `radius` (default 100, ≥0), `note?`,
`created_at`, `updated_at`.

**`roles`** — `id` (uuid str), `name` (unik), `parent_id?` (nullable → **pohon jabatan**,
1 atasan langsung; rantai atasan dihitung dgn menelusuri `parent_id`), `created_at`,
`updated_at`. Aturan: nama unik (409), parent wajib ada & **anti-siklus** (400 bila
parent = diri/keturunan); **delete mempromosikan anak** ke atasan terdekat yang tersisa.

### API (kontrak)

Pola CRUD seragam per resource (`offices`, `roles`):
`GET /api/{res}` · `POST /api/{res}` (201) · `GET /api/{res}/{id}` · `PUT /api/{res}/{id}`
(partial, `exclude_unset` — kirim `null` untuk **mengosongkan** field opsional) ·
`DELETE /api/{res}/{id}` · `POST /api/{res}/bulk-delete` `{ids:[...]}`.

### Frontend wiring

`lib/api.js` (axios) → `pages/app/*` (OfficesPage, RolesPage) memakai pola **DataTable
dalam Card** (lihat DESIGN_SYSTEM 2C). Backlog: modul **Users** (1 user → 1 role + 1 office),
Account, Settings, dan auth nyata (JWT/OAuth) menggantikan mock.
