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
| E5 | 2C.14 — guard atas seluruh `src` | `design-guard.sh` **mengecualikan modul yang belum dimigrasi** (daftar `LEGACY` di dalam skrip). Daftar itu menyusut setiap fase sampai kosong. | Redesign dilakukan bertahap; guard harus tetap bermakna (exit 0) untuk kode yang sudah dimigrasi. |

## Status migrasi (diperbarui tiap fase)

| Fase | Cakupan | Status |
|---|---|---|
| 0 | Fondasi: token 2-layer monokrom, Geist, density (Dense/Lega), primitive & composite shadcn, ThemeProvider/DensityProvider, ErrorBoundary, dokumen + guard | ✅ Selesai |
| 1 | Shell (`AppLayout`/`AppSidebar`/breadcrumb) + `AuthLayout` + halaman **Login** + Dashboard blank; menu sidebar hanya Dashboard | ✅ Selesai |
| 2 | Halaman list/CRUD (R47): Tugas, Rapat, Catatan, Pengingat, Time Schedule, Pengguna, Peranan, Arsip, Log Aktivitas | ⏳ Belum |
| 3 | Halaman detail & form (TaskDetail/Form, MeetingDetail/Form, TimeScheduleDetail, Profil) | ⏳ Belum |
| 4 | Halaman konfigurasi (R51) + Kalender + Dashboard | ⏳ Belum |
