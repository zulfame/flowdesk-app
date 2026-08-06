# MASTER DATA — Page Specification

> Spec **struktur & UI saja** (belum implementasi). Turunan dari `PAGE_SPEC_TEMPLATE.md`.
> 100% shadcn/ui · token-first · monochrome-first · Compact enterprise.
> **Generic only** — tanpa konteks bisnis/nama entitas nyata. Semua konten =
> placeholder generik ("Item", "Column A/B/C", "Status", dst).
> Semua nilai **merujuk** `DESIGN_SYSTEM.md` (Registry Bagian 1, Rules R01–R38,
> Typography 2A, Spacing 2B, Extended 2C) — tidak diduplikasi di sini.
> Pola mengikuti pattern **DataTable layout** (`DataTableLayoutPage.jsx`, 1.2).

---

## 1. Informasi Halaman
| Field | Nilai |
|-------|-------|
| Nama Halaman | `Master Data` |
| Route | `/<master-data>` (generik) |
| Status Spec | 🔵 Proposed |
| Layout | `AppLayout` |
| Auth diperlukan | Ya (mock) |
| Owner Spec | Design System |

## 2. Tujuan Halaman
Halaman **list/tabel** untuk menampilkan & mengelola kumpulan record generik: cari,
filter, urutkan, pilih baris, dan aksi per-baris (lihat/ubah/hapus) + pagination.
Tanpa konteks bisnis — hanya pola CRUD list standar enterprise.

## 3. Layout
- Shell: `AppLayout` (sidebar + header fixed, R34).
- Region konten: `p-4 lg:p-6`, root `space-y-6` (2B.5).
- Header halaman: `PageHeader` (H1 `text-2xl` — 2A) + deskripsi + slot actions
  (`Button` primer **"Add Item"** di kanan).
- Susunan section vertikal (atas → bawah):
  1. **PageHeader** — judul + deskripsi + "Add Item".
  2. **Toolbar** — search (kiri) + filter/columns (kanan).
  3. **DataTable** — tabel dengan row-selection, sortable header, status Badge, row actions.
  4. **Pagination** — di bawah tabel, rata kanan.

## 4. Component Registry
Komponen dari **Bagian 1 DESIGN_SYSTEM.md** (rujuk, jangan buat baru).

| Komponen/Pattern | Status di Registry | Peran di halaman |
|------------------|--------------------|------------------|
| `PageHeader` | ✅ | Judul + deskripsi + slot "Add Item" |
| `DataTable layout` (pattern 1.2) | ✅ | Struktur toolbar + table + pagination (`@tanstack/react-table`, R37) |
| `Table` | ✅ | Tabel data (Header/Body/Row/Head/Cell) |
| `Input` | ✅ | Search box (ikon leading, placeholder `Search...`) |
| `Button` | ✅ | "Add Item" (default), Columns/Filter (outline), row action ghost icon |
| `DropdownMenu` | ✅ | Columns visibility + row actions (View/Edit/Delete) |
| `Checkbox` | ✅ | Row selection + select-all di header |
| `Badge` | ✅ | Kolom Status (default/secondary/outline) |
| `Select` | ⚪→✅ | Filter dropdown (opsional) + page-size (opsional) |
| `Pagination` | ✅ | Navigasi halaman (rata kanan) |
| `Skeleton` | ✅ | Loading state baris tabel |
| `AlertDialog` | ✅ | Konfirmasi aksi destruktif (Delete) |
| `sonner` (toast) | ✅ | Feedback aksi (R24) |

> Semua **Established**. Tidak ada komponen 🔒 pending yang dibutuhkan.

## 5. Component Composition
Urutan komposisi kanonik (rujuk **2C.11 / 2C.7**).

```
AppLayout
 └─ (content, space-y-6)
     ├─ PageHeader(title="Master Data", description, actions: Button "Add Item")
     ├─ Toolbar  (flex items-center justify-between gap-2)
     │   ├─ (kiri)  Input[search, ikon leading, placeholder "Search..."]
     │   └─ (kanan) [Select filter (opsional)] + DropdownMenu "Columns" (visibility)
     ├─ div.rounded-md.border
     │   └─ Table
     │       ├─ TableHeader > TableRow > TableHead[
     │       │      Checkbox(select-all), "No", "Column A"↕, "Column B"↕, "Status", Actions
     │       │  ]
     │       └─ TableBody > TableRow(data-state=selected?) > TableCell[
     │              Checkbox(row), no, valueA, valueB, Badge(status),
     │              (text-right) DropdownMenu[View, Edit, Delete→AlertDialog]
     │          ]
     └─ Pagination  (justify-end; Prev/Next + info "Page x of y"; page-size opsional)
```

## 6. User Flow
1. Halaman dimuat → **Loading State** (baris Skeleton).
2. Data tersedia → render tabel + pagination.
3. **Search** (ketik di Input) → filter baris live (2C.7).
4. **Filter/Columns** (DropdownMenu/Select) → sesuaikan kolom/subset.
5. **Sort** (klik header) → toggle asc/desc + set `aria-sort`.
6. **Row selection** (Checkbox / select-all) → aktifkan bulk actions (opsional).
7. **Row action**: View/Edit → aksi + feedback; **Delete** → `AlertDialog` konfirmasi →
   `sonner` sukses.
8. **Pagination** (Prev/Next) → pindah halaman; jaga state filter/sort.
9. **"Add Item"** → aksi + feedback (placeholder).

## 7. Responsive Behavior
Rujuk **2C.3 / 2C.7**.
- Mobile (<`md`): sidebar → Sheet drawer; toolbar boleh **wrap** (search full-width lalu
  actions di bawah); tabel **`overflow-x-auto`** (jaga lebar minimum kolom, jangan paksa wrap).
- `md`+: toolbar `justify-between` satu baris; kolom penuh.
- Padding `p-4` → `lg:p-6`. Pagination tetap `justify-end`.

## 8. Accessibility
Rujuk **R17 / 2C.5 / 2C.7**.
- Landmark (`main`/`header`/`nav`), satu **H1** via `PageHeader`.
- Header sortable: set **`aria-sort`**; kontrol sort dapat difokus & Enter-aktif.
- Checkbox punya label aksesibel ("Select row" / "Select all"); icon-only row action
  wajib **`aria-label`**.
- `AlertDialog`: focus-trap + fokus awal ke aksi aman (Cancel) + `Esc` menutup.
- Kontras WCAG AA. `data-testid` pada elemen kritis (mis. `master-data-search`,
  `master-data-add-btn`, `row-select-<id>`, `row-action-<id>`, `pagination-next`).

## 9. States
Rujuk **2C.1 State Registry**.

| State | Perilaku |
|-------|----------|
| Default | Tabel terisi data generik + pagination aktif. |
| Hover/Focus/Active | Mengikuti komponen (R11–R13); row hover `hover:bg-muted/50`; baris terpilih `data-[state=selected]:bg-muted`. |
| Disabled | R14 (Prev/Next di batas halaman; aksi saat proses). |
| Loading | §9.2 |
| Empty | §9.1 |
| Error | §9.3 |
| Success | Feedback via `sonner`/`Alert`. |

### 9.1 Empty State
- **Tanpa data sama sekali:** baris `colSpan` `h-24 text-center text-muted-foreground`
  berteks `No Data Available` (R26 / 2C.7).
- **Hasil filter/search kosong:** teks netral "No results found." (tetap dalam sel
  `colSpan`) — tanpa mengubah tinggi drastis.

### 9.2 Loading State
Baris **`Skeleton`** (beberapa baris meniru struktur kolom) atau `Spinner` pada wrapper;
kontrol toolbar `disabled` selama fetch. Hindari layout shift.

### 9.3 Error State
Pesan generik non-teknis via `Alert` (variant `destructive`) di atas tabel + opsi
**retry**. Aksi destruktif yang gagal → toast `sonner` error.

## 10. Notes
- Mengikuti pattern **DataTable layout** yang sudah ada (`DataTableLayoutPage.jsx`) —
  spec ini menstandarkan strukturnya sebagai halaman "Master Data" generik.
- Dependency `@tanstack/react-table` **hanya** untuk pattern ini (R37, tidak menyebar).
- Alignment kolom: angka `text-right`, teks `text-left`, status/badge kiri, actions
  `text-right` (2C.7).
- Kolom & data = **placeholder generik** ("Column A/B", "Item n", status `Active/Inactive/
  Pending`). Dilarang entitas/istilah bisnis (R31).
- Tidak membuat komponen baru; seluruhnya komposisi dari registry.

## 11. Changelog
| Tanggal | Perubahan |
|---------|-----------|
| 2026-07-29 | Spec dibuat (🔵 Proposed) — Toolbar (search + filter + Add) + DataTable + pagination + row actions. |
