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
  halaman fitur maksimal `text-base` untuk judul (R45).
- Dijaga guard: pemakaian `DensityToggle`/`density-provider`/`data-density` = gagal.

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
| 2 | Halaman list/CRUD (R47): Tugas, Rapat, Catatan, Pengingat, Time Schedule, Pengguna, Peranan, Arsip, Log Aktivitas | ⏳ Belum |
| 2a-1 | Penyempurnaan Profil: tinggi `CardHeader`/`CardFooter` dikecilkan (E7), urutan field sandi (Saat Ini di baris atas sendiri; Baru + Konfirmasi di baris berikutnya), foto profil tampil di footer sidebar & dropdown pengguna | ✅ Selesai |
| 2a | **Profil Pengguna** (`pages/Profile.jsx`) → pola konfigurasi R51 (section cards + save bar), rhf+zod, `AvatarUpload` composite baru | ✅ Selesai |
| 3 | Halaman detail & form (TaskDetail/Form, MeetingDetail/Form, TimeScheduleDetail) | ⏳ Belum |
| 4 | Halaman konfigurasi (R51) + Kalender + Dashboard | ⏳ Belum |
