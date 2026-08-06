# PAGE SPECIFICATION — TEMPLATE (Acuan Wajib)

> Template standar untuk **seluruh** Page Specification di project **UI Guidelines**.
> Salin file ini untuk membuat spec halaman baru (`<NAMA>_PAGE_SPEC.md`).
>
> Aturan:
> - **Generic only** — dilarang konteks bisnis, nama perusahaan/industri, atau data nyata.
>   Gunakan placeholder generik ("Application Name", "Feature One", "Column A", dst).
> - Wajib mengacu ke `DESIGN_SYSTEM.md` (Registry Bagian 1, Rules R01–R37, Typography 2A,
>   Spacing 2B, Extended 2C). Jangan mengulang nilai — **rujuk** aturannya.
> - 100% shadcn/ui · token-first · monochrome-first · Compact enterprise.
> - Spec = **struktur & UI saja** (belum implementasi) kecuali dinyatakan lain.
>
> Status marker: 🔵 Proposed · 🟢 Approved · ⚪ Deferred.
>
> **CATATAN ROADMAP:** pembuatan Page Specification konkret (Dashboard, Master Data, dll)
> **DITUNDA** hingga Foundation → Component Registry → Base Components → Composite
> Components → Sample Blocks → Layout Patterns cukup matang. File ini **hanya template
> dokumentasi** (generic & reusable), bukan spec halaman tertentu.

---

## 1. Informasi Halaman
| Field | Nilai |
|-------|-------|
| Nama Halaman | `<Page Name>` |
| Route | `/<path>` |
| Status Spec | 🔵 Proposed |
| Layout | `AppLayout` / `AuthLayout` |
| Auth diperlukan | Ya / Tidak |
| Owner Spec | `<nama/tim>` |

## 2. Tujuan Halaman
Deskripsi singkat (1–3 kalimat) tujuan generik halaman ini. Tanpa konteks bisnis.

## 3. Layout
- Shell: `AppLayout` (sidebar + header fixed) atau `AuthLayout` (split-screen).
- Region konten: `p-4 lg:p-6`, root `space-y-6` (2B.5).
- Header halaman: `PageHeader` (H1 `text-2xl` — 2A) + deskripsi opsional + slot actions.
- Sebutkan susunan section vertikal (atas → bawah).

## 4. Component Registry
Daftar komponen dari **Bagian 1 DESIGN_SYSTEM.md** yang dipakai (rujuk, jangan buat baru).
| Komponen/Pattern | Status di Registry | Peran di halaman |
|------------------|--------------------|------------------|
| `PageHeader` | ✅ | Judul + deskripsi |
| … | … | … |

> Jika butuh komponen ⚪ (available) → aktifkan & ubah status ke ✅ setelah dipakai.
> Jika butuh yang 🔒 (pending) → **lapor** (governance), jangan improvisasi.

## 5. Component Composition
Urutan komposisi kanonik (rujuk **2C.11**). Contoh notasi:
```
AppLayout
 └─ (content, space-y-6)
     ├─ PageHeader(title, description, [actions])
     ├─ <Section A>
     └─ <Section B>
```

## 6. User Flow
Langkah interaksi utama pengguna (generik), mis.:
1. Halaman dimuat → tampil `Loading State`.
2. Data tersedia → render konten.
3. Aksi pengguna (klik/submit/filter) → hasil + feedback (`sonner`/`Alert`, 2C.5).
4. Navigasi keluar/masuk sesuai `navigation.js`.

## 7. Responsive Behavior
Rujuk **2C.3**. Sebutkan perubahan per breakpoint:
- Mobile (<`md`): sidebar → Sheet drawer; grid 1 kolom; tabel `overflow-x-auto`.
- `md`+: grid multi-kolom; sidebar icon-collapsible.
- Padding `p-4` → `lg:p-6`.

## 8. Accessibility
Rujuk **R17 / 2C.5**. Minimal:
- Landmark (`main/nav/header`), heading order benar (satu H1 via `PageHeader`).
- Focus-visible ring seragam; focus-trap pada overlay; `Esc` menutup.
- Icon-only button wajib `aria-label`; ikon dekoratif `aria-hidden`.
- Kontras WCAG AA.
- `data-testid` pada elemen interaktif/kritis.

## 9. States
Rujuk **2C.1 State Registry**. Tabel state yang relevan untuk halaman ini:
| State | Perilaku |
|-------|----------|
| Default | … |
| Hover/Focus/Active | mengikuti komponen (R11–R13) |
| Disabled | R14 |
| Loading | lihat §9.2 |
| Empty | lihat §9.1 |
| Error | lihat §9.3 |
| Success | feedback via `Alert`/`sonner` |

### 9.1 Empty State
`No Data Available` (R26) — untuk tabel: baris `colSpan` `h-24 text-center text-muted-foreground`.
Untuk section non-tabel: pesan netral + (opsional) aksi primer.

### 9.2 Loading State
`Skeleton` (blok/baris) atau `Spinner`; kontrol terkait `disabled`. Hindari layout shift.

### 9.3 Error State
Pesan generik non-teknis via `Alert` (variant `destructive`) + opsi retry bila relevan.

## 10. Notes
Catatan tambahan, keputusan desain, atau tautan ke spec/rule terkait.

## 11. Changelog
| Tanggal | Perubahan |
|---------|-----------|
| `<YYYY-MM-DD>` | Spec dibuat (🔵 Proposed). |
