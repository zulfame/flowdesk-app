# DASHBOARD — Page Specification

> Spec **struktur & UI saja** (belum implementasi). Turunan dari `PAGE_SPEC_TEMPLATE.md`.
> 100% shadcn/ui · token-first · monochrome-first · Compact enterprise.
> **Generic only** — tanpa konteks bisnis/nama perusahaan/data nyata. Semua konten =
> placeholder generik ("Metric One", "Feature One", "Column A", dst).
> Semua nilai **merujuk** `DESIGN_SYSTEM.md` (Registry Bagian 1, Rules R01–R38,
> Typography 2A, Spacing 2B, Extended 2C) — tidak diduplikasi di sini.

---

## 1. Informasi Halaman
| Field | Nilai |
|-------|-------|
| Nama Halaman | `Dashboard` |
| Route | `/` |
| Status Spec | 🔵 Proposed |
| Layout | `AppLayout` |
| Auth diperlukan | Ya (mock) |
| Owner Spec | Design System |

## 2. Tujuan Halaman
Halaman ringkasan (landing) yang menampilkan **metrik utama**, **tren visual**, dan
**aktivitas terbaru** dalam satu tampilan padat. Tujuan generik: memberi gambaran
cepat kondisi sistem tanpa konteks bisnis spesifik.

## 3. Layout
- Shell: `AppLayout` (sidebar + header fixed, R34).
- Region konten: `p-4 lg:p-6`, root `space-y-6` (2B.5).
- Header halaman: `PageHeader` (H1 `text-2xl` — 2A) + deskripsi opsional + slot actions
  (mis. `Button` "Add Item" di kanan — opsional).
- Susunan section vertikal (atas → bawah):
  1. **PageHeader** — judul + deskripsi.
  2. **Stat Cards** — grid metrik ringkas (Widget composite).
  3. **Charts** — 1–2 grafik tren (ChartCard).
  4. **Recent Activity** — tabel ringkas aktivitas terbaru (card-wrapped Table).

## 4. Component Registry
Komponen dari **Bagian 1 DESIGN_SYSTEM.md** (rujuk, jangan buat baru).

| Komponen/Pattern | Status di Registry | Peran di halaman |
|------------------|--------------------|------------------|
| `PageHeader` | ✅ | Judul + deskripsi + slot actions |
| `Widget` (composite 1.4) | ✅ | Stat card metrik (Card + Badge + ikon lucide + nilai `text-2xl`) |
| `Card` | ✅ | Pembungkus setiap section (header/body/footer, R38) |
| `ChartCard` + `chart` (recharts) | ✅ | Grafik tren (Area/Bar/Line — R33) |
| `Table` (Data Table card-wrapped) | ✅ | Tabel Recent Activity |
| `Badge` | ✅ | Status pada baris tabel & delta metrik di Widget |
| `Button` | ✅ | Aksi header (opsional "Add Item") + row action ghost icon |
| `Separator` | ⚪→✅ | Pemisah opsional antar-kelompok metrik |
| `Skeleton` | ✅ | Loading state (metrik/chart/tabel) |
| `sonner` (toast) | ✅ | Feedback aksi (R24) |

> Semua komponen sudah **Established**. Tidak ada komponen 🔒 pending yang dibutuhkan.

## 5. Component Composition
Urutan komposisi kanonik (rujuk **2C.11**).

```
AppLayout
 └─ (content, space-y-6)
     ├─ PageHeader(title="Dashboard", description, [actions: Button "Add Item"])
     ├─ Section: Stat Cards
     │   └─ div.grid.gap-4.sm:grid-cols-2.lg:grid-cols-4
     │       └─ Widget × 4  (Card > CardHeader(title, ikon) > CardContent(value text-2xl, Badge delta))
     ├─ Section: Charts
     │   └─ div.grid.gap-6.lg:grid-cols-2
     │       ├─ ChartCard(title="Metric Trend A")   → Area/Line chart
     │       └─ ChartCard(title="Metric Trend B")   → Bar chart
     └─ Section: Recent Activity
         └─ Card
             ├─ CardHeader(CardTitle="Recent Activity", CardDescription)
             └─ CardContent(p-0 → Table)
                 └─ Table(TableHeader>Row>Head[No, Name, Status, Date, Action] ;
                          TableBody>Row>Cell…)  // action = ghost icon Eye (2C.7)
```

## 6. User Flow
1. Halaman dimuat → tampil **Loading State** (Skeleton pada Widget/Chart/Table).
2. Data tersedia → render metrik, chart, dan tabel aktivitas.
3. Klik **row action (Eye)** pada tabel → buka detail (mis. Dialog) atau toast placeholder.
4. Klik **"Add Item"** (opsional) → aksi + feedback `sonner`.
5. Navigasi antar-halaman via sidebar (`navigation.js`, R35).

## 7. Responsive Behavior
Rujuk **2C.3**.
- Mobile (<`md`): sidebar → Sheet drawer; **Stat Cards** 1 kolom; **Charts** 1 kolom
  (tumpuk); tabel `overflow-x-auto` (2C.7).
- `md`: Stat Cards `sm:grid-cols-2`; Charts tetap dapat 1 kolom.
- `lg`+: Stat Cards `lg:grid-cols-4`; Charts `lg:grid-cols-2` berdampingan.
- Padding `p-4` → `lg:p-6`; grid metrik `gap-4`, grid chart `gap-6`.

## 8. Accessibility
Rujuk **R17 / 2C.5**.
- Landmark (`main` via `SidebarInset`, `header`, `nav`), satu **H1** via `PageHeader`.
- Ikon Widget dekoratif → `aria-hidden`; row action icon-only → wajib `aria-label`.
- Chart: sertakan `ChartLegend`/label yang bermakna; jangan andalkan warna saja untuk
  membedakan seri (monochrome + label — R33).
- Focus-visible ring seragam; `Esc` menutup overlay (bila Dialog dipakai).
- Kontras WCAG AA. `data-testid` pada elemen interaktif/kritis (mis. `dashboard-add-btn`,
  `stat-card-<n>`, `activity-row-action-<id>`).

## 9. States
Rujuk **2C.1 State Registry**.

| State | Perilaku |
|-------|----------|
| Default | Metrik + chart + tabel terisi data generik. |
| Hover/Focus/Active | Mengikuti komponen (R11–R13); row hover `hover:bg-muted/50`. |
| Disabled | R14 (tombol saat proses). |
| Loading | §9.2 |
| Empty | §9.1 |
| Error | §9.3 |
| Success | Feedback via `sonner`/`Alert`. |

### 9.1 Empty State
- **Tabel Recent Activity:** baris `colSpan` `h-24 text-center text-muted-foreground`
  berteks `No Data Available` (R26 / 2C.7).
- **Stat Card tanpa nilai:** tampilkan `—` (em dash) sebagai placeholder netral.
- **Chart tanpa data:** surface `bg-muted/50 rounded-xl` + teks netral di tengah.

### 9.2 Loading State
`Skeleton` untuk tiap Widget (blok nilai), area chart (blok `aspect-video`), dan baris
tabel (beberapa baris Skeleton). Hindari layout shift (jaga tinggi kontainer).

### 9.3 Error State
Pesan generik non-teknis via `Alert` (variant `destructive`) di atas section terkait +
opsi **retry** bila relevan.

## 10. Notes
- **Widget = composite (1.4)**: `Card + Badge + ikon lucide`; nilai metrik `text-2xl`
  (dikecualikan dari batasan skala body — lihat catatan 2A/Update 32).
- **Charts**: elemen chart **wajib anak langsung** `ChartContainer`; `<Bar>` set
  `isAnimationActive={false}` (R33). Warna dari `--chart-1..5`.
- Tabel aktivitas mengikuti **2C.7 Table Rules** (header `h-10 px-2`, cell `p-2`,
  actions `text-right`).
- Tidak membuat komponen baru; seluruhnya komposisi dari registry.

## 11. Changelog
| Tanggal | Perubahan |
|---------|-----------|
| 2026-07-29 | Spec dibuat (🔵 Proposed) — Stat Cards (Widget) + 1–2 Chart + Recent Activity table. |
