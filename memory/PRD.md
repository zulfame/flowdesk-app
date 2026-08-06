# FlowDesk — PRD

## Original Problem Statement
FlowDesk: a lightweight Internal Work Management System (NOT project management / ticketing / todo). "Simple for users, powerful behind the scenes." UI in Indonesian, code in English. Desktop-first, responsive, dark & light mode. Max 3-click rule.

## Architecture
- **Stack**: React 19 (CRA/craco) + FastAPI + MongoDB (motor). JWT Bearer auth. Emergent Object Storage for attachments.
- **Backend**: modular service-layer architecture under `/app/backend`:
  - `server.py` wires all routers under `/api`, seeds admin, creates indexes, inits storage.
  - `security.py` (JWT, bcrypt, get_current_user, require_admin), `db.py`, `storage.py`, `helpers.py` (activity logger), `notifications.py` (Telegram/SMTP/WhatsApp URL), `services.py` (cascade deletes — no orphan files/data).
  - `routers/`: auth, users (users+roles), tasks, meetings (+action items), reminders, notes, attachments, feeds (notifications+activity log), aggregate (dashboard+calendar+events+search), settings.
- **Frontend** `/app/frontend/src`: AuthContext + ThemeContext, Layout (collapsible sidebar, topbar, Cmd+K global search, notifications, theme toggle), pages for every module.

## User Personas
- Admin: manages users, roles, system configuration.
- Manager/Member: create & manage tasks, meetings, reminders, notes.

## Core Requirements (static)
- Task = one work request (title, description, requester, PIC, priority, deadline, checklist, attachments, comments, history, progress, status).
- Progress auto-calculated from checklist; status auto-derived (Draft/Pending/On Progress/Completed/Overdue/Cancelled/Archived).
- Meeting = digital notebook (agenda, rich-text notes, decisions, participants, action items, attachments). Action item → Task in one click with bidirectional link.
- Unified calendar (meetings + task deadlines + reminders + events). Reminders (today/tomorrow/custom/recurring). Notes (rich text). Notification center. Activity log (audit). Attachment manager (object storage, soft-delete, cascade). RBAC. System configuration. Global search.

## Implemented (2026-07-19)
- ✅ JWT auth (login/register/me/logout), admin seed, brute-force lockout, RBAC.
- ✅ Tasks: CRUD, auto progress + auto status, checklist, comments, history, attachments, delete cascade.
- ✅ Meetings: CRUD, rich-text notes/decisions, action items, one-click convert to Task (bidirectional link), generated tasks list, attachments.
- ✅ Calendar (aggregated), Reminders, Notes (rich text, pin, tags, color), Notifications, Activity Log, Users & Roles, Settings (General/Email/Telegram/Notification/Storage/Application) with test-notification, Global Search.
- ✅ Attachments via Emergent Object Storage (upload/list/download/soft-delete).
- ✅ Dark/light theme, Indonesian UI, elegant design (Cabinet Grotesk + Plus Jakarta Sans, indigo accent, soft shadows, rounded).
- ✅ Tested: backend 30/30 pytest; frontend E2E passing after fixing action-item convert bug.

## Backlog
- P1: Recurring reminder auto-scheduling/cron; browser push notifications (Notification API); rich-text table/image toolbar enhancements.
- P2: Restore/archive views for soft-deleted items; export reports; permission-level enforcement beyond admin gating.

## Notes
- Telegram/Email dispatch is best-effort and inactive until credentials are set in Settings (expected).

## Update (2026-07-19) — Menu restructure + admin modules
Grouped sidebar into 3 sections; consistent titles/routes; standardized confirmation dialogs (`components/ConfirmDialog.jsx`); server-side pagination for data-heavy lists.
- **Selamat Datang**: Dashboard (`/`), Profil Pengguna (`/profile`).
- **Menu Utama**: Kalender (`/calendar`, sidebar badge = tasks with deadline this month), Kelola Tugas (`/tasks`), Kelola Rapat (`/meetings`), Kelola Catatan (`/notes`), Ingatkan Saya (`/reminders`).
- **Menu Admin**: Kelola Aplikasi (`/app-settings`), Kelola Peranan (`/roles`), Kelola Pengguna (`/users`), Kelola Database (`/database`), Kelola Notifikasi (`/notification-settings`), Log Aktivitas (`/activity`).
- Notification center stays at `/notifications` via topbar bell (not in sidebar).

New/changed features:
- ✅ **Profil Pengguna**: self-service edit (name/email/phone/department/avatar) + password change; email/phone/name changes PROPAGATE to denormalized copies (task requester/pic, meeting/note/reminder created_by_name). Backend `routers/profile.py`.
- ✅ **Kelola Pengguna**: server pagination + search + role filter; CSV/XLSX import with upsert-by-email (`POST /api/users/import`, openpyxl). Default import password `flowdesk123`.
- ✅ **Kelola Peranan**: dedicated RBAC page with permission matrix; `GET /api/permissions` (12 perms); core roles (admin/manager/member) protected.
- ✅ **Ingatkan Saya**: redesigned card grid + tabs (Aktif/Selesai/Semua); own-only listing; broadcast option via email/telegram + time-of-day; background dispatch loop (every 5 min) in `server.py`.
- ✅ **Kelola Aplikasi**: branding — app name, company, timezone, language, date format, app URL, meta description, primary color, logo/favicon/thumbnail (base64 data URLs). Live branding via `BrandingContext` + `GET /api/settings/public`.
- ✅ **Kelola Notifikasi**: split-out email SMTP + telegram + channel toggles + test buttons.
- ✅ **Kelola Database**: external S3 config (endpoint/bucket/access_key/secret_key/region/path) + Uji Koneksi (boto3, `s3_storage.py`); full backup & restore (`routers/database.py`) — "Backup & Unduh" (local, downloadable) and "Backup ke Object Storage" (S3); history with Periksa/Unduh/Restore/Hapus. Backups gzipped JSON of all collections.
- ✅ **Log Aktivitas**: redesigned + server pagination + search + entity/action filters.
- ✅ Global UI: all `<Input>`/`<Textarea>` default `autoComplete="off"`.
- ✅ Tested (iteration_5): backend 59/59 pytest; all frontend flows pass; 0 issues.

Backlog (still open): AI meeting summary; encrypted backups; timezone-aware scheduling refinements.

## Update (2026-06) — Notifikasi, storage lokal, deploy multi-project, modul Time Schedule
- ✅ **Kanal notifikasi dihormati**: `dispatch_email`/`dispatch_telegram` (notifications.py) hanya kirim bila kanal aktif; semua pemanggilan `_send_email` langsung di tasks.py/server.py diganti (fix: email terkirim padahal kanal OFF).
- ✅ **Nama Pengirim email (from_name)**: field baru di Kelola Notifikasi; header `From: Nama <email>` via `formataddr`.
- ✅ **Broadcast pengingat**: kanal Telegram (ke Chat/Group ID sistem) diganti **WhatsApp (wa.me)** ke nomor HP pembuat; email broadcast kini ke email pembuat. Chat/Group ID hanya untuk info sistem.
- ✅ **Wording notifikasi ke grup**: pesan penugasan & @mention memakai NAMA (mis. "ditugaskan kepada Zulfadli Rizal") bukan "Anda".
- ✅ **Storage fallback lokal**: `storage.py` menyimpan lampiran ke filesystem bila `EMERGENT_LLM_KEY` tidak ada / `LOCAL_STORAGE_DIR` di-set (fix "Network Error" upload di deploy lokal). Preview tetap pakai Emergent Object Storage.
- ✅ **Deploy lokal**: fix `yarn.lock` opsional; port & nama container/volume/network dapat dikonfigurasi (`COMPOSE_PROJECT_NAME`, wizard `start.sh`) untuk multi-project; `seed.sh` reset data; volume `uploads_data`.
- ✅ **Modul Time Schedule (Gantt)** [P2 baru]: menu "Time Schedule" di Menu Utama (atas "Ingatkan Saya"). CRUD jadwal + kegiatan (nama, PIC, tanggal mulai–selesai, kategori Pelaksanaan/Event/Libur, status, catatan). Tampilan Gantt (header bulan/tanggal, highlight akhir pekan/hari libur/hari Event, legenda). Aksi **Buat Tugas** dari kegiatan (tertaut ke jadwal). **Ekspor Excel** (openpyxl). RBAC: Admin/Manajer semua, Anggota hanya miliknya/PIC. Permission `time_schedule` di Kelola Peranan; login/me kini kirim `permissions` efektif; menu digerbangi via `hasPerm`. Backend: `routers/time_schedule.py`. Frontend: `pages/TimeSchedule.jsx`, `pages/TimeScheduleDetail.jsx`.
- ✅ **Role seeding idempoten**: `server.py` startup meng-`$addToSet` izin peran bawaan (fix peran lama tak dapat izin baru).
- ✅ Tested: iteration_8 (notif/upload) 100%, iteration_9 (Time Schedule admin) + iteration_10 (member + wording) 19/19 backend + UI pass.

## Update (2026-06/07) — Enhancement Time Schedule + migrasi notifikasi
- ✅ **Migrasi teks lama (sekali jalan)**: `server.py` `_migrate_notif_wording()` mengubah notifikasi in-app lama "Anda" → nama penerima (57 record diperbarui; flag `migrations.notif_wording_v1` mencegah re-run). Catatan: pesan Telegram yang sudah terkirim ke grup tidak bisa diedit dari sistem.
- ✅ **Warna kegiatan kustom**: field `color` per kegiatan (backend model + export xlsx pakai warna). UI: swatch preset + color picker + Reset di dialog kegiatan; bar Gantt & dot daftar memakai warna kustom (fallback ke warna kategori).
- ✅ **Progres otomatis**: garis vertikal "Hari ini" di Gantt; bar terbagi (terlewati solid vs sisa transparan); persen progres per kegiatan (`autoProgress`) berdasarkan tanggal berjalan + bar progres di Daftar Kegiatan. Verified via UI (100%/60%/0%).

## Update (2026-07) — Sinkronisasi dokumentasi & panduan deploy
- ✅ README.md diperbarui menyeluruh: Fitur Utama (Time Schedule, broadcast WhatsApp), pemisahan penyimpanan lampiran (Emergent/filesystem `LOCAL_STORAGE_DIR`) vs backup database (S3 eksternal), struktur proyek (roles/time_schedule/deploy), tabel env (`LOCAL_STORAGE_DIR`), hak akses Time Schedule, konfigurasi deploy lokal via `.env`/wizard, catatan storage produksi, bagian Notifikasi ditulis ulang (kanal aktif, Nama Pengirim, Telegram=sistem, WhatsApp, wording nama).
- ✅ root `docker-compose.yml`: tambah volume `uploads_data` + `LOCAL_STORAGE_DIR=/data/uploads` agar lampiran persisten pada quick-start. Kedua compose divalidasi YAML.

## Update (2026-07) — Audit deployability (Nexus Panel / Docker generik)
- ✅ Hapus artefak Docker root kustom: `Dockerfile.backend`, `docker-compose.yml`, `frontend/Dockerfile`, `frontend/nginx.conf` (panel menghasilkan sendiri). `deploy/local/` dipertahankan.
- ✅ `storage.py`: `LOCAL_STORAGE_DIR` default `/app/data`; `_use_local()` = `not EMERGENT_KEY` (preview pakai Emergent, self-host pakai filesystem `LOCAL_STORAGE_DIR/uploads`).
- ✅ `database.py`: `BACKUP_DIR` = `LOCAL_STORAGE_DIR/backups` (sebelumnya hardcoded `/app/backups`).
- ✅ `frontend/.env`: tambah `DISABLE_ESLINT_PLUGIN=true` agar `yarn build` sukses walau ada eslint warning (terbukti build OK).
- ✅ README: bagian `## Environment Variables` (tabel lengkap 4 kolom) + subseksi "Deploy via Control Panel"; `.gitignore` menambah `/data/` & `/backups/`.
- Verifikasi: `server:app` ada, semua route `/api`, upload/download/delete lampiran 200 di preview (Emergent), backend sehat, `yarn build` sukses. Var wajib: MONGO_URL, DB_NAME, JWT_SECRET, REACT_APP_BACKEND_URL.

## Update (2026-06) — Perbaikan deploy lokal + skrip reset
- ✅ Fix Docker build lokal gagal (`frontend/yarn.lock not found`): `deploy/local/flowdesk.frontend` kini `COPY frontend/package.json frontend/yarn.lock* ./` + `yarn install` (lockfile opsional; yarn.lock tak ter-track di git). README manual-build disamakan (`yarn install`).
- ✅ Skrip reset data: `deploy/local/seed.sh` — jalankan `python seed.py --force` via `docker compose exec backend`; auto-start stack; konfirmasi 'YA' atau `-y`.
- Catatan: build Docker & skrip tak bisa dijalankan di pod preview (docker tak tersedia); verifikasi build/seed nyata di mesin lokal user. User konfirmasi deploy lokal sudah berjalan.
- ✅ Multi-project lokal + port konfigurable: `docker-compose.yml` namespace container/volume/network via `COMPOSE_PROJECT_NAME`; port via `FRONTEND_PORT`/`BACKEND_PORT`/`MONGO_PORT`/`MONGO_EXPRESS_PORT`. `start.sh` kini punya wizard pilih nama+port (`--reconfigure`, `-y`); `stop.sh`/`deploy.sh`/`seed.sh` memuat `.env`. Tervalidasi: bash syntax, YAML, interpolasi default & project kedua. README diperbarui.

## Update (2026-07-19c) — Akses berbasis peran/kepemilikan + pembersihan lampiran
- ✅ **Visibilitas data (Menu Utama)**: Admin & Manajer melihat semua; Anggota hanya melihat data terkait dirinya (pembuat / PIC / pemberi tugas / peserta rapat). Diterapkan di list, detail, dashboard, kalender, dan pencarian global. `helpers.py:task_visibility_query/meeting_visibility_query`.
- ✅ **Hak ubah/hapus**: hapus & ubah info inti hanya oleh pembuat atau Admin (403 selain itu); **PIC** hanya boleh memperbarui status/progres/checklist/dokumen tugas (field inti di-strip). Catatan: dilihat semua (bersama), diubah/dihapus hanya pembuat/Admin. Pengingat tetap privat.
- ✅ **Frontend guard**: tombol Edit/Hapus disembunyikan bila tak berhak (`lib/perms.js`); catatan milik orang lain dibuka mode baca-saja; grup "Menu Admin" hanya untuk admin.
- ✅ **Pembersihan lampiran**: hapus lampiran individual kini HARD delete (berkas fisik dihapus via `storage.delete_object`); purge item dari Kelola Arsip juga menghapus berkas fisik lampirannya — mencegah penumpukan di object storage.
- ✅ Menu "Arsip" → **"Kelola Arsip"**.
- ✅ Tested (iteration_7): backend 21/21 (+95/95 regresi penuh); semua alur frontend member vs admin pass; 0 isu.
- Member test account: member@flowdesk.com / member123 (lihat test_credentials.md).

## Update (2026-07-19b) — Rapat rework, Web Push, Arsip, scheduled backup
- ✅ **Reminder broadcast timing**: broadcast_offset (10m default / 1h / 1d / custom date-time); backend computes `broadcast_at`; separate dispatch (in-app at remind_at, broadcast at broadcast_at). `routers/reminders.py`, `server.py:_dispatch_reminders`.
- ✅ **Kelola Rapat**: redesigned list (colored type accent, action-item progress, search + type filter); dedicated 2-column **MeetingForm** (`/meetings/new`, `/meetings/:id/edit`) consistent with TaskForm; Edit button on detail.
- ✅ **Meeting → Task**: enhanced convert dialog requiring PIC (UserSelect) + deadline + priority; backend validates (400 if missing); task linked to meeting. `routers/meetings.py:ConvertBody`.
- ✅ **Web Push (real browser notifications)**: VAPID via py_vapid/pywebpush (`webpush.py`, `routers/push.py`, `public/sw.js`, `src/lib/push.js`); `create_notification` also sends push; enable/disable button in Kelola Notifikasi.
- ✅ **Arsip / soft-delete**: all deletes now soft (`services.py` sets is_deleted + cascade files); `routers/archive.py` list/restore/purge; `/archive` admin page + sidebar item; all list/get/dashboard/calendar/search/nav-badges queries filter `is_deleted`.
- ✅ **Backup upgrades**: scheduled auto-backup (settings.backup: auto_enabled/frequency/time/weekday/destination) via `scheduled_backup_loop`; restore-from-upload (`POST /api/database/restore-upload`); Database page cards for both.
- ✅ Global: header now solid white (`bg-card`); all inputs/textarea `autoComplete="off"`.
- ✅ Tested (iteration_6): backend 74/74; all frontend flows pass; fixed a minor React key warning.

## Update (2026-07-29) — Isolasi data & konsistensi cascade lampiran
- ✅ **Rapat: lampiran privat per-peserta**: `MeetingDetail.jsx` mengunggah lampiran dengan `parent_id="{meetingId}:{userId}"` (sebelumnya hanya `meetingId`), sinkron dengan backend `get_meeting` yang membaca lampiran & catatan pribadi per pengguna. Setiap peserta kini punya catatan/keputusan/lampiran sendiri (shell rapat tetap bersama).
- ✅ **Kelola Catatan: ketat pribadi**: `notes.py` list/get/update/delete kini difilter `created_by=user.id` (Admin pun hanya lihat miliknya). Verified via curl.
- ✅ **Konsistensi cascade delete lampiran**: `time_schedule.py` delete kini lewat service layer `services.delete_time_schedule` (cascade file + masuk Arsip). `time_schedule` ditambahkan ke `archive.py` TYPES (bisa restore/purge). Purge permanen menghapus berkas fisik via `purge_files(prefix=True)`. Verified: buat→hapus→Arsip→purge→download 404.
- Catatan: Preview menampilkan placeholder "Preview Unavailable" (inactivity platform), bukan error app; backend & frontend RUNNING, compile sukses.
- **Next**: Redesign UI SectionCard (header/body/footer) untuk index Time Schedule, Kelola Catatan, Ingatkan Saya — SELESAI (lihat update di bawah). Notifikasi ditunda atas permintaan user.

## Update (2026-07-29b) — Redesign UI SectionCard halaman index
- ✅ **Kelola Catatan, Ingatkan Saya, Time Schedule** kini memakai pola `SectionCard` (header/body/footer, border kiri beraksen, hover lift) — konsisten dengan Kelola Rapat.
  - Catatan: aksen warna kiri sesuai warna catatan; header=judul+pin, footer=tag + tanggal diperbarui.
  - Ingatkan Saya: aksen kiri per jenis (Hari Ini/Besok/Khusus/Berulang); body=toggle selesai+judul, footer=tanggal/jam/pengulangan/kanal broadcast.
  - Time Schedule: aksen indigo; header=seksi, body=judul+event+deskripsi+"Buka linimasa", footer=rentang tanggal + jumlah kegiatan.
- Semua data-testid dipertahankan; frontend compile sukses.
- Catatan: verifikasi visual oleh user (preview sempat menampilkan placeholder inaktivitas platform saat sesi ini; bukan error app — backend & frontend RUNNING, compile OK, bundle app tersaji di localhost:3000).

## Update (2026-08-06) — Sesi lanjutan: pemulihan lingkungan & server berjalan
- Lingkungan pod baru: `node_modules` belum ada (frontend gagal: `craco: not found`) → `yarn install` di `/app/frontend`; backend deps sudah terpasang (catatan: `pip install -r requirements.txt` gagal resolve `emergentintegrations==0.2.0` vs `litellm 1.80.0`, namun tidak dipakai di kode — backend jalan normal).
- ✅ backend + frontend + mongodb RUNNING; `GET /api/` → 200; login admin (admin@flowdesk.com / admin123) sukses via UI preview; dashboard, sidebar 3 grup, dan semua menu tampil normal.
- DB saat ini fresh (hanya user admin; koleksi tasks/meetings/roles kosong). `member@flowdesk.com` belum ada — perlu dibuat manual bila uji RBAC anggota.
- `memory/test_credentials.md` dibuat ulang (hilang di pod ini).
- Temuan: halaman **Tiket Bantuan** (`pages/HelpTickets.jsx`, menu `/help-tickets`) masih placeholder "dalam pengembangan" — belum ada backend/router tiket. Kandidat fitur berikutnya.

## Update (2026-08-06) — REDESIGN Fase 0 + Fase 1 (UI Guideline zulfame/ui-guideline)
Keputusan pemilik produk (terkunci): **bahasa UI Indonesia** (override §6 English-only), **monokrom token-only** dengan pengecualian "warna sebagai data" (warna catatan, warna kegiatan Time Schedule, aset branding), **font Geist**, **alur autentikasi tidak diubah** (dibahas setelah redesign), sidebar **hanya Dashboard (blank)** — modul lain dimigrasi satu per satu, rute lama tetap dapat diakses via URL langsung.

### Fase 0 — Fondasi (selesai)
- `src/index.css` diganti ke arsitektur token **2-layer** (primitive neutral/red/chart → semantic light+dark), Geist+Inter, var density (`--ctl-h`, `--field-gap`, `--item-gap`, `--tbl-cell-py`), utilitas `.tbl-density` & `.form-dense`. Utilitas lama yang masih dipakai modul legacy dipertahankan (scrollbar, `.thin-scroll`, `.rte-content`, print).
- `tailwind.config.js`: token `sidebar.*` & `chart.*`, `fontFamily.sans = Geist/Inter`, radius 0.5rem. Poppins & aksen indigo dilepas.
- Primitive shadcn baru: `sidebar, empty, spinner, kbd, field, item, native-select, button-group, input-group, typography, chart` + penyelarasan `card, dialog (DialogBody), alert-dialog, button, input, select, form, command, input-otp` ke versi SSOT guideline; hook `use-mobile`.
- Composite baru: `EmptyState, DataTableCard, Combobox, DatePicker, PasswordInput, sortable-table`.
- Provider: `theme-provider` (Terang/Gelap/Sistem) + `ModeToggle`, `density-provider` (Dense default) + `DensityToggle` (Rapat/Lega), `ErrorBoundary` global. `context/ThemeContext.jsx` lama tidak lagi dipakai.
- Dependensi: `@tanstack/react-table@8.21.3`. Catatan: `recharts` masih 3.6.0 (guideline pin 2.15.4) — ditangani saat migrasi chart/Dashboard.
- Governance: 11 dokumen guideline + `design-guard.sh` disalin ke `/app/frontend/docs/`, plus `docs/FLOWDESK_EXCEPTIONS.md` (E1 bahasa ID, E2 warna-sebagai-data, E3 primary_color tidak menimpa `--primary`, E4 konten domain, E5 guard mengecualikan modul legacy + tabel status migrasi). Guard di-scope ke kode yang sudah dimigrasi; daftar LEGACY menyusut tiap fase.

### Fase 1 — Shell + Login (selesai)
- `config/navigation.js` terpusat (isi: hanya Dashboard) + `getBreadcrumb()` yang juga mengenali rute legacy.
- `components/layout/AppLayout.jsx` (SidebarProvider `h-svh` + SidebarInset, header `h-[65px]`: SidebarTrigger + Breadcrumb + DensityToggle + ModeToggle, hanya area konten yang scroll) & `AppSidebar.jsx` (collapse-to-icon, brand dinamis dari BrandingContext, footer user dropdown → Keluar). Bell notifikasi & Cmd+K sengaja disembunyikan sampai modulnya dimigrasi.
- `components/layout/AuthLayout.jsx` (split 2 kolom, panel brand + grid dekoratif token-based, brand dari BrandingContext) + `pages/Login.jsx` & `components/auth/LoginForm.jsx` (react-hook-form + zod pesan Indonesia, `PasswordInput`, `Alert destructive`, tombol berikon `LogIn`, checkbox "Ingat email saya" → simpan email di localStorage). **Tanpa** link Daftar & Lupa sandi.
- `pages/DashboardPage.jsx` blank (Card + EmptyState). Dashboard lama tetap ada di `/dashboard-legacy`.
- `App.js`: ThemeProvider → DensityProvider → BrandingProvider → AuthProvider → ErrorBoundary → Router; semua rute lama tetap terdaftar di dalam shell baru.
- Backend **tidak disentuh** sama sekali; endpoint & alur auth (JWT email+sandi) tetap sama.

### Verifikasi
`design-guard.sh` exit 0 · eslint bersih untuk file baru (sisa error hanya di modul legacy) · compile bersih · login admin sukses & redirect ke Dashboard · validasi zod Indonesia tampil · Alert "Gagal masuk / Email atau kata sandi salah" tampil · dark mode aktif (`html.dark`) · tanpa overflow horizontal di 375/768/1440 · halaman legacy (`/tasks`) masih terbuka di shell baru.

### Fase berikutnya (belum dikerjakan)
Fase 2 list/CRUD (R47), Fase 3 detail & form, Fase 4 konfigurasi (R51) + Kalender + Dashboard. Setelah redesign selesai: pembahasan perubahan alur autentikasi.
