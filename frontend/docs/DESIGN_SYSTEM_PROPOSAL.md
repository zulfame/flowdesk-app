# DESIGN SYSTEM — PROPOSAL / SPESIFIKASI (Pending Approval)

> Dokumen ini **belum berlaku**. Ini rancangan fondasi tingkat lanjut untuk direview.
> Tidak ada kode yang diubah oleh dokumen ini. Setelah disetujui per-poin, isinya
> dipindahkan ke `DESIGN_SYSTEM.md` (jadi aturan resmi) + `CHANGELOG`.
>
> Prinsip tetap: 100% shadcn/ui · token-first · monochrome-first · enterprise.
>
> Legenda status: 🔵 Proposed · 🟢 Approved · ⚪ Deferred.

Ringkasan urutan eksekusi yang disarankan (risiko terkelola):
**P1 → P2 → P8 → P4 → P5 → P6 → P9 → P7 → (Y1..Y5).**
P1 adalah pondasi; P2/P4/P8 bergantung padanya.

---

## P1 — Token Architecture 2-Lapis (Primitive → Semantic → Component) 🔵

**Tujuan.** Memisahkan *nilai mentah* dari *makna* dan *pemakaian*, sehingga theming,
dark mode, dan density menjadi murah & konsisten.

**Struktur 3 tingkat.**
1. **Primitive (global, tak bermakna UI)** — palet & skala mentah.
   `--gray-50 … --gray-950`, `--blue-500`, `--radius-base: 0.5rem`, `--space-1: 0.25rem`, dst.
2. **Semantic (peran UI, netral terhadap tema)** — memetakan primitive → peran.
   `--color-background`, `--color-foreground`, `--color-muted`, `--color-border`,
   `--color-ring`, `--color-primary`, `--color-primary-foreground`, `--surface-1..3`.
3. **Component (opsional, khusus komponen)** — hanya bila perlu override lokal.
   `--button-bg`, `--button-fg`, `--card-bg`, `--sidebar-bg`, `--chart-1..5`.

**Aturan konsumsi.**
- Komponen **hanya** membaca token **Semantic/Component**, tidak pernah Primitive langsung.
- Tailwind mapping tetap via `tailwind.config.js` (`colors.background = hsl(var(--color-background))`).
- Format warna tetap **HSL** (R05).

**Struktur file yang diusulkan** (pecah `index.css`):
```
src/styles/tokens/primitive.css   (skala mentah)
src/styles/tokens/semantic.css    (:root + .dark memetakan ke primitive)
src/styles/tokens/component.css   (opsional)
```

**Dampak/migrasi.** Menyentuh `index.css` + `tailwind.config.js`. Komponen **tidak**
perlu diubah bila nama Tailwind (`bg-background`, dst) dipertahankan — hanya sumber
variabelnya yang direstruktur. Prasyarat untuk P2/P4/P8.

---

## P2 — Color System penuh + Dark Mode 🔵

**Tujuan.** Skala warna semantik lengkap + tema gelap sebagai kelas satu.

**Peran semantik wajib (tiap warna punya pasangan `-foreground`):**
`background, foreground, card, popover, primary, secondary, muted, accent,
destructive, border, input, ring`.

**Perluasan status (baru):** `success, warning, info` (+ `-foreground`) — hanya untuk
status/feedback (bukan dekorasi). Tetap monochrome-first; status dipakai hemat.

**Surface levels (elevasi warna, sinkron dgn P8):**
`--surface-0` (page), `--surface-1` (card), `--surface-2` (popover/menu),
`--surface-3` (dialog). Di dark mode, surface makin tinggi = makin terang.

**Chart palette:** pertahankan `--chart-1..5`; definisikan versi terang & gelap.

**Dark Mode.**
- Strategi kelas `.dark` di `<html>` (shadcn standard) + `ThemeProvider` ringan
  (context + `localStorage`) dgn opsi `light | dark | system`.
- Toggle di header app (ikon `Sun/Moon` lucide) — komponen `Switch`/`Button`.
- Semua warna dari token semantic → otomatis ikut tema.

**Kontras.** Semua pasangan `bg/foreground` wajib ≥ WCAG AA (lihat P7).

**Dampak/migrasi.** Bergantung P1. Perlu: tambah token `.dark`, `ThemeProvider`,
toggle, audit kontras. Komponen yang meng-hardcode `bg-primary text-white` (bila ada)
harus pakai pasangan `-foreground`.

---

## P4 — Density Modes (Compact ↔ Comfortable) 🔵

**Tujuan.** Sistem enterprise sering butuh mode padat (data-heavy) & mode lapang.

**Mekanisme.** Token spacing/tinggi yang bisa berganti via atribut `data-density`.
```
[data-density="compact"]     { --control-h: 2rem;   --cell-py: 0.375rem; --field-gap: 0.5rem; }
[data-density="comfortable"] { --control-h: 2.5rem; --cell-py: 0.625rem; --field-gap: 0.75rem; }
```
Komponen memakai `h-[--control-h]`, `py-[--cell-py]`, dst.

**Cakupan token:** tinggi kontrol (button/input/select), padding sel tabel, gap form,
tinggi baris list/menu.

**Default:** `compact` (sesuai identitas enterprise saat ini).

**Dampak/migrasi.** Perlu men-*tokenize* tinggi & padding di komponen inti
(button, input, select, table, form item, menu). Bergantung P1.

---

## P5 — Unified Sizing Scale (lintas komponen) 🔵

**Tujuan.** Satu skala ukuran konsisten untuk semua komponen interaktif.

**Skala:** `xs · sm · md (default) · lg`.
| Ukuran | Tinggi | Padding-x | Font | Ikon |
|--------|--------|-----------|------|------|
| xs | 1.75rem (28) | 0.5rem | text-xs | 14 |
| sm | 2rem (32) | 0.75rem | text-sm | 16 |
| md | 2.25rem (36) | 1rem | text-sm | 16 |
| lg | 2.5rem (40) | 1.5rem | text-base | 20 |

**Terapkan ke:** Button, Input, Select, Textarea (tinggi baris), Badge (padat), Avatar
(`xs/sm/md/lg/xl` khusus), IconButton. Selaras dgn P4 (Density mengubah nilai md).

**Dampak/migrasi.** Menyatukan varian ukuran yang kini hanya ada di Button.

---

## P6 — Motion / Animation System 🔵

**Tujuan.** Gerak konsisten & aksesibel (bukan dekoratif).

**Token durasi & easing.**
```
--motion-fast: 120ms; --motion-base: 200ms; --motion-slow: 320ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
```
**Pola:** overlay (dialog/sheet/popover) enter `base`/exit `fast`; hover/press `fast`;
accordion/collapsible `base`. Transisi **hanya** properti spesifik (`opacity`,
`transform`, `background-color`) — **dilarang** `transition: all` (R18 diperluas).

**Reduced Motion (wajib):**
```
@media (prefers-reduced-motion: reduce){ *{ animation-duration:.01ms!important; transition-duration:.01ms!important } }
```

**Dampak/migrasi.** Ganti durasi/easing ad-hoc di komponen animasi (accordion, dialog,
sheet, sidebar, toast) agar merujuk token. Tambah guard reduced-motion global.

---

## P7 — Accessibility WCAG 2.2 AA (Kontrak) 🔵

**Tujuan.** Menaikkan R17 jadi kontrak terukur.

**Ketentuan wajib:**
- **Kontras:** teks normal ≥ 4.5:1, teks besar/ikon UI ≥ 3:1, state fokus ≥ 3:1.
- **Focus visible:** token seragam `--ring` + `ring-2 ring-offset-2` (offset dari surface).
- **Target sentuh:** area interaktif efektif ≥ 24×24px (WCAG 2.2 2.5.8).
- **Keyboard:** semua aksi tercapai; urutan fokus logis; `Esc` menutup overlay; focus-trap
  pada dialog/sheet; fokus dikembalikan ke pemicu saat tutup.
- **ARIA per komponen:** matriks peran/atribut (mis. `aria-expanded` pada trigger,
  `aria-current` pada nav aktif, `role="status"` pada toast, label pada icon-button).
- **Bahasa & landmark:** `<html lang>`, landmark `main/nav/aside/header`.
- **Reduced motion:** lihat P6.

**Dampak/migrasi.** Audit kontras (terutama pasca dark mode P2), tambah label ARIA yang
hilang, standarkan ring & offset. Bisa mengubah beberapa warna/ring di banyak komponen.

---

## P8 — Elevation / Shadow System 🔵

**Tujuan.** Skala kedalaman konsisten (bukan shadow ad-hoc).

**Token elevasi (0–4):**
```
--elevation-0: none;                         /* flat surface */
--elevation-1: 0 1px 2px hsl(var(--shadow)/.08);       /* card */
--elevation-2: 0 2px 8px hsl(var(--shadow)/.10);       /* dropdown/menu */
--elevation-3: 0 8px 24px hsl(var(--shadow)/.14);      /* popover/sheet */
--elevation-4: 0 16px 40px hsl(var(--shadow)/.18);     /* dialog */
```
**Pemetaan komponen:** Card→1, Dropdown/Hover/Select→2, Popover/Sheet→3, Dialog/AlertDialog→4.
**Dark mode:** kurangi opacity shadow, kombinasikan dengan surface tint (P2).

**Dampak/migrasi.** Ganti `shadow`/`shadow-sm`/`shadow-lg` ad-hoc → kelas elevasi token
di Card/Dialog/Sheet/Popover/Dropdown.

---

## P9 — Component State Matrix (lengkap) 🔵

**Tujuan.** Menjamin setiap komponen mendefinisikan seluruh state relevan.

**State kanonik:** `default · hover · focus-visible · active/pressed · disabled ·
loading · selected/active-nav · error/invalid · read-only · empty`.

**Aturan:** untuk tiap komponen interaktif, buat tabel state → token/utility yang dipakai;
state yang tak berlaku ditandai "N/A". Ditambah ke registry komponen (Bagian 1).

**Dampak/migrasi.** Menambal state yang hilang (mis. `read-only` input, `loading` pada
lebih banyak tombol, `selected` konsisten pada nav/menu).

---

## Y — Fondasi tambahan (dampak lebih lokal) 🔵

**Y1 — Z-Index / Layering Scale.** Token berjenjang:
`--z-base:0, --z-dropdown:1000, --z-sticky:1100, --z-overlay:1200, --z-modal:1300,
--z-popover:1400, --z-toast:1500, --z-tooltip:1600`. Semua overlay merujuk token
(hindari z-index acak; R20 diperluas).

**Y2 — Shape Language (Radius per peran).**
`--radius-sm/md/lg/xl` turunan `--radius-base`; peran: field/button `md`, card `lg`,
badge/pill `full` (bila dipakai), popover/menu `md`. Tetapkan sikap: **sharp-rounded**
(bukan pill) sebagai default enterprise.

**Y3 — i18n & Format Data.** Standar format angka/tanggal/mata uang via `Intl.*`
(locale-aware), penomoran tabel, dan pemisah ribuan. Teks UI disiapkan untuk translasi
(hindari string tergabung).

**Y4 — Naming, Versioning & Deprecation.**
- Penamaan: file `kebab-case`, komponen `PascalCase`, named export untuk komponen,
  default export untuk page (mengikuti konvensi yang sudah ada).
- Versioning: setiap perubahan breaking pada pattern dicatat di CHANGELOG dgn label
  `BREAKING`. Kebijakan **Deprecation**: tandai `@deprecated` + periode transisi sebelum
  dihapus.

**Y5 — Content / Voice & Tone.** Sentence case untuk label & tombol; ringkas & netral;
placeholder generik (`name@example.com`); pesan error jelas & solutif; hindari jargon
bisnis (selaras R31).

---

## Peta Dampak (ringkas)

| Poin | Merombak | Bergantung pada | Prioritas |
|------|----------|-----------------|-----------|
| P1 Token 2-lapis | Sangat tinggi (pondasi) | — | 1 |
| P2 Color + Dark Mode | Sangat tinggi | P1 | 2 |
| P8 Elevation | Sedang–tinggi | P1, P2 | 3 |
| P4 Density | Tinggi | P1 | 4 |
| P5 Sizing scale | Tinggi | P4 | 5 |
| P6 Motion | Sedang | — | 6 |
| P9 State matrix | Sedang | P2/P6 | 7 |
| P7 A11y AA | Sedang (audit) | P2 | 8 |
| Y1–Y5 | Lokal | — | 9 |

> Rekomendasi: mulai **P1 + P2** selagi jumlah komponen masih sedikit (biaya migrasi
> termurah sekarang). Setiap poin dieksekusi bertahap, satu PR/langkah, dengan audit
> ulang seperti Update 17.
