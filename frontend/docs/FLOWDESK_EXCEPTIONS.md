# FlowDesk — Pengecualian Resmi terhadap UI Guideline

> Dokumen ini mencatat **penyimpangan yang disetujui pemilik produk** terhadap
> `DESIGN_SYSTEM.md` / `DESIGN_SYSTEM_RULES.md` (yang disalin apa adanya dari
> project **ui-guideline**). Di luar daftar ini, seluruh aturan berlaku penuh.

| # | Aturan asal | Pengecualian FlowDesk | Alasan |
|---|---|---|---|
| E1 | §6 / 2C.9 — **Bahasa UI = Inggris saja** | **Bahasa UI = Bahasa Indonesia** (label, judul, placeholder, tombol, pesan validasi, toast). Kode/komentar tetap Inggris. | FlowDesk adalah aplikasi internal berbahasa Indonesia. Struktur/layout/aturan visual guideline tetap diikuti 100%. |
| E2 | R05 — **Token only / monochrome** | **Warna sebagai DATA** diperbolehkan pada 3 tempat: (a) warna per **catatan** (Kelola Catatan), (b) warna per **kegiatan Time Schedule** (bar Gantt + ekspor Excel), (c) **aset branding** (logo/favicon/thumbnail) di Kelola Aplikasi. | Warna di sana adalah nilai yang dipilih pengguna (data), bukan gaya UI. Seluruh chrome/UI lain tetap monokrom token-only. |
| E3 | R05 — token only | `primary_color` di Kelola Aplikasi **tetap tersimpan** tetapi **tidak lagi menimpa** token `--primary` (UI shell selalu monokrom). Penerapan ulang akan diputuskan saat halaman Kelola Aplikasi dimigrasi. | Menjaga hasil redesign tetap monokrom sesuai keputusan pemilik produk. |
| E4 | R31 — konten generik | Konten memakai istilah domain FlowDesk (Tugas, Rapat, Pengingat, dst). | FlowDesk adalah aplikasi nyata, bukan template katalog. |
| E6 | Primitive `ui/alert.jsx` = SSOT upstream | Primitive diubah ke **layout grid** (`grid-cols-[icon_1fr]`, `col-start-2` untuk Title/Description) menggantikan `[&>svg]:absolute` + `[&>svg+div]:translate-y-[-3px]` upstream. | Versi upstream hanya presisi bila ada `AlertTitle`; alert **hanya-deskripsi** ikonnya melenceng vertikal (dilaporkan user). Grid membuat ikon & baris teks pertama selalu sejajar. |
| E8 | R05 — monochrome token-only | Ditambahkan token **umpan balik** `--success` & `--warning` (juga dipakai untuk centang "diizinkan" pada Matriks Hak Akses) (+ `hsl` di Tailwind) di samping `--destructive` yang sudah ada. | Status hasil aksi (sukses/peringatan/gagal) harus terbaca instan; monokrom saja membuat semua toast terlihat sama. Warna dipakai **hanya** pada elemen status (aksen & ikon toast, badge status), tidak untuk chrome/dekorasi. |
| E7 | 2B.8 — `CardHeader`/`CardFooter` `px-6 py-4` + `space-y-1.5` | **`px-6 py-3`** (padding vertikal 12px) dan `CardHeader space-y-1`. `CardContent` tetap `px-6 py-4`. | Permintaan pemilik produk: header & footer kartu terasa terlalu tinggi untuk target UI compact (FD1). Padding vertikal header & footer tetap **seragam 12px** sehingga jarak dari divider konsisten. |
| E5 | 2C.14 — guard atas seluruh `src` | `design-guard.sh` **mengecualikan modul yang belum dimigrasi** (daftar `LEGACY` di dalam skrip). Daftar itu menyusut setiap fase sampai kosong. | Redesign dilakukan bertahap; guard harus tetap bermakna (exit 0) untuk kode yang sudah dimigrasi. |

## Aturan Wajib Tambahan FlowDesk (Non-Negotiable)

Aturan berikut adalah **tambahan** di atas guideline, khusus FlowDesk. Sama
sifatnya dengan R-rules: wajib, dan sebagian dijaga otomatis oleh `design-guard.sh`.

### FD1 — Compact/Dense adalah SATU-SATUNYA kerapatan (WAJIB)
- Seluruh UI **selalu** memakai mode **compact**. Mode `comfortable` **dihapus**:
  tidak ada `DensityProvider`, tidak ada `DensityToggle`, tidak ada
  `data-density="comfortable"`, dan tidak ada pilihan kerapatan di UI mana pun.
- Nilai kerapatan dikunci di `:root` (`--ctl-h: 2rem`, `--ctl-h-sm: 1.75rem`,
  `--field-gap: 0.75rem`, `--item-gap: 0.375rem`, `--tbl-cell-py: 0.25rem`).
- Konsekuensi yang tetap berlaku: kontrol `h-8`, tombol `size="sm"`, tabel wajib
  `className="tbl-density"`, form pakai `space-y-[var(--field-gap)]`, dan
  halaman fitur maksimal `text-base` untuk judul (R45), dan tangga ukuran font
  mengikuti **FD10**.
- Dijaga guard: pemakaian `DensityToggle`/`density-provider`/`data-density` = gagal.

### FD10 — Skala tipografi seimbang dengan compact (WAJIB)
- **`body` = 14px / `line-height: 1.45`** (`index.css`, `@layer base`). Sebelumnya
  base masih 16px default browser, sehingga teks isi tanpa kelas ukuran (paragraf,
  `dt/dd`, item riwayat, komentar) tampil 16px dan memecah ritme compact.
- Tangga ukuran resmi FlowDesk:
  | Peran | Ukuran | Cara |
  |---|---|---|
  | Judul card / dialog | 16px | `CardTitle` (`text-base`), `DialogTitle`/`AlertDialogTitle` (kini `text-base`, bukan `text-lg`) |
  | Teks isi default | **14px** | otomatis dari `body`; tak perlu `text-sm` manual |
  | Tabel & form | 13px | `.tbl-density` / `.form-dense` (label, input, textarea, combobox) |
  | Meta / bantuan / badge | 12px | `text-xs` |
- Halaman fitur **dilarang** memakai `text-lg` ke atas (dijaga guard #13). Skala hero
  besar hanya untuk layar autentikasi (`Login.jsx`).
- Konsekuensi: jangan lagi menambal `text-sm` di root halaman — base sudah 14px.

### FD11 — Detail sebagai satu-satunya tempat sunting (WAJIB untuk modul beritem)
- Modul yang punya sub-item (Tugas) **tidak boleh punya halaman "Ubah" terpisah**: halaman
  Detail = baca + sunting. Alasan: halaman Ubah lama hanya duplikat Detail dan justru
  kehilangan fungsi (centang item, persetujuan, dokumen per item).
- Pola sunting: composite **`EditableCard`** (`components/composite/EditableCard.jsx`).
  Tombol `Pencil` ghost 28px di header kartu → isi kartu berubah jadi field →
  `CardFooter` berisi Batal + Simpan. `children` berupa render-prop `(editing) => ...`.
- Halaman form tersendiri hanya untuk **pembuatan** (`/tasks/new`).
- Menu aksi baris pada datatable: **Detail · Duplikat · Hapus** (tanpa "Ubah").
  Menu `⋯` di Detail: Duplikat · Jadikan Template · Cetak · Hapus.

### FD2 — Aksi header: hanya Notifikasi + Tema
- Header hanya berisi `SidebarTrigger` + Breadcrumb + (kanan) **ikon lonceng
  Notifikasi** dan **ModeToggle**. Selectbox kerapatan dihapus permanen (FD1).
- Lonceng = `components/layout/NotificationsBell.jsx` (shell popover sudah final,
  daftar isi disambungkan saat modul notifikasi dimigrasi).

### FD3 — Sidebar berbasis AREA
- Header sidebar memakai **area switcher** dengan 2 area: **Member Area**
  (pekerjaan harian) dan **Administrator** (pengelolaan sistem, hanya role admin).
- Menu per area didefinisikan **hanya** di `src/config/navigation.js` (R35);
  area aktif mengikuti rute (`areaIdOf`) dan disimpan di `localStorage`.
- Area tanpa menu menampilkan catatan netral, bukan area kosong tanpa penjelasan.

### FD9 — Placeholder pencarian seragam (WAJIB)
- Semua kolom pencarian memakai placeholder **`"Pencarian..."`** (`ACTION.search`
  dari `src/constants/labels.js`). **DILARANG** placeholder khusus per halaman
  (mis. "Cari nama, email, departemen...", "Cari deskripsi atau pengguna...").
- `DataTableCard` mengunci placeholder-nya ke `ACTION.search` — prop
  `searchPlaceholder` dihapus agar tidak bisa ditimpa.
- Input pencarian di luar `DataTableCard` juga wajib memakai `ACTION.search`.
- Dijaga guard #21.

### FD8 — Jarak label → kontrol = nilai token, tanpa slack (WAJIB)
- Primitive `ui/label.jsx` memakai **`block`** (bukan inline) + `leading-none`,
  sehingga kotak label **sama tinggi dengan teksnya** (14px). Sebelumnya label
  inline menambah *slack* baseline/descender ±3–5px sehingga jarak label→kontrol
  yang terlihat (±9–11px) TIDAK sama dengan nilai token (6px).
- Akibatnya jarak label→kontrol sekarang **persis** `--item-gap`:
  **6px** untuk form normal (`space-y-[var(--item-gap)]` pada `FormItem`) dan
  **4px** di dalam `.form-dense`.
- `.form-dense` dinaikkan `0.125rem` → **`0.25rem`** (menyimpang dari angka di
  R47.7) karena tanpa slack, 2px membuat label menempel ke kontrol.
- **DILARANG** menyetel `space-y`/margin manual per `FormItem` atau per label
  untuk mengatur jarak ini — ubah token `--item-gap` bila perlu. Dijaga guard #20.

### FD6 — Tinggi Card compact (WAJIB)
- `CardHeader` dan `CardFooter` memakai **`px-6 py-3`** (padding vertikal **12px**),
  `CardHeader` memakai `space-y-1`. `CardContent` tetap `px-6 py-4`.
- Padding vertikal header & footer **wajib seragam 12px** agar jarak dari divider
  konsisten di seluruh aplikasi. Hasil: header ≈ 49px, footer ≈ 53px (dengan
  tombol `h-8`).
- **DILARANG** menimpa tinggi/padding ini per halaman (mis. `py-4`/`py-6` pada
  `CardHeader`/`CardFooter`). Mengesampingkan 2B.8 — lihat pengecualian E7.
- Dijaga guard #17.

### FD7 — Toast: judul baku + warna semantik (WAJIB)
- Toast **hanya** boleh dibuat lewat helper **`src/lib/notify.js`**. **DILARANG**
  memanggil `toast()` dari `sonner` langsung di kode fitur (pages/composite/layout/auth).
- **Judul baku** (tidak boleh dikarang): `notify.success` → **"Sukses"**,
  `notify.error` → **"Gagal"**, `notify.warning` → **"Peringatan"**,
  `notify.info` → **"Info"**. Pemanggil hanya mengisi **deskripsi** (apa yang
  terjadi), mis. `notify.success("Profil diperbarui.")`.
- **Warna semantik** (aksen kiri `border-l-4` + warna ikon; badan toast tetap
  monokrom): Sukses = `--success`, Gagal = `--destructive`, Peringatan =
  `--warning`, Info = `--foreground` (netral). Token `--success`/`--warning`
  ditambahkan sebagai **token umpan balik** (lihat E8) — bukan warna dekorasi.
- Deskripsi memakai kalimat lengkap berakhiran titik; jangan mengulang judul.
- Pilihan Toast vs Inline vs Alert vs Dialog tetap mengikuti matriks 2C.17.
- Dijaga guard #18/#19.

### FD5 — Konsistensi teks tombol & letak tombol submit (WAJIB)
- **Teks tombol wajib memakai leksikon** di `src/constants/labels.js` (`ACTION`):
  `Tambah, Simpan, Ubah, Hapus, Batal, Tutup, Detail, Segarkan, Reset, Ekspor,
  Impor, Unggah, Unduh, Kirim, Salin, Cetak, Pulihkan, Arsipkan, Masuk, Keluar`.
  Satu intent = satu kata di seluruh aplikasi. **DILARANG** variasi seperti
  "Simpan Perubahan" / "Perbarui Kata Sandi" / "Simpan Data" untuk intent
  `save`. Tambahkan entry baru di `labels.js` lebih dulu bila ada intent baru.
- **Ikon tombol juga konsisten per intent**: save = `Save`, tambah = `Plus`,
  hapus = `Trash2`, ubah = `Pencil`, batal/tutup = `X`, detail = `Eye`,
  segarkan = `RefreshCw`, unggah = `Upload`.
- **Tombol submit/aksi sebuah Card WAJIB berada di `CardFooter`**
  (`<CardFooter className="justify-end gap-2">`; divider `border-t` & padding
  `px-6 py-4` sudah dibawa primitive). **DILARANG** save bar hand-rolled
  (`div` dengan `flex justify-end border-t pt-4`) di dalam `CardContent`.
  Ini **mengesampingkan R51.2** (yang menaruh save bar di akhir aliran halaman)
  karena setiap section card di FlowDesk menyimpan/submit datanya sendiri.
  Bentuk `<form>` membungkus `CardHeader/CardContent/CardFooter` di dalam `Card`.
  Dijaga guard #15.

### FD4 — Menu pengguna
- Dropdown pengguna di footer sidebar berisi **Profil** (`/profile`) dan **Keluar**.

## Status migrasi (diperbarui tiap fase)

| Fase | Cakupan | Status |
|---|---|---|
| 0 | Fondasi: token 2-layer monokrom, Geist, density (Dense/Lega), primitive & composite shadcn, ThemeProvider/DensityProvider, ErrorBoundary, dokumen + guard | ✅ Selesai |
| 1 | Shell (`AppLayout`/`AppSidebar`/breadcrumb) + `AuthLayout` + halaman **Login** + Dashboard blank; menu sidebar hanya Dashboard | ✅ Selesai |
| 1b | Compact dikunci (FD1, density dihapus), lonceng notifikasi di header (FD2), area switcher Member Area/Administrator (FD3), aksi **Profil** di menu pengguna (FD4) | ✅ Selesai |
| 2b | Area **Administrator** diaktifkan: grup menu **"Pengaturan"** (7 item) di `config/navigation.js`; **Log Aktivitas** dimigrasi ke `DataTableCard` mode SERVER (cari/filter/paginasi dari API) | ✅ Selesai |
| 2c | **Kelola Pengguna** (DataTableCard + dialog tambah/ubah/hapus + impor), **Kelola Peranan** (tabel peran + matriks hak akses + dialog izin), **Kelola Aplikasi** (section cards R51/FD5) | ✅ Selesai |
| 2d | **Kelola Database** (sections R51 + Riwayat Backup DataTable), **Kelola Notifikasi** (3 section cards + tombol Kirim Uji), **Kelola Arsip** (DataTableCard + Pulihkan / Hapus Permanen) | ✅ Selesai |
| 2 | Halaman list/CRUD (R47) sisanya: **Kelola Tugas**, **Kelola Rapat**, **Kelola Catatan**, **Ingatkan Saya**, **Time Schedule** → semuanya `DataTableCard` mode KLIEN + dialog tambah/ubah + `ConfirmDeleteDialog` | ✅ Selesai |
| 3 | Halaman detail & form: TaskDetail/TaskForm, MeetingDetail/MeetingForm, TimeScheduleDetail (Gantt monokrom) | ✅ Selesai |
| 4 | Dashboard (KPI + tenggat terdekat + rapat hari ini) & Pusat Notifikasi (DataTableCard mode SERVER) | ✅ Selesai |
| 5 | Sisa: Tiket Bantuan (fitur belum dibuat), Settings (halaman lama) | ⏳ Belum |
| 2a-1 | Penyempurnaan Profil: tinggi `CardHeader`/`CardFooter` dikecilkan (E7), urutan field sandi (Saat Ini di baris atas sendiri; Baru + Konfirmasi di baris berikutnya), foto profil tampil di footer sidebar & dropdown pengguna | ✅ Selesai |
| 2a | **Profil Pengguna** (`pages/Profile.jsx`) → pola konfigurasi R51 (section cards + save bar), rhf+zod, `AvatarUpload` composite baru | ✅ Selesai |
| 4 | Halaman konfigurasi (R51) + Kalender + Dashboard | ⏳ Belum |
