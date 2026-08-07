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

## Update (2026-08-06) — Fase 1b: aturan wajib FlowDesk (FD1–FD4)
Permintaan user setelah review Fase 1 (uji frontend otomatis DITUNDA, user menguji sendiri):
- **FD1 — Compact WAJIB & satu-satunya**: `DensityProvider` + `DensityToggle` **dihapus**, blok CSS `:root[data-density="comfortable"]` dihapus, nilai kerapatan dikunci di `:root` (`--ctl-h: 2rem`, `--field-gap: .75rem`, `--item-gap: .375rem`, `--tbl-cell-py: .25rem`). `DataTableCard` tidak lagi menampilkan toggle. Dijaga otomatis: `design-guard.sh` cek #14 menolak `DensityToggle|density-provider|density-toggle|data-density` di seluruh `src`.
- **FD2 — Aksi header**: selectbox "Kerapatan" diganti **ikon lonceng** `components/layout/NotificationsBell.jsx` (Popover: judul "Notifikasi" + placeholder "Belum ada notifikasi", siap disambungkan saat modul notifikasi dimigrasi). Header kini = SidebarTrigger + Breadcrumb + Lonceng + ModeToggle.
- **FD3 — Sidebar berbasis AREA**: header sidebar jadi **area switcher** (mengikuti referensi "Areas") dengan 2 area: **Member Area** (pekerjaan harian) & **Administrator** (pengelolaan sistem, hanya role admin). `config/navigation.js` kini berbentuk `AREAS[{id,label,description,icon,adminOnly,sections}]` + helper `getAreas/getArea/firstRouteOf/areaIdOf`; area aktif mengikuti rute & disimpan di `localStorage` (`flowdesk.activeArea`). Area tanpa menu menampilkan catatan netral.
- **FD4 — Menu pengguna**: dropdown user footer sidebar kini berisi **Profil** (`/profile`) + **Keluar**.
- Aturan FD1–FD4 dicatat sebagai bagian **Non-Negotiable** di `frontend/docs/FLOWDESK_EXCEPTIONS.md` (bukan hanya catatan) dan status migrasi ditandai Fase 1b selesai.
- Verifikasi manual: guard exit 0, eslint bersih untuk file baru, compile bersih, area switcher 2 opsi + catatan area kosong tampil, popover lonceng tampil, Profil membuka `/profile`, jumlah `density-toggle-trigger` = 0.

## Update (2026-08-06) — Migrasi halaman Profil Pengguna (pola R51)
- `pages/Profile.jsx` ditulis ulang mengikuti **R51 (Pola Halaman Konfigurasi)**: 2 **section card** bertumpuk (`Informasi Diri`, `Ubah Kata Sandi`) dengan komponen `Section` reusable, root `space-y-6`, dan **save bar** `flex justify-end border-t pt-4` per section (bukan sticky/mengambang). Judul `CardTitle text-base` (R45), semua tombol `size="sm"` + ikon (R48/R49).
- Form pakai **react-hook-form + zod** (`lib/validation/profileSchema.js`) dengan pesan Indonesia: nama & email wajib, email valid, kata sandi baru minimal 6 karakter, konfirmasi harus cocok. Error tampil **inline** di bawah field (bukan hanya toast). Kata sandi memakai composite `PasswordInput` (toggle mata).
- Composite baru **`components/composite/AvatarUpload.jsx`**: `Avatar h-12 w-12` (batas density, guard #5) + tombol `Unggah Foto` / `Hapus`, validasi tipe & ukuran (maks 600 KB), base64 data URL. Menggantikan pemakaian `ImageUpload` legacy di halaman ini (ImageUpload tetap ada untuk modul lain).
- Kartu ringkasan 3-kolom lama dihapus; identitas (nama, email, `Badge` peranan) kini menyatu di baris atas section pertama. `PageHeader` lama tidak dipakai lagi karena konteks halaman sudah dibawa breadcrumb di header shell.
- Endpoint tidak berubah: `PUT /api/profile` (name, email, phone, department, avatar) & `PUT /api/profile/password`. `setUser()` tetap dipanggil sehingga nama/inisial di sidebar langsung ikut ter-update. Semua `data-testid` lama dipertahankan (`profile-name`, `profile-email`, `profile-phone`, `profile-department`, `pwd-current`, `pwd-new`, `pwd-confirm`, `btn-save-profile`, `btn-save-password`, `avatar-btn`, `avatar-clear`, `avatar-input`).
- `Profile` dikeluarkan dari daftar LEGACY di `design-guard.sh` (kini ikut diawasi) → guard tetap **exit 0**; eslint bersih.
- Verifikasi manual: simpan profil berhasil (toast "Profil diperbarui" + data tersimpan), validasi "Konfirmasi kata sandi tidak cocok" tampil inline, tanpa overflow horizontal di 375/1440.

## Update (2026-08-06) — Aturan design system baru: FD6 (tinggi Card) & FD7 (Toast)
- **FD6 — Tinggi Card compact (WAJIB, ditetapkan sebagai aturan)**: primitive `ui/card.jsx` diubah — `CardHeader` & `CardFooter` `px-6 py-4` → **`px-6 py-3`** (padding vertikal seragam 12px), `CardHeader space-y-1.5` → `space-y-1`; `CardContent` tetap `px-6 py-4`. Hasil terukur: header ≈49px, footer ≈53px. Override padding per halaman DILARANG (guard #17). Tercatat sebagai aturan FD6 + pengecualian E7 (mengesampingkan 2B.8) di `frontend/docs/FLOWDESK_EXCEPTIONS.md`.
- **FD7 — Toast: judul baku + warna semantik (WAJIB)**: helper baru **`src/lib/notify.js`** menjadi satu-satunya cara membuat toast. Judul baku: `notify.success` → **"Sukses"**, `notify.error` → **"Gagal"**, `notify.warning` → **"Peringatan"**, `notify.info` → **"Info"**; pemanggil hanya mengisi deskripsi. `ui/sonner.jsx` ditulis ulang (memakai `useTheme` milik FlowDesk, bukan next-themes) dengan aksen kiri `border-l-4` + warna ikon per tipe: Sukses `--success`, Gagal `--destructive`, Peringatan `--warning`, Info `--foreground`; badan toast tetap monokrom. Dijaga guard #18 (larangan import `toast` dari "sonner" di kode fitur) & #19 (larangan judul toast dikarang).
- **Token umpan balik baru (pengecualian E8)**: `--success` & `--warning` (light: green 142 71% 36% / amber 32 95% 38%; dark: 142 62% 52% / 38 92% 58%) + kelas Tailwind `success`/`warning`. Dipakai HANYA untuk elemen status (aksen & ikon toast, badge status), bukan dekorasi UI.
- Pemakaian toast di kode yang sudah dimigrasi (Profile, LoginForm, AvatarUpload) diganti ke `notify`; `App.js` kini memakai `Toaster` dari `@/components/ui/sonner`.
- Verifikasi manual (user menguji sendiri; uji agent ditunda sampai redesign selesai): toast sukses = judul "Sukses" + `rgb(27,157,74)` pada aksen & ikon; toast gagal = judul "Gagal" + `rgb(239,68,68)`; guard exit 0; compile bersih.

## Update (2026-08-06) — Tipografi ditegaskan + FD8 (jarak label → kontrol)
- **Keputusan tipografi: TETAP mengikuti guideline asli** (2A/2A.1 + R45): skala `12/14/16/24/30/36`; body/label/deskripsi = `text-sm` **14px**, judul section/`CardTitle` = `text-base` **16px**, helper/caption = `text-xs` **12px**; pengecualian compact yang sudah ada tetap: `.tbl-density td` **13px** (th 12px UPPERCASE) & `.form-dense` **13px** (R47.7/R47.8). Tidak ada perubahan ukuran font.
- **FD8 — jarak label → kontrol = nilai token, tanpa slack (aturan baru, WAJIB)**: akar masalah jarak label yang terlihat terlalu lebar di halaman Login bukan nilai gap-nya, tapi primitive `ui/label.jsx` yang **inline** sehingga line-box menambah slack baseline/descender ±3–5px (terlihat 9–11px padahal token 6px). Fix: `Label` kini **`block`** + `leading-none` → kotak label = kotak teks (14px). Hasil terukur: jarak label→kontrol **tepat 6px** di form normal dan **4px** di `.form-dense` (nilai `.form-dense --item-gap` dinaikkan `0.125rem` → `0.25rem` karena tanpa slack 2px terlalu menempel; menyimpang dari angka R47.7 dan dicatat).
- Menyetel `space-y`/`mt`/`mb` manual pada `FormItem`/`FormLabel` DILARANG (kecuali `space-y-0` untuk baris checkbox horizontal) — dijaga `design-guard.sh` cek **#20**.
- Verifikasi: guard exit 0, compile bersih, tinggi label 14px, gap login 6px, baris checkbox "Ingat email saya" tetap satu baris, halaman Profil (form-dense) gap 4px.

## Update (2026-08-06) — Area Administrator aktif + Log Aktivitas pakai DataTable
- **Menu admin**: area **Administrator** di `config/navigation.js` kini berisi grup **"Pengaturan"** (nama menggantikan "Menu Admin" lama) dengan 7 item & ikon yang sama seperti versi lama: Kelola Aplikasi (`/app-settings`), Kelola Peranan (`/roles`), Kelola Pengguna (`/users`), Kelola Database (`/database`), Kelola Notifikasi (`/notification-settings`), Kelola Arsip (`/archive`), Log Aktivitas (`/activity`). Berpindah area otomatis membuka item pertama area tersebut.
- **`DataTableCard` di-upgrade** (composite bersama, dipakai semua halaman list ke depan):
  - Seluruh teks dilokalkan ke Bahasa Indonesia + memakai leksikon `ACTION` (Segarkan, Reset, "Tidak ada baris yang cocok dengan pencarian.", "dari N baris", "Halaman x dari y").
  - `fmtDate` memakai locale **id-ID** (`dateStyle: medium`, `timeStyle: short`).
  - Prop baru **`filters`** (kontrol tambahan di toolbar abu) dan **mode SERVER**: `search={{value,onChange}}` + `pagination={{pageIndex,pageSize,pageCount,totalRows,onPageChange,onPageSizeChange}}` → `manualPagination`, cocok untuk data besar. Mode klien (default) tetap seperti sebelumnya.
  - `CardDescription` kini opsional (R47: halaman list tanpa deskripsi), testid tambahan `-total`, `-page`, `-prev`, `-next`.
- **`pages/ActivityLog.jsx` ditulis ulang** ke pola R47/R46: `DataTableCard` mode SERVER (endpoint `GET /api/activity-logs` dengan `entity_type`, `action`, `q`, `page`, `page_size`), 5 kolom sortable (Waktu, Pengguna, Aksi, Entitas, Deskripsi), 2 filter Select (Entitas & Aksi) di toolbar, tombol Segarkan, EmptyState, dan debounce 250ms. Definisi kolom dipindah ke module scope agar lolos aturan `react/no-unstable-nested-components`.
- **Monokrom**: ikon aksi berwarna-warni + kelas `emerald/blue/rose/indigo` lama dihapus; status aksi kini `Badge` (`destructive` untuk Hapus, `default` untuk Buat, `secondary` lainnya) dan entitas `Badge variant="outline"`. `ActivityLog` dikeluarkan dari daftar LEGACY guard.
- Verifikasi: guard exit 0, eslint bersih, tabel tampil 10/32 baris & "Halaman 1 dari 4", filter + Segarkan berfungsi, sidebar menampilkan grup "Pengaturan" dengan 7 item.

## Update (2026-08-06) — Migrasi 3 halaman admin + FD9 (placeholder pencarian)
- **FD9 (aturan baru, WAJIB)**: seluruh kolom pencarian memakai placeholder seragam **"Pencarian..."** (`ACTION.search` di `src/constants/labels.js`). Prop `searchPlaceholder` pada `DataTableCard` **dihapus** agar tidak bisa ditimpa; placeholder khusus di Log Aktivitas & Kelola Pengguna dihapus. Dijaga guard **#21**.
- **Kelola Pengguna** (`pages/Users.jsx`) → pola R47: `DataTableCard` mode SERVER (`GET /api/users` dgn `q`, `role`, `page`, `page_size`), kolom sortable (Nama+avatar, Email, Peran, Departemen, Status), filter Peran, tombol header **Impor** + **Tambah**, menu aksi baris `⋯ size-7` (Ubah / Aktifkan-Nonaktifkan / Hapus merah), dialog form rhf+zod dgn `DialogBody` & footer Batal-kiri/Simpan-kanan, `ConfirmDeleteDialog` (AlertDialog) untuk hapus, dialog **Impor** (unduh template CSV + dropzone + ringkasan hasil). Baris akun sendiri tidak punya aksi ("Akun Anda").
- **Kelola Peranan** (`pages/Roles.jsx`) → 2 kartu: (1) daftar peran (tabel `tbl-density`, badge Jumlah Izin & Jenis Bawaan/Kustom, menu aksi; peran bawaan admin/manager/member tidak bisa dihapus), (2) **Matriks Hak Akses** — baris = izin, kolom = peran, centang `--success` untuk diizinkan & garis muted untuk tidak, sehingga hak akses mudah dibaca sekilas. Dialog ubah peran memakai daftar `Switch` per izin (scrollable, divide-y) + Alert khusus Administrator (selalu semua izin).
- **Kelola Aplikasi** (`pages/AppSettings.jsx`) → pola R51/FD5 seperti Profil: 2 section card (**Identitas**: nama aplikasi, perusahaan, zona waktu, bahasa, format tanggal, URL, meta deskripsi; **Tampilan & Merek**: warna utama + Logo/Favicon/Thumbnail via composite baru `ImagePicker`), masing-masing dengan tombol **Simpan** di `CardFooter`. Alert menjelaskan bahwa antarmuka tetap monokrom (E3) meski warna merek tersimpan.
- Composite baru: `components/composite/ConfirmDeleteDialog.jsx` (AlertDialog destruktif standar R40/R47.6) & `components/composite/ImagePicker.jsx`. Skema baru: `lib/validation/adminSchema.js` (user, role, identity, branding).
- `design-guard.sh`: daftar LEGACY kini **di-anchor per nama file** (`/(Nama)\.jsx`) supaya tidak salah cocok (dulu "Settings" ikut mengecualikan `AppSettings.jsx`); Users/Roles/AppSettings/ActivityLog sudah keluar dari LEGACY. Guard exit 0, eslint bersih.
- Verifikasi: Kelola Pengguna (tabel + dialog Tambah tampil, placeholder "Pencarian...", "dari 1 baris"), Kelola Peranan (3 peran + matriks 13 izin × 3 peran), Kelola Aplikasi (2 section, 2 tombol "Simpan", data ter-load).

## Update (2026-08-06) — Migrasi Kelola Database, Kelola Notifikasi, Kelola Arsip
- **Kelola Arsip** (`pages/Archive.jsx`) → R47: `DataTableCard` mode SERVER (`GET /api/archive` dgn `type`, `q`, `page`, `page_size`), kolom Judul (ikon jenis monokrom) / Jenis / Dihapus / Oleh, filter Jenis, menu aksi baris `⋯` (**Pulihkan** non-destruktif + **Hapus Permanen** merah) dengan `ConfirmDeleteDialog`, EmptyState kontekstual.
- **Kelola Notifikasi** (`pages/NotificationSettings.jsx`) → R51/FD5: 3 section card — **Status Kanal** (3 `Switch` dalam daftar divide-y + baris Push Browser per perangkat), **Email (SMTP)** (7 field, `PasswordInput` untuk sandi), **Telegram** (token/chat id/thread) — masing-masing dengan footer `justify-end gap-2`: tombol **Kirim Uji** (outline) + **Simpan**. rhf+zod: port SMTP divalidasi angka 1–65535, email divalidasi format.
- **Kelola Database** (`pages/Database.jsx`) → gabungan R51 + R47: section **Penyimpanan (S3)** (footer: Uji Koneksi + Simpan), kartu **Backup Database** (footer: Backup ke Object Storage + Backup & Unduh), section **Backup Otomatis** (switch + frekuensi/jam/hari/tujuan, info backup terakhir), kartu **Restore dari Unggahan** (Alert destructive + dropzone + tombol Pulihkan), dan **Riwayat Backup** memakai `DataTableCard` mode klien (kolom Berkas/Dibuat/Ukuran/Jumlah Data/Lokasi + aksi Periksa/Unduh/Pulihkan/Hapus). Hasil "Periksa" tampil di Dialog (status valid memakai token `--success`).
- Composite: `ConfirmDeleteDialog` kini mendukung `destructive={false}` + `icon` (untuk aksi pulihkan), `EmptyState` menerima prop `icon` untuk glyph kontekstual. Skema baru di `adminSchema.js`: `channelsSchema`, `emailSchema`, `telegramSchema`, `storageSchema`, `autoBackupSchema`.
- Guard: `Database`, `Archive`, `NotificationSettings` keluar dari LEGACY → guard exit 0 mencakup seluruh area Administrator. Sisa LEGACY: Dashboard, Tasks/TaskDetail/TaskForm, Meetings/MeetingDetail/MeetingForm, HelpTickets, Calendar, Reminders, TimeSchedule(+Detail), Notes, Notifications, Settings.
- Verifikasi: compile & eslint bersih, ketiga halaman render dengan data ter-load (SMTP port 587, konfigurasi S3, arsip kosong dgn EmptyState, placeholder "Pencarian..." seragam).

## Update (2026-08-06) — Migrasi Member Area: 5 halaman list ke DataTableCard
Semua halaman list di **Member Area** kini memakai pola R47 (`DataTableCard` mode KLIEN: pencarian + sortir + paginasi di browser, filter di toolbar abu, aksi baris `⋯ size-7`, `ConfirmDeleteDialog`, `EmptyState` kontekstual). Judul kartu = nama menu, tombol header memakai leksikon `ACTION` (Tambah/Segarkan) + ikon konsisten (FD5).
- **Kelola Tugas** (`pages/Tasks.jsx`): kolom Judul (ikon rapat bila tertaut) / PIC / Prioritas / Tenggat / Progres (bar + %) / Status; filter Status, Prioritas, PIC; aksi baris Detail · Ubah · Duplikat · Hapus (Ubah & Hapus hanya untuk pembuat/Admin via `canManage`); dialog **Template Tugas** (daftar template + Gunakan/Hapus + buat template baru) dipindah ke `Dialog`+`DialogBody`. **Catatan: tampilan Kanban drag-drop lama DIHAPUS** (satu pola list per aplikasi) — bisa dikembalikan sebagai tampilan tersendiri bila diminta.
- **Kelola Rapat** (`pages/Meetings.jsx`): kolom Judul / Jenis / Tanggal / Waktu / Lokasi / Peserta / Item Aksi (selesai-per-total); filter Jenis; aksi Detail · Ubah · Hapus. Kartu berwarna per jenis (indigo/amber/emerald) diganti `Badge outline` monokrom.
- **Kelola Catatan** (`pages/Notes.jsx`): kolom Judul (dot warna catatan = data, E2 + ikon Pin) / Ringkasan (teks dari HTML) / Tag / Diperbarui; aksi Ubah · Sematkan/Lepas Sematan · Hapus; dialog editor memakai `RichTextEditor` + swatch warna (5 pilihan).
- **Ingatkan Saya** (`pages/Reminders.jsx`): kolom toggle selesai (`--success`) / Judul+deskripsi / Jenis / Tanggal / Jam / Pengulangan / Broadcast (badge Email/WhatsApp); filter Status (Aktif/Selesai/Semua) menggantikan Tabs; dialog buat pengingat (jenis, jam, tanggal/pengulangan, blok Broadcast dengan Switch + pilihan kanal + waktu kirim).
- **Time Schedule** (`pages/TimeSchedule.jsx`): kolom Judul / Acara / Seksi / Periode / Kegiatan; aksi Detail · Ubah · Hapus; dialog tambah-ubah jadwal. Linimasa Gantt tetap di halaman detail (belum dimigrasi).
- Composite baru **`components/composite/TaskBadges.jsx`**: `StatusBadge`, `PriorityBadge`, `ProgressCell` + peta label ID (`STATUS_META`, `PRIORITY_META`) — dipakai ulang saat migrasi TaskDetail/TaskForm.
- `constants/labels.js`: entri baru `duplicate: "Duplikat"`. Toast semua halaman ini kini lewat `notify` (FD7).
- `design-guard.sh`: LEGACY menyusut → sisa `Dashboard, TaskDetail, TaskForm, MeetingDetail, MeetingForm, HelpTickets, TimeScheduleDetail, Notifications, Settings`. Guard exit 0.
- Verifikasi manual (Playwright, tanpa testing agent sesuai permintaan user): kelima halaman render dengan data contoh; buat + hapus catatan berhasil (2→1 baris); buat pengingat berhasil (1→2 baris); dialog Ubah Jadwal terisi data; dialog Template tampil.
- Data contoh dibuat di DB preview untuk keperluan review UI (2 tugas, 1 rapat, 1 catatan, 2 pengingat, 1 jadwal).

### Berikutnya (P0)
Fase 3 — halaman detail & form: `TaskDetail.jsx` + `TaskForm.jsx`, `MeetingDetail.jsx` + `MeetingForm.jsx`, `TimeScheduleDetail.jsx` (Gantt). Lalu Dashboard, Notifikasi, Tiket Bantuan. Setelah redesign selesai: pembahasan perubahan alur autentikasi (P2, ditunda atas permintaan user).

## Update (2026-08-06, lanjutan) — Migrasi halaman Detail & Form
Fase 3 selesai: seluruh halaman detail/form Member Area kini memakai pola section card (R51) + `CardFooter` untuk aksi simpan (FD5), tanpa warna hardcode.
- **Detail Tugas** (`TaskDetail.jsx`): kartu ringkasan (judul + StatusBadge/PriorityBadge + progres) dengan tombol Kembali dan menu `⋯` (Duplikat, Jadikan Template — sekarang dialog, bukan `window.prompt`, Cetak, Ubah, Hapus); kartu **Item Tugas** (Checkbox PIC → tombol Setujui pemilik, tenggat inline, badge Disetujui/Menunggu persetujuan/Terlambat, `Collapsible` berisi Dokumen Item + Catatan Tugas + Lampiran Catatan) dengan penambah item di CardFooter; kartu **Komentar**; sidebar: Pemberi Tugas (+ tombol broadcast), Informasi, Dokumen Sumber, Riwayat (scroll `thin-scroll`).
- **Form Tugas** (`TaskForm.jsx`): satu card "Tugas Baru/Ubah Tugas" dengan subseksi dipisah `Separator` (info → pemberi/PIC via `UserSelect` → item tugas → dokumen sumber), aksi Batal/Simpan di CardFooter. Validasi: judul wajib, minimal 1 item.
- **Detail Rapat** (`MeetingDetail.jsx`): kartu header (jenis, tanggal, jam, lokasi) + menu `⋯`; kartu Tabs **Catatan / Keputusan / Agenda** (`RichTextEditor`, tombol Simpan di CardFooter); kartu **Item Aksi** BARU (checkbox selesai, tambah item, hapus, dan **Buat Tugas** lewat dialog PIC+Prioritas+Tenggat → `POST /meetings/{id}/action-items/{itemId}/convert`); sidebar Lampiran pribadi, Peserta + broadcast (dialog tautan WhatsApp), Tugas Turunan.
- **Form Rapat** (`MeetingForm.jsx`): satu card + peserta sebagai chip `Badge` yang bisa dihapus.
- **Linimasa Time Schedule** (`TimeScheduleDetail.jsx`): Gantt dirombak monokrom — kategori memakai `bg-foreground/70` (Pelaksanaan), `bg-foreground` (Event), `bg-muted-foreground/40` (Hari Libur); akhir pekan/libur `bg-muted`, hari Event `bg-accent`, garis "hari ini" `border-primary`, bar masa depan `opacity-40`. Warna kustom per kegiatan tetap inline style (E2). Legenda ada di CardHeader. Daftar kegiatan kini `DataTableCard` (Kegiatan/Kategori/PIC/Periode/Status/Progres + aksi Buat Tugas·Ubah·Hapus). Dialog: Kegiatan, Buat Tugas, Pengaturan Jadwal (rentang tanggal, hari libur, hari Event).
- `design-guard.sh`: LEGACY tinggal `Dashboard, HelpTickets, Notifications, Settings`. Guard exit 0.
- Verifikasi manual (Playwright): Detail Tugas render + tambah item + komentar OK; Form Tugas baru render; Detail Rapat render + tambah item aksi (2 item) + dialog Buat Tugas terbuka; Linimasa render + tambah kegiatan → bar Gantt & baris tabel muncul; Form Rapat (ubah) terisi data.

### Berikutnya (P0/P1)
- P0: Dashboard, Notifikasi, Tiket Bantuan → design sistem baru.
- P1: Ekspor Excel untuk datatable (Log Aktivitas, Pengguna, Tugas, dll).
- P2: Overhaul alur autentikasi (ditunda sampai redesign tuntas).

## Update (2026-08-06, lanjutan 2) — Dashboard baru & Pusat Notifikasi
**Dashboard** (`pages/Dashboard.jsx`, kini dipasang di route `/`; placeholder `DashboardPage.jsx` DIHAPUS):
- Kartu sapaan: nama depan + tanggal lengkap + ringkasan "N rapat hari ini", tombol Segarkan & Tugas Baru.
- 4 KPI card klik-able (→ /tasks): **Tugas Aktif** (Pending+Berjalan+Terlambat), **Terlambat** (angka merah `text-destructive`), **Menunggu Persetujuan** (item ditandai selesai PIC tapi belum disetujui pemilik), **Selesai**.
- **Tenggat Terdekat**: 6 tugas aktif bertenggat terdekat — badge sisa waktu (Lewat N hari / Hari ini / Besok / N hari lagi), prioritas, PIC, progress bar; footer "Lihat semua tugas".
- **Rapat Hari Ini** (jam, lokasi, jumlah peserta) + **Rapat Mendatang** (footer → Kalender).
- **Beban Kerja PIC**, **Aktivitas Terkini** (scroll, footer → Notifikasi), **Tren Mingguan** (recharts pakai token `--muted-foreground`/`--primary`), dan **Tugas Terbaru**.
- Backend `GET /api/dashboard/stats` ditambah field: `active_tasks`, `awaiting_approval`, `today_meetings`, `due_soon` (`routers/aggregate.py`).

**Pusat Notifikasi** (`pages/Notifications.jsx`): `DataTableCard` mode **SERVER** — pencarian (judul+isi, debounce 300ms), filter **Status** (Semua/Belum Dibaca/Sudah Dibaca) & **Jenis** (Tugas/Rapat/Pengingat/Info), paginasi server, deskripsi kartu menampilkan jumlah belum dibaca, tombol **Tandai Semua Dibaca** (disabled bila 0). Kolom: titik status, judul+pesan (tebal bila belum dibaca), jenis (badge+ikon), waktu, aksi (buka tautan → auto tandai dibaca, toggle dibaca/belum dibaca).
- Backend `routers/feeds.py`: `GET /api/notifications` sekarang menerima `status`, `type`, `q`, `page`, `page_size` dan mengembalikan `{items,total,unread,page,page_size}`; endpoint baru `PUT /api/notifications/{id}/unread`.
- Bug diperbaiki: stale closure pada aksi baris (kolom di-memo `[]`) membuat refetch memakai filter lama — kini refetch lewat state `tick` di `Notifications.jsx` dan `Reminders.jsx`.
- `design-guard.sh`: LEGACY tinggal `HelpTickets, Settings`. Guard exit 0.
- Verifikasi manual (Playwright): Dashboard render dengan KPI & 2 baris tenggat; Notifikasi — filter Belum Dibaca 3→2 setelah tandai dibaca, pencarian "Tugas" → 2 baris; Pengingat — filter Aktif 2→1 setelah ditandai selesai.

### Berikutnya
- P0: Tiket Bantuan (fitur baru, menu sudah ada), halaman `Settings.jsx` lama.
- P1: Ekspor Excel untuk datatable.
- P2: Overhaul alur autentikasi.

## Update (2026-08-06, lanjutan 3) — FD10: skala tipografi seimbang dengan compact + revisi UI Kelola Tugas
Feedback user: "banyak text dalam konten 16px, sangat jauh dari compact" + "form tambah/edit tugas ikuti layout sebelumnya".
- **Akar masalah**: `body` masih memakai base 16px browser; hanya tabel (`.tbl-density`) dan form (`.form-dense`) yang turun ke 13px, sehingga semua teks isi tanpa kelas ukuran tampil 16px.
- **FD10 (aturan baru di `FLOWDESK_EXCEPTIONS.md`)**: `body` = **14px / line-height 1.45** di `index.css`; tangga resmi → judul card & dialog 16px, teks isi 14px, tabel/form 13px, meta 12px. `DialogTitle` & `AlertDialogTitle` diturunkan `text-lg` → `text-base`. Guard #13 kini juga menolak `text-lg` di halaman fitur (sebelumnya hanya `text-xl`+). `Dashboard` KPI number `text-lg` → `text-base`.
- **Form Tugas** (`TaskForm.jsx`) dikembalikan ke layout lama: kiri = *Informasi Tugas* + *Item Tugas*, kanan = *Pemberi Tugas*, *PIC Pelaksana*, *Dokumen Sumber*; bar aksi Batal/Simpan sebagai `Card > CardFooter` di bawah grid.
- **Komponen lama dipadatkan** (dipakai di Tugas/Rapat/Time Schedule): `UserSelect` h-11→**h-8**, 14→13px, rounded-md, placeholder `ACTION.search`; `DocumentManager` → daftar `divide-y` padat 13px, badge Revisi/Final pakai token (bukan amber/emerald), dialog URL/Balasan/Pratinjau pakai `DialogBody`+`form-dense`, toast via `notify`; `AttachmentPanel` → baris padat 13px + `notify`; `RichTextEditor` → toolbar 28px, rounded-md, `bg-muted/40`.
- Verifikasi: audit `getComputedStyle` di Dashboard, Tugas, Rapat, Catatan, Kalender, Pengguna, Profil, Notifikasi, dan dialog → **tidak ada lagi teks ≥17px**; 16px hanya judul card/dialog. Guard exit 0. Login hero tetap besar (dikecualikan).

## Update (2026-08-06, lanjutan 4) — Redesign kartu "Item Tugas" (Detail Tugas)
Feedback user: daftar item terlihat berantakan (tiap item jadi kotak terpisah, input tanggal inline, teks italic "Menunggu PIC…").
- `TaskDetail.jsx`: kartu Item Tugas kini **satu kontainer `divide-y`** tanpa kotak per item; `CardContent` jadi `p-0`, baris `px-6 py-2` dengan hover `bg-muted/40`.
- Satu baris = `Checkbox` · judul (13px) + badge status (Disetujui / Menunggu persetujuan / Terlambat) · baris meta 12px berisi `Tenggat … · Dikerjakan … · Disetujui … · oleh …` atau "Menunggu PIC" (menggantikan teks italic) · cluster aksi kanan: **Setujui** (h-7, hanya saat menunggu persetujuan), ikon `RotateCcw` (batalkan persetujuan), pemicu `⌄` dengan jumlah dokumen + rotasi ikon, dan `Trash2` hapus item.
- Input **tenggat item dipindah ke panel Collapsible** (`bg-muted/30`, `border-t`) bersama Dokumen Item, Catatan Tugas, dan Lampiran Catatan — baris utama jadi bersih.
- Item terlambat ditandai `border-l-2 border-l-destructive` (bukan border penuh).
- Import `Separator`/`X` yang tak terpakai dibersihkan. Guard exit 0. Diverifikasi visual: baris rapat & sejajar, panel expand berfungsi.

## Update (2026-08-06, lanjutan 5) — Halaman Ubah Tugas dihapus, sunting inline di Detail (FD11)
Permintaan user: halaman Ubah mirip Detail dan malah kurang fungsi; gabungkan ke Detail. Form Tambah tetap ada.
- **Route `/tasks/:id/edit` DIHAPUS** (`App.js`) beserta breadcrumb-nya (`navigation.js`).
- Composite baru **`components/composite/EditableCard.jsx`**: kartu section dengan mode sunting bawaan — tombol `Pencil` 28px di header, render-prop `(editing) => ...`, footer Batal/Simpan otomatis, `onSave` boleh `return false` untuk menahan mode edit. Dicatat sebagai aturan **FD11**.
- **`TaskDetail.jsx` didesain ulang** (satu halaman baca+sunting):
  - Kartu ringkasan (`EditableCard` "head"): judul jadi judul kartu; mode baca = badge Status/Prioritas + "Tenggat …" + deskripsi + tautan rapat induk + progress bar; mode sunting = Judul + Deskripsi. Header memuat tombol Kembali + menu `⋯` (Duplikat · Jadikan Template · Cetak · Hapus — item "Ubah" dihapus).
  - Kartu **Item Tugas** (versi rapi `divide-y` dari iterasi sebelumnya) + penambah item di footer.
  - Kartu **Komentar**.
  - Sidebar: **Informasi Tugas** (`EditableCard`: Status, Prioritas, Tenggat; baca = baris `dt/dd` + badge, tambah "Dibuat oleh"), **Pemberi Tugas** (`EditableCard` + `UserSelect`, footer tombol Kirim broadcast), **PIC Pelaksana** (`EditableCard` + `UserSelect`), **Dokumen Sumber**, **Riwayat**.
  - Komponen `ContactList` & `InfoRow` internal supaya kartu orang/informasi konsisten.
- **`TaskForm.jsx` kini khusus buat baru** (`/tasks/new`): tanpa cabang edit/status, layout dua kolom tetap.
- **`Tasks.jsx`**: aksi baris jadi **Detail · Duplikat · Hapus**.
- Verifikasi manual: menu baris = ['Detail','Duplikat','Hapus']; menu Detail = ['Duplikat','Jadikan Template','Cetak','Hapus']; sunting inline Informasi Tugas (ubah tenggat → tersimpan & tampil 20 Agu, lalu data uji dikembalikan ke 15 Agu via API); mode sunting judul/deskripsi + Batal berfungsi. Guard exit 0.

## Update (2026-08-06, lanjutan 6) — E9: badge Status/Prioritas/Tenggat berwarna + polish Detail Tugas
Atas persetujuan user (boleh keluar dari monokrom untuk keterbacaan status):
- **Token hue baru** di `index.css` (light & dark): `--st-draft/-pending/-progress/-done/-overdue/-cancelled/-archived`, `--pr-urgent/-high/-medium/-low`, plus utilitas `.state-chip` (tint 12%, teks solid, border 32%) yang menerima hue via inline `--chip`. Tanpa hex & tanpa kelas warna Tailwind.
- `composite/TaskBadges.jsx` jadi sumber tunggal: `STATUS_META`/`PRIORITY_META` memakai field `chip`; `StatusBadge`/`PriorityBadge` render `.state-chip`.
- **Badge Tenggat** (Kelola Tugas + Dashboard) kini relatif & berwarna bertingkat: lewat/hari ini merah, besok–3 hari kuning, 4–7 hari biru, >7 hari hijau; tanggal asli di atribut `title`. Kolom tetap diurutkan pakai tanggal asli.
- Dicatat sebagai pengecualian **E9** di `FLOWDESK_EXCEPTIONS.md`.
- Polish Detail Tugas lain (permintaan user berurutan): tombol **Setujui** dikecilkan seukuran badge (h-6, `rounded-md`, `px-2.5 py-0.5`, tanpa ikon); **kartu Riwayat dihapus**; **tombol Kirim** di kartu Pemberi Tugas dihapus (fungsi `broadcast` ikut dibersihkan).
- Verifikasi visual light & dark mode: badge terbaca di kedua tema, guard exit 0.

## Update (2026-08-06, lanjutan 7) — FD12 (aksi footer kiri-kanan), aksi Detail Tugas, dialog hapus, fix jarak body
Permintaan user + hasil testing agent (`/app/test_reports/iteration_11.json`):
- **BUG jarak konten body kartu Dokumen Sumber**: input file tersembunyi adalah anak PERTAMA dari container `space-y-2`, sehingga daftar dokumen mendapat `margin-top` 8px ekstra → padding atas/bawah tidak simetris. Fix: input dipindah menjadi anak TERAKHIR (`DocumentManager.jsx`). **Diverifikasi testing agent: padding-top 16px = padding-bottom 16px, gap anak pertama/terakhir 16px : 16px** di `/tasks/:id` dan `/tasks/new`.
- **FD12 (aturan baru)**: dua tombol di `CardFooter`/`DialogFooter`/`AlertDialogFooter` → **kiri & kanan** (`justify-between`), sekunder kiri, utama kanan; satu tombol tetap kanan; judul di header, penjelasan di body, aksi di footer. Diterapkan: `TaskForm`, `MeetingForm`, `Database`, `EditableCard` (`justify-end` → `justify-between`). `DialogFooter`/`AlertDialogFooter` memang sudah `sm:justify-between`.
- **`ConfirmDeleteDialog`**: kalimat penjelasan dipindah dari header ke **body** (`div px-6 py-4`), header hanya judul.
- **Menu `⋯` Detail Tugas** kini hanya **Duplikat · Jadikan Template**; item Cetak & Hapus dihapus (hapus dilakukan dari daftar) — fungsi `remove`, state `deleteOpen`, dan `ConfirmDeleteDialog` di halaman detail ikut dibersihkan.
- Perbaikan dua temuan minor testing agent: (1) URL lama `/tasks/:id/edit` menampilkan halaman kosong → ditambahkan route catch-all `path="*"` → `Navigate to="/"`; (2) warning aksesibilitas `Missing Description for DialogContent` → `DialogDescription` ditambahkan pada dialog URL/Balasan/Pratinjau (DocumentManager), Jadikan Template, Catatan, dan Pengingat.
- Guard exit 0. Data uji milik user dikembalikan ke nilai semula oleh testing agent (tenggat 2026-08-15).

## Update (2026-06-08) — Ikon ceklis Setujui + audit FD10/FD12 halaman Member
- **Tombol "Setujui" item tugas → ikon ceklis** (`TaskDetail.jsx`): `Button` teks h-6 diganti `variant="ghost" size="icon" className="size-7"` berisi `<Check className="size-3.5" />` + `title`/`aria-label` "Setujui", sehingga posisi & ukurannya identik dengan ikon reset (`RotateCcw`) dan baris item tetap sejajar. `data-testid="item-approve-{itemId}"` dipertahankan. Diverifikasi: bounding box 28×28 px, ikon tampil pada item ber-status "Menunggu persetujuan".
- **Audit tipografi (FD10) & aturan footer (FD12)** untuk **Kelola Catatan, Ingatkan Saya, Time Schedule, Linimasa Time Schedule**: audit runtime `getComputedStyle` pada seluruh leaf node `main` → **tidak ada teks >14px** kecuali `CardTitle` 16px (sesuai aturan). Semua `DialogFooter` sudah berpola Batal (outline, kiri) → Simpan/aksi utama (kanan). **Tidak ada perubahan kode diperlukan** pada keempat halaman.
- **Modul Rapat**: `MeetingDetail.jsx` sudah dimigrasi (EditableCard, `MeetingBadges`/`StateChip`, footer FD12) dan dikonfirmasi "sudah rapih" oleh user. Item aksi rapat hanya memakai checkbox (tanpa aksi persetujuan), jadi tidak ada tombol Setujui di sana.
- `design-guard.sh` exit 0. Uji frontend via testing agent DITUNDA atas permintaan user (user menguji sendiri).

### Berikutnya
- P1: Tiket Bantuan (halaman masih placeholder, belum ada backend router).
- P1: Ekspor Excel untuk datatable (Log Aktivitas, Pengguna, Tugas, dll).
- P2: Overhaul alur autentikasi (ditunda sampai redesign tuntas).
- Hapus duplikasi info di Detail Tugas: baris badge Status/Prioritas/Tenggat pada kartu ringkasan dihapus (tetap ada di sidebar "Informasi Tugas"); kartu ringkasan kini hanya judul, deskripsi, tautan rapat induk, dan progres.

## Update (2026-06-08b) — FD13 ikon Batal/Tutup, Rapat tanpa Item Aksi, revisi Ingatkan Saya
- **FD13 (aturan baru, WAJIB)**: semua tombol sekunder `Batal`/`Tutup` kini memakai ikon `<X className="size-4" />`. Diterapkan di: `Notes`, `Reminders`, `TimeSchedule`, `TimeScheduleDetail` (3 dialog), `TaskDetail`, `TaskForm`, `MeetingDetail` (dialog convert + WA links), `MeetingForm`, `Tasks` (dialog Template Tugas), `DocumentManager` (2 dialog), `EditableCard`, `ConfirmDeleteDialog` (`AlertDialogCancel`). Dijaga `design-guard.sh` cek **#22**; dicatat di `docs/FLOWDESK_EXCEPTIONS.md`.
- **Detail Tugas**: badge "Disetujui" pada baris item dihapus (informasi sudah ada di baris meta "Disetujui <tgl> · oleh <nama>"). Badge "Menunggu persetujuan" & "Terlambat" tetap.
- **Detail Rapat**: kartu **Item Aksi** DIHAPUS beserta seluruh fungsi terkait (`actionItems`, `persistActions`, `addAction`, `toggleAction`, `removeAction`, `doConvert`), state `newAction`/`convert`/`convForm`, dan dialog "Buat Tugas dari Item Aksi". Import yang tak terpakai dibersihkan. Kartu **Tugas Turunan** tetap (menampilkan tugas yang sudah tertaut). Endpoint backend `/meetings/{id}/action-items/...` tidak dihapus (tidak dipanggil lagi dari UI).
- **Ingatkan Saya**:
  - Aksi baris kini bergaya Kelola Catatan: **Ubah · Tandai Selesai / Batalkan Selesai · Hapus** (`btn-edit-reminder-{id}`, `btn-toggle-reminder-{id}`, `btn-delete-reminder-{id}`). Kolom pertama jadi **indikator status non-interaktif** (ikon lingkaran/centang) agar tidak duplikat dengan aksi menu. Dialog kini dipakai untuk buat & ubah (`PUT /api/reminders/{id}`), judul "Ubah Pengingat" saat menyunting.
  - **Broadcast hanya Email**: tombol pilihan kanal WhatsApp dihapus, `channels` selalu `["email"]` saat broadcast aktif, kolom Broadcast hanya badge Email, deskripsi jadi "Kirim otomatis ke email Anda saat waktunya tiba." Kode WhatsApp di backend dibiarkan (tidak dipanggil) sampai integrasi WhatsApp API tersedia.
- Verifikasi manual (Playwright): kartu Item Aksi hilang di Detail Rapat; menu baris Pengingat = ['Ubah','Tandai Selesai','Hapus']; Ubah pengingat tersimpan (toast "Pengingat diperbarui", data uji dikembalikan ke judul semula via API); tidak ada tombol WhatsApp saat broadcast aktif; tombol Batal berikon di EditableCard & dialog. `design-guard.sh` exit 0.

## Update (2026-06-08c) — Toast "Berhasil", redesign Dashboard, kalender berwarna, lonceng hidup, fix tujuan email
- **FD7 diperbarui**: judul toast sukses `"Sukses"` → **"Berhasil"** (`lib/notify.js`); pesan guard #19 disesuaikan.
- **Dashboard di-redesign** (`pages/Dashboard.jsx`): kartu **Halo**, **Beban Kerja PIC**, **Aktivitas Terkini**, dan **Tugas Terbaru** DIHAPUS. Layout baru: (1) 4 KPI card — label "Menunggu Persetujuan" → **"Menunggu"**; (2) grid 3 kolom: **Tenggat Terdekat** (col-span-2, tombol Segarkan + Tugas Baru pindah ke header kartu ini) + kolom kanan **Rapat Hari Ini** & **Rapat Mendatang**; (3) **Tren Mingguan** full width.
  - **Tahan data banyak**: semua daftar memakai komponen internal `ListShell` → `CardContent p-0` + `divide-y` + area scroll `max-h-[26rem] thin-scroll` (baris padat `px-6 py-2`, 13px), plus badge jumlah di judul kartu. Backend `due_soon` dinaikkan dari 6 → **50** item (`routers/aggregate.py`).
- **Kalender berwarna (E9)**: token baru `--ev-meeting` (biru), `--ev-task` (oranye), `--ev-reminder` (ungu), `--ev-event` (hijau) di `index.css` (light + dark). `TYPE_META` di `Calendar.jsx` kini menyimpan hue; chip agenda di sel hari memakai `.state-chip` + inline `--chip`, dot legenda & ikon di dialog hari memakai warna jenisnya.
- **Lonceng notifikasi hidup** (`components/layout/NotificationsBell.jsx`): tersambung ke `GET /api/notifications?page_size=6`, **badge jumlah belum dibaca** (merah, "99+" bila >99), polling 60 detik + refetch saat popover dibuka, daftar 6 notifikasi terbaru (titik merah bila belum dibaca), klik item → `PUT /notifications/{id}/read` lalu navigasi ke `link`, tombol **Tandai dibaca** (`PUT /notifications/read-all`) dan **Lihat semua** → `/notifications`.
- **FIX tujuan email notifikasi**: `notifications.py:create_notification` sebelumnya memanggil `_send_email(...)` tanpa `to_override` sehingga jatuh ke `email.notify_email` (field "Email Penerima") — semua notifikasi tugas/pengingat masuk ke satu alamat. Sekarang email penerima diambil dari dokumen user (`db.users.find_one({"id": user_id})`) dan dikirim ke email pengguna terkait; bila user tak punya email, email dilewati. `notify_email` kini murni untuk **Kirim Uji/sistem** — label di Kelola Notifikasi diubah jadi "Email Penerima Uji / Sistem" + `FormDescription` penjelas.
- Verifikasi manual (Playwright): Dashboard baru render (kartu Halo/Beban Kerja/Aktivitas/Tugas Terbaru hilang, KPI "MENUNGGU"), toast login berjudul "Berhasil", lonceng menampilkan badge 2 & 6 item, kalender menampilkan chip biru/oranye/ungu + legenda berwarna. `design-guard.sh` exit 0. Catatan: pengiriman email nyata belum bisa diuji di preview (SMTP belum dikonfigurasi) — perbaikan bersifat kode.
- **Ingatkan Saya (koreksi aksi baris)**: item tengah menu bukan "Tandai Selesai" (fungsi itu tetap lewat ceklis di kolom pertama) melainkan **Sematkan / Lepas Sematan**, persis Kelola Catatan. Backend: field `pinned` ditambah ke `ReminderCreate`/`ReminderUpdate` dan urutan daftar jadi `pinned` desc lalu `remind_at` asc (`routers/reminders.py`). Frontend: ikon `Pin` di depan judul bila tersemat, `PUT /api/reminders/{id}` `{pinned}`, `DropdownMenuSeparator` sebelum Hapus (konsisten dengan halaman lain). Diverifikasi: menu = ['Ubah','Sematkan','Hapus'] → setelah disematkan ['Ubah','Lepas Sematan','Hapus'].

## Update (2026-06-08d) — Relevansi notifikasi + form Login
- **Notifikasi sudah per-pengguna**: `GET /api/notifications` memang difilter `user_id = pengguna` ATAU `user_id = null` (broadcast). Ditemukan **satu sumber notifikasi ke SEMUA orang**: `routers/tasks.py` broadcast tugas memanggil `create_notification(None, "Broadcast Tugas", ...)` → kini `create_notification(user["id"], ..., dispatch=False)` sehingga tanda terima hanya muncul bagi pelaku. 2 record `user_id: null` lama dihapus dari DB.
- **Hardening**: `PUT /notifications/{id}/read` & `/unread` kini hanya boleh mengubah notifikasi milik pengguna (`$or: [{user_id: me}, {user_id: null}]`) — sebelumnya bisa menandai notifikasi orang lain.
- Diverifikasi: `GET /api/notifications` admin → 3 item, semua ber-`user_id`; Pusat Notifikasi & lonceng menampilkan data yang sama.
- **Halaman Login**: form kini memakai `.form-dense` sehingga isi kolom **13px** (lebih kecil dari label **14px** — label diberi `text-sm`), dan tombol **Masuk dipindah ke `CardFooter`** (form membungkus `CardContent` + `CardFooter`, `Login.jsx` hanya merender `Card > CardHeader > LoginForm`).
- **`index.css`**: aturan `.form-dense label` → `.form-dense :where(label)` agar specificity tetap 1 kelas sehingga utilitas `text-sm` pada label bisa menimpanya (dibutuhkan Login; halaman dense lain tak berubah karena tidak memakai kelas ukuran pada label).
- Verifikasi: login admin sukses (toast "Berhasil"), label 14px vs input 13px, tombol berada di footer kartu. `design-guard.sh` exit 0.
- **Konten Login disesuaikan** (teks saja, atas instruksi user): deskripsi → "Silakan masuk menggunakan akun Anda dengan email, username atau nomor hp dan kata sandi yang telah terdaftar."; label field pertama → **"Kredensial"**; placeholder → "Email, Username atau Nomor HP"; placeholder sandi → titik-titik. Validasi zod field pertama dilonggarkan dari `.email()` menjadi wajib-isi ("Kredensial wajib diisi.") agar tidak bentrok dengan placeholder. **CATATAN PENTING: backend masih hanya menerima EMAIL** — login via username/nomor HP belum berfungsi (menunggu keputusan user; opsi menambah field `username` + pencarian akun email/username/phone sudah ditawarkan dan ditunda).
- **Dashboard — presisi baris Tenggat Terdekat**: cluster kanan dipecah menjadi slot lebar tetap agar semua baris sejajar sempurna — progres+% `w-24` (bar `flex-1` + angka `w-8`), prioritas `w-20` (justify-end), badge tenggat `w-[6.5rem]` + `whitespace-nowrap` (mencegah teks "Lewat 62 hari" turun 2 baris). Diverifikasi: posisi X ketiga progress bar identik (815px), tinggi baris seragam ~51px.
- Grid utama Dashboard diberi `items-start` supaya kartu tidak melar mengikuti kolom tetangga — `CardFooter` ("Lihat semua tugas") kini menempel di bawah kartu, tanpa ruang kosong.

## Update (2026-06-08e) — Kelola Aplikasi mengikuti referensi + endpoint OG
- **`pages/AppSettings.jsx` ditulis ulang** menjadi 5 section card, **Simpan per section** (footer kartu masing-masing):
  1. **Identitas Aplikasi** — Nama Aplikasi, Tagline/Sub Judul, Inisial Brand, kartu pratinjau brand (kotak inisial + nama + tagline, live dari `watch()`), Perusahaan, Zona Waktu, Bahasa, Format Tanggal, URL Aplikasi. **Satu grid `lg:grid-cols-4`** untuk semua field (sebelumnya 2 grid 4-kolom & 3-kolom sehingga jarak antar kolom tidak sejajar — diverifikasi kini semua kolom x/width identik: 305/621/936/1252, w300).
  2. **Aset Merek** — Logo (latar terang), Logo (latar gelap/`logo_dark` baru), Favicon, Thumbnail, Warna Merek + Alert "aset disimpan di database, ikut Backup & Restore".
  3. **SEO & Metadata** — Meta Description, Meta Keywords, Canonical URL, switch **Terlihat di mesin pencari** (`search_visible`).
  4. **Pratinjau Tautan (Open Graph)** — OG Title, OG Description, OG Image + kartu simulasi pratinjau (gambar aspect 1200/630, domain, judul, deskripsi) + tombol **Lihat HTML mentah** (dialog `<pre>`).
  5. **Kontak & Footer** — Email Dukungan, Teks Hak Cipta/Footer.
- **Backend**: `DEFAULT_SETTINGS.general` menambah `tagline, brand_initials, logo_dark, meta_keywords, canonical_url, search_visible, og_title, og_description, og_image, support_email, footer_text`; `/settings/public` mengekspos tagline/brand_initials/logo_dark/support_email/footer_text.
- **Router baru `routers/og.py`** (didaftarkan di `server.py`):
  - `GET /api/og/render` → HTML dengan meta OG/Twitter/canonical/robots (tanpa auth, untuk crawler WhatsApp/Telegram/FB/X). `robots` = `index, follow` bila `search_visible` aktif, jika tidak `noindex, nofollow`. Fallback: og_title→app_name, og_description→meta_description, og_image→thumbnail, canonical_url→app_url.
  - `GET /api/og/preview` → data pratinjau + `html` mentah untuk UI.
- **`lib/validation/adminSchema.js`**: skema baru `seoSchema`, `ogSchema`, `contactSchema`; `identitySchema` + tagline/brand_initials; `brandingSchema` + logo_dark.
- Verifikasi: simpan Identitas & Pratinjau Tautan sukses (toast "Berhasil"), dialog HTML mentah menampilkan meta OG hasil server, `curl /api/og/render` 200. `design-guard.sh` exit 0.

## Update (2026-06-08f) — Menu "Kelola Keamanan" + Menu Admin urut abjad
- **Menu Admin diurutkan abjad** (di `components/Layout.jsx` DAN `config/navigation.js`): Kelola Aplikasi → Kelola Arsip → Kelola Database → **Kelola Keamanan** → Kelola Notifikasi → Kelola Pengguna → Kelola Peranan → Log Aktivitas. Breadcrumb `ROUTE_TRAILS` + `ADMIN_ROUTES` ditambah `/security-settings`.
- **Halaman baru `pages/SecuritySettings.jsx`** (route `/security-settings`, ikon `KeyRound`), 2 kartu dengan Simpan per kartu:
  1. **Autentikasi Terpusat (Authty)** — badge Aktif/Nonaktif, switch "Aktifkan autentikasi terpusat" & "Izinkan Super Admin lokal sebagai jalur darurat", Base URL, Timeout (detik), API Key (X-API-Key) dengan toggle mata + placeholder hint "Tersimpan: ••••xxxx", blok "Uji kredensial (tanpa membuat sesi)" (identitas + password + tombol Uji).
     **MOCKED/BELUM TERSAMBUNG:** tombol **Uji** disabled dan login terpusat belum diimplementasikan — kontrak API Authty & API Key belum diberikan user. Alert di dalam kartu menyatakan ini secara eksplisit. Setelan tetap tersimpan agar siap dipakai saat integrasi disambungkan.
  2. **Sesi Login** — Masa aktif sesi login (jam, 1–720). **FUNGSIONAL**: `create_token(..., hours=)` di `security.py` + `routers/auth.py` membaca `security.session_hours` dari settings saat login. Diverifikasi: exp token = 12.0 jam sesuai setelan, tanpa restart server.
- **Backend settings**: section baru `security` = `{authty_enabled, authty_allow_local_superadmin, authty_base_url, authty_timeout, authty_api_key, session_hours}`. `GET /api/settings` **tidak pernah** mengembalikan `authty_api_key` (selalu `""`) melainkan `authty_api_key_hint` (12 bullet + 4 karakter terakhir); `PUT /api/settings` mengabaikan `authty_api_key` kosong agar kunci tersimpan tidak terhapus, dan membuang `authty_api_key_hint`.
- Verifikasi: simpan kedua kartu sukses (toast "Berhasil"), urutan menu sidebar sesuai abjad, `design-guard.sh` exit 0.
- **PENDING dari user**: dokumentasi endpoint verifikasi Authty (path/method/request/response), nama field jabatan + pemetaan ke peran, dan API Key.

## Update (2026-06-08g) — Hierarki jabatan (peran) + penugasan & pemantauan berbasis garis komando
Sumber: Excel `roles_20260806212246.xlsx` (sheet `Roles`, kolom `ID, Name, Parent, Parent ID`, 46 baris) → satu pohon berakar **Dewan Komisaris → Direktur Utama → (Direktur Bisnis / Direktur Kepatuhan / Kabag Audit Intern / Kabag SDM dan Umum / Kabag Teknologi Informasi) → Kabag → Kasi → Staff**, plus 2 peran sistem (`Super Admin`, `Guest`).

**Keputusan user**: PIC = semua turunan di cabang sendiri; monitoring = diri sendiri + seluruh subtree (lintas cabang tidak terlihat); izin diatur **per Level** dan diwarisi jabatan; peran lama (`manager`, `member`) dibiarkan sampai pengguna dipindahkan.

### Backend
- `roles` doc kini: `{id, name(slug), label, parent_id, level, order, permissions[], is_system}`. `GET /api/roles` mengembalikan urutan hierarkis + `depth` + `parent_label`, dan menebak `level` bila kosong.
- `helpers.py` baru: `ROLE_LEVELS` (Komisaris, Dirut, Direksi, Kabag, Kasi, Staff), `guess_role_level()`, `sees_all()`, `role_subtree_names()`, `scope_user_ids()`, `subordinate_users()`, `task_scope_query()`, `meeting_scope_query()`, `schedule_scope_query()`. **`is_privileged()` (admin+manager lihat semua) TIDAK lagi dipakai untuk visibilitas** — diganti scope subtree; admin/izin `*` tetap lihat semua.
- Call sites diperbarui: `routers/tasks.py` (list + `_in_scope()` untuk detail & duplikat), `routers/meetings.py` (`_meeting_visibility`/`_can_see_meeting` jadi async), `routers/time_schedule.py` (`_vis`/`_can_view` async), `routers/aggregate.py` (dashboard, kalender, pencarian global).
- Endpoint baru: `GET /api/users/subordinates` (kandidat PIC = turunan tanpa diri sendiri; admin dapat semua), `GET/PUT /api/role-levels` (izin per level, disimpan di `settings.role_levels`), `POST /api/roles/import` (xlsx/csv: `Name`, `Parent`/`Parent ID`, `Level`, `Order`; membuat/memperbarui + menautkan atasan; `super_admin` otomatis izin `*`, `super_admin`/`guest`/`admin` ditandai `is_system` dan tak bisa dihapus).
- `routers/auth.py::_with_perms` — izin efektif: izin jabatan bila ada, kalau kosong **mewarisi izin level**; `*` tetap dipendekkan jadi `["*"]`.

### Frontend
- `pages/Roles.jsx` ditulis ulang: kartu **Hierarki Jabatan** (tabel indentasi sesuai `depth`, kolom Atasan Langsung/Level/Urutan/Izin, badge "Warisan {Level}" bila izin kosong, tombol **Impor** xlsx/csv & **Ekspor** CSV, area scroll `max-h-[34rem]`) + kartu **Izin per Level Jabatan** (matriks Level × izin dengan Switch, satu tombol Simpan). Matriks per-peran lama dihapus (49 kolom tidak terpakai). Dialog jabatan: Nama, Atasan Langsung, Urutan, Level, Izin Khusus (kosong = warisi level).
- `TaskForm.jsx` & `TaskDetail.jsx`: PIC memakai `GET /users/subordinates` (state `picUsers`); Pemberi Tugas tetap dari daftar semua pengguna.

### Verifikasi (curl + Playwright)
- Impor Excel: `{created: 46, updated: 0, linked: 43, total: 46}` → total 49 peran, pohon & level benar.
- Kabag Kredit: `subordinates` = [Uji Staff Legal]; Staff Analis (cabang lain) = []; izin efektif diwarisi level Kabag.
- Tugas dibuat Kabag Kredit untuk Staff Legal: Kabag Kredit list 1/terlihat detail 200 · Staff Legal 1/200 · **Staff Analis 0/403** · Admin 4/200.
- UI: dropdown PIC untuk Kabag Kredit hanya menampilkan Uji Staff Legal. `design-guard.sh` exit 0.
- Akun uji dicatat di `/app/memory/test_credentials.md`.

### Catatan / sisa pekerjaan
- Peran `manager`/`member`/`Anggota` masih ada (level ditebak "Staff") — pengguna lama perlu dipindahkan ke jabatan baru lewat Kelola Pengguna.
- `Guest` belum punya izin apa pun.
- Kelola Pengguna belum menampilkan dropdown jabatan hierarkis (masih daftar datar) — kandidat perbaikan berikutnya.
- Integrasi Authty tetap DITUNDA sesuai permintaan user.

## Update (2026-06-08h) — Integrasi SSO Authty Secure Identity (AKTIF)
Sumber: `AUTHTY_API.md` + `AUTHTY_INTEGRATION_GUIDE.md` dari user. Pola: **verifikasi kredensial eksternal → JWT lokal → JIT provisioning** (Authty bukan OAuth/OIDC dan tidak mengembalikan token).

### Cakupan (sesuai arahan user: SSO + data pengguna & jabatan saja)
- ✅ `POST {base}/api/user-auth` (login) & `POST {base}/api/user-password` (ganti sandi sendiri)
- ❌ TIDAK diambil/disimpan: `office`, `office_code`, `mso_code`, `collector_code`, payload `device`/geofence
- ❌ TIDAK dibuat: panel proxy kelola pengguna Authty (`user-create/update/deactivate`)

### Berkas baru
- `backend/crypto.py` — Fernet, prefix `enc:v1:` (idempoten), `mask()`. Env baru **`APP_ENCRYPTION_KEY`** di `backend/.env`.
- `backend/authty.py` — `get_config(reveal)`, `enabled()`, `_call()` (httpx timeout dari setelan, penerjemahan galat seragam: 401 pesan Authty · 503 unreachable · 502 skema tak dikenal), `verify_credentials()`, `change_password()`, `resolve_role_name()` (label case-insensitive → slug → fallback `guest`, `ensure_guest_role()`), `upsert_user()` (kunci email lowercase, fallback `<username>@authty.local`), `role_summary()` (untuk tombol Uji).
- `backend/routers/authty.py` — `GET /api/authty/status`, `POST /api/authty/test` (verifikasi + sinkron + tampilkan pemetaan, **tanpa** membuat sesi), keduanya `require_admin`.
- `frontend/src/pages/NoAccess.jsx` — halaman "Akses belum dikonfigurasi".

### Perubahan
- `routers/settings.py`: `authty_api_key` dienkripsi saat PUT, `authty_base_url` di-trim/rstrip; GET mengembalikan `authty_api_key: ""` + `authty_api_key_hint` hasil `crypto.mask()`; PUT dengan api key kosong tidak menghapus kunci.
- `routers/auth.py`: `LoginBody.email` kini `str` (bukan `EmailStr`) agar bisa username/no. HP; `_client_ip()` memakai `X-Forwarded-For`; cabang Authty di `POST /api/auth/login` — sukses → `upsert_user` + log `Sinkron Authty`, `is_active=false` → **403**, gagal → jalur darurat **hanya admin/izin `*` lokal**, jika tidak → 401/503; lockout brute-force tetap, reset memakai identitas input **dan** email hasil resolve. Authty nonaktif → auth lokal penuh.
- `routers/profile.py` `PUT /api/profile/password`: akun `auth_source=authty` → diteruskan ke Authty dulu (400 bila ditolak, 503 bila unreachable, tanpa perubahan lokal), sukses → upsert + hash lokal disinkronkan (agar jalur darurat memakai sandi terbaru).
- `config/navigation.js`: item Member Area kini punya `perm` (calendar/task/meeting/time_schedule/note/reminder); `getAreas(isAdmin, can)` & `getArea(areaId, isAdmin, can)` memfilter berdasarkan izin. `AppSidebar` meneruskan `hasPerm`. `AppLayout` menampilkan `NoAccess` bila pengguna non-admin tidak punya izin sama sekali.
- `pages/SecuritySettings.jsx`: tombol **Uji** kini fungsional (`POST /api/authty/test`) dan menampilkan nama/email/username, status aktif, serta pemetaan "Jabatan Authty → peranan (n izin, warisan level X)". Alert "belum tersambung" diganti penjelasan cakupan.

### Hasil uji (skenario §11 dokumen)
| Skenario | Hasil |
|---|---|
| Konfigurasi + api key tersamar & tidak hilang saat PUT lain | ✅ `••••••••••••e301`, `api_key_set: true` |
| `POST /authty/test` | ✅ Zulfadli Rizal · `Kabag Teknologi Informasi` → peranan `kabag_teknologi_informasi` (7 izin, warisan level Kabag) |
| Login via **email** | ✅ 200, peran & izin hasil pemetaan |
| Login via **username** (`309011221`) | ✅ 200 (UI: menu terfilter 6 menu sesuai izin) |
| Password salah | ✅ 401 `The credentials you entered are incorrect` (pesan Authty diteruskan) |
| Authty tidak dapat dihubungi (base_url ngawur) | ✅ 503 "Layanan autentikasi terpusat tidak dapat dihubungi" |
| Jalur darurat Super Admin lokal saat Authty mati | ✅ `admin@flowdesk.com` tetap 200 |
| Pengguna lokal non-admin saat Authty aktif | ✅ ditolak (sentralisasi terjaga) |
| Toggle `enabled` = off → auth lokal penuh | ✅ pengguna lokal 200 kembali |
| Jabatan tak dikenal → `guest` + halaman NoAccess | ⚠️ **belum diuji** (tidak ada akun Authty dengan jabatan di luar 46 daftar) |
| 2FA | tidak berlaku — FlowDesk belum punya 2FA |

### Catatan penting
- **Authty kini AKTIF.** Akun uji lokal (`kabag.kredit@`, `staff.legal@`, `staff.analis@`) hanya bisa masuk bila toggle Authty dimatikan; `admin@flowdesk.com` tetap bisa lewat jalur darurat.
- Akun lokal lama dengan email `zulfadlirizal@gmail.com` ikut disinkronkan Authty, sehingga perannya kini `kabag_teknologi_informasi` (Authty = sumber kebenaran identitas & jabatan).
- API key Authty tersimpan terenkripsi di `settings.security.authty_api_key`; `APP_ENCRYPTION_KEY` ada di `backend/.env` — **jangan hilangkan**, kalau berubah kunci lama tidak bisa didekripsi dan harus diisi ulang lewat UI.

## Update (2026-06-08i) — Peran lama dihapus: hanya Super Admin + Guest + 46 jabatan hierarki
- **Dihapus**: `admin` (Administrator), `manager` (Manajer), `member` (Anggota). Tidak dipakai lagi karena struktur memakai hierarki jabatan; administrator = **Super Admin**.
- **Peran sistem yang tersisa**: `super_admin` (Super Admin, izin `*`, level Dirut) dan `guest` (Guest, tanpa izin) — keduanya `is_system` dan tidak bisa dihapus. Total peran kini **46**.
- **Definisi administrator dipusatkan**: backend `helpers.is_admin()` = `role == "super_admin"` ATAU izin `*`; `is_privileged()` = `is_admin()` (aturan lama "Manajer lihat semua" hilang total); `security.require_admin` menolak selain Super Admin/izin `*`; `routers/settings.py` guard ikut disesuaikan. Frontend: `lib/perms.js` menambah **`isAdminUser(user)`** dan dipakai `AppSidebar`, `AppLayout`, `Layout`, `Users`, `Settings` (tidak ada lagi perbandingan `role === "admin"` di UI).
- **Default peran pengguna baru** (POST /users, impor pengguna, form Kelola Pengguna, registrasi non-pertama) kini **`guest`**; pengguna pertama saat registrasi → `super_admin`. Seeder (`seed.py`, `server.py`) membuat akun admin dengan role `super_admin`.
- **Authty**: jabatan yang tidak dikenal tetap jatuh ke **`guest`** (`authty.resolve_role_name()` + `ensure_guest_role()`), dan pengguna tanpa izin melihat halaman "Akses belum dikonfigurasi".
- **Migrasi DB dijalankan**: pengguna `admin` → `super_admin` (1 akun), `manager`/`member` → `guest` (0 akun, sudah kosong), anak-peran yang menunjuk peran lama dilepas (`parent_id: null`), lalu 3 peran lama dihapus.
- Verifikasi: `admin@flowdesk.com` → role `super_admin` izin `['*']`, Menu Admin lengkap tampil; daftar peran 46 tanpa admin/manager/member; pengguna Authty (Kabag TI) ditolak **403** pada `PUT /api/settings`, `GET /api/authty/status`, `PUT /api/role-levels`; halaman Kelola Peranan menampilkan pohon 46 jabatan + Super Admin/Guest. `design-guard.sh` exit 0.
- **Catatan**: user menghapus sendiri seluruh data demo & akun uji lokal pada 2026-06-08 22:05–22:06 (terlihat di Log Aktivitas) — sisa pengguna: `admin@flowdesk.com` (Super Admin) dan `zulfadlirizal@gmail.com` (Authty, Kabag Teknologi Informasi).

## Update (2026-06-08j) — Izin menu per Level jabatan diatur
- **Izin baru `help_ticket` (Tiket Bantuan)** ditambah ke `PERMISSION_CATALOG`; menu Tiket Bantuan di `config/navigation.js` sekarang ikut ter-gate (`perm: "help_ticket"`) — sebelumnya tampil untuk semua orang tanpa kecuali.
- **Izin bawaan per level disimpan** (`PUT /api/role-levels`):
  - Komisaris / Dirut / Direksi / **Kabag** → Kalender, Kelola Tugas, Kelola Rapat, Time Schedule, Kelola Catatan, Ingatkan Saya, Tiket Bantuan, **Laporan & Ekspor** (8 izin)
  - **Kasi / Staff** → sama tanpa Laporan & Ekspor (7 izin)
  - Izin area admin (`user`, `role`, `database`, `notification_config`, `app_config`, `activity`) sengaja TIDAK diberikan lewat level — area Admin hanya untuk Super Admin.
- **Tombol "Terapkan Bawaan"** (`btn-recommended-levels`) di footer kartu Izin per Level: mengisi matriks dengan rekomendasi di atas (konstanta `RECOMMENDED_LEVEL_PERMS` di `pages/Roles.jsx`), lalu user menekan Simpan.
- Verifikasi: `GET /api/auth/me` untuk akun SSO (`kabag_teknologi_informasi`) mengembalikan 8 izin hasil warisan level Kabag; UI menampilkan tepat **8 menu** (Dashboard, Kalender, Kelola Tugas, Kelola Rapat, Tiket Bantuan, Time Schedule, Kelola Catatan, Ingatkan Saya) — Laporan belum punya halaman/menu tersendiri. `design-guard.sh` exit 0.

## Update (2026-06-08k) — Time Schedule: aksi "Buat Tugas" dihapus, ikon Simpan, ekspor Excel = kartu Linimasa
- **Aksi "Buat Tugas" pada baris kegiatan DIHAPUS** beserta fungsi terkait: dialog "Buat Tugas dari Kegiatan", handler `doConvert`, state `convert`/`convForm`, wiring `onConvert`, dan import yang jadi tak terpakai (`ClipboardCheck`, `PRIORITY_META`, `PRIORITIES`). Aksi baris kini hanya **Ubah · Hapus** (+ "Buka Tugas" bila kegiatan sudah pernah tertaut ke tugas). Endpoint backend `POST /{sid}/activities/{aid}/convert-task` dibiarkan (tidak dipanggil UI).
- **Ikon Simpan (FD5)** ditambahkan pada tombol Simpan yang belum berikon di dialog halaman detail: `btn-save-activity` & `btn-save-meta` (TimeScheduleDetail), `btn-confirm-template` (TaskDetail), dan tombol Simpan dialog jabatan (Roles, sekaligus label "Menyimpan…" saat proses). Import `Save` ditambahkan ke `TimeScheduleDetail.jsx` & `TaskDetail.jsx` (sebelumnya menyebabkan halaman detail Time Schedule crash "Terjadi kesalahan" — sudah diperbaiki dan diverifikasi).
- **Ekspor Excel Time Schedule dirombak agar identik kartu Linimasa** (`routers/time_schedule.py`):
  - Baris 1 judul, baris 2 nama event; **baris 4 = header bulan yang di-merge per bulan** ("Agu 2026", "Sep 2026"), **baris 5 = angka hari**; sel `A4:A5` = **KEGIATAN**, `B4:B5` = **PIC** (di-merge vertikal).
  - Kolom A nama kegiatan (bold) + kolom B nama PIC / "Tanpa PIC"; bar memakai **warna kegiatan** (`color`) atau warna kategori monokrom (`pelaksanaan #5B5B5B`, `event #1F1F1F`, `libur #B8B8B8`) — sebelumnya kuning/hijau/merah yang tidak cocok dengan UI.
  - Akhir pekan & hari libur diwarnai abu muda, hari event abu sedang, hari ini bergaris tebal kiri; `freeze_panes` di `C6`; lebar kolom A 34 / B 22 / hari 3.6; nama sheet "Linimasa".
  - Sumber hari event diperbaiki dari `s["events"]` (tidak ada) → `s["event_dates"]`.
- Verifikasi: `GET /api/time-schedules/{id}/export` 200; workbook berisi merge `C4:AA4`, `AB4:AF4`, `A4:A5`, `B4:B5`, baris hari 7,8,9…, dan bar oranye `F59E0B` tepat pada 7–10 Agu (sama seperti kartu). UI: menu baris kegiatan = ['Ubah','Hapus'], tombol Simpan kegiatan berikon. `design-guard.sh` exit 0.
- **Linimasa lebih berwarna (E9)**: token baru di `index.css` (light + dark) `--ts-plan` (amber), `--ts-event` (hijau), `--ts-holiday` (rose), `--ts-holiday-col` (rose sangat muda). Kartu Linimasa: kolom **akhir pekan & hari libur** kini berlatar rose muda dengan **angka tanggal merah & bold** (bukan abu), bar kategori memakai amber/hijau/rose (warna per-kegiatan tetap menimpa), titik kategori di tabel & legenda ikut berwarna, label legenda "Libur / akhir pekan" → **"Kolom Hari Libur"**. Ekspor Excel disamakan: `CAT_FILL` amber `F0A21B` / hijau `10B27A` / rose `E8546F`, kolom libur `FEF1F2` + font `D33A57` bold. Diverifikasi: header hari 8–9 & 15–16 Agu berlatar `FEF1F2` font `D33A57`, hari kerja tetap `F3F4F6`.
- **Legenda Linimasa disederhanakan**: chip kategori (Pelaksanaan/Event/Hari Libur) DIHAPUS karena tiap kegiatan sudah bisa mengatur warnanya sendiri. Legenda kini hanya **Kolom Hari Libur** (rose), **Hari Event** (hijau), **Hari ini**. Kolom hari event kini berlatar **hijau** (`--ts-event-col`, light + dark) dengan angka tanggal hijau bold — lebih mencolok daripada abu `bg-accent` sebelumnya. Ekspor Excel disamakan: hari event `DCF7E9` + font `0E8A5F` bold, prioritas warna sel: event → libur → hari kerja.

## Update (2026-06-08l) — BUG FIX: progres Time Schedule dihitung dari kegiatan selesai
- **Masalah**: kolom **Progres per kegiatan** di Daftar Kegiatan memakai `autoProgress()` (100% begitu status "Selesai" ATAU tanggal akhir terlampaui), sehingga jadwal terlihat 100% padahal baru 1 dari beberapa kegiatan selesai.
- **Perbaikan** (`pages/TimeScheduleDetail.jsx`): fungsi `autoProgress()` dan kolom `id: "progress"` **DIHAPUS**. Progres kini dihitung **satu kali di tingkat jadwal**, konsep sama seperti Tugas: `kegiatan status "Selesai" / total kegiatan`, ditampilkan di header kartu **Linimasa** (`data-testid="schedule-progress"`) sebagai bar + teks `"<persen>% · <selesai>/<total> kegiatan selesai"`.
- **Diverifikasi testing agent** — `/app/test_reports/iteration_12.json`, frontend 100%, tanpa issue: kolom Progres hilang (kolom kini Kegiatan, Kategori, PIC, Periode, Status, Aksi), tidak ada `activity-progress-*`, 1 dari 2 kegiatan Selesai → tepat `50% · 1/2 kegiatan selesai` (tidak lompat 100%), dikembalikan ke Proses → `0% · 0/2`, menu baris tetap hanya Ubah/Hapus, gantt tetap render, tanpa console error.
- Catatan testid dari testing agent: wrapper datatable = `activities`, elemen tabel = `activities-table`; aksi baris `activity-actions-{id}` / `btn-edit-activity-{id}` / `btn-delete-activity-{id}`; select status dialog = `activity-status-select`.

## Update (2026-06-08f) — Modul Tiket Bantuan SELESAI (backend + frontend)
Permintaan user: modul tiket bantuan (judul, deskripsi, kategori, prioritas, lampiran multi, ditujukan, komentar saling membalas, status oleh penerima) + **visibilitas monitoring berjenjang**.
- **Backend** `routers/help_tickets.py` kini **terdaftar** di `server.py`. Nomor tiket otomatis `TKT-YYYYMM-NNNN`. Status: Baru → Ditugaskan → Diproses → Menunggu Info → Selesai → Ditutup. Izin `help_ticket` sudah ada di katalog permission.
- **Aturan hierarki (baru)**: tiket terlihat oleh **pelapor, penerima, dan seluruh jabatan DI ATAS keduanya** (via `scope_user_ids`, OR pada `created_by`/`assignee.user_id`). **Status** hanya boleh diubah penerima (atau Super Admin). **Tujuan tiket** boleh dipindahkan oleh pelapor, Super Admin, atau **atasan penerima** — dan bila bukan pelapor, hanya boleh dialihkan ke pegawai **di bawah jabatannya** (`_can_reassign` + `_sub_ids`). Respons detail/update mengirim `can_handle`, `can_reassign`, `can_edit`.
- **Frontend**: `pages/HelpTickets.jsx` (DataTableCard: No. Tiket/Judul/Kategori/Prioritas/Pelapor/Ditujukan/Status/Diperbarui; filter Lingkup(Semua/Tiket Saya/Ditujukan ke Saya)+Status+Kategori; dialog "Tiket Bantuan Baru" dengan lampiran multi via `DocumentManager`), `pages/HelpTicketDetail.jsx` (EditableCard: ringkasan, Penanganan(status+catatan penyelesaian), Ditujukan(UserSelect — kandidat = semua pengguna bila pelapor, hanya bawahan bila atasan), Informasi Tiket, kartu Komentar 2 arah, kartu Lampiran). `components/composite/TicketBadges.jsx` (status chip E9). Rute `/help-tickets/:id` + breadcrumb.
- `design-guard.sh`: LEGACY tinggal `Settings`. Guard exit 0.
- **Verifikasi**: hierarki via `backend/scripts/verify_ticket_hierarchy.py` (13 skenario lolos: atasan pelapor & atasan penerima melihat, staf lain 403, reassign atasan penerima 200 / atasan pelapor 403, status pelapor 403, komentar 2 arah). UI via testing agent `iteration_14.json` → **frontend 100%, 0 isu**. Data uji (5 peran + 5 user `@flowdesk.test`) sudah dihapus kembali dari DB.

### Berikutnya
- P1: Login via **username / nomor HP** (backend masih hanya email).
- P1: Ekspor Excel untuk datatable lain (Log Aktivitas, Pengguna, Tugas).
- P1: Integrasi WhatsApp API untuk broadcast pengingat (kini via email).
- P2: Migrasi halaman `Settings.jsx` lama; PDF export siap cetak.

## Update (2026-06-08g) — Sinkronisasi dokumentasi sebelum push GitHub
- **README.md** diperbarui: intro menyebut Time Schedule & Tiket Bantuan; **Fitur Utama** menambah bagian **Tiket Bantuan** (nomor otomatis, lampiran multi, komentar, status, pemantauan berjenjang, reassign oleh atasan penerima), item Admin menambah **Kelola Keamanan (SSO Authty)** + Kelola Aplikasi (SEO/Open Graph) + Kelola Peranan (hierarki jabatan & izin per level); Kelola Tugas tidak lagi menyebut Kanban/PDF (sudah dihapus saat redesign).
- **Arsitektur & Teknologi**: tambah `cryptography` (enkripsi API key SSO); frontend jadi "Shadcn UI design system compact monokrom, font Geist, TanStack Table" (Poppins/jsPDF dihapus).
- **Struktur Proyek**: tambah `authty.py`, `crypto.py`, folder `scripts/`, dan router `help_tickets, og, authty`.
- **Model Hak Akses** ditulis ulang sesuai kondisi nyata: peran admin/manager/member dihapus → **Super Admin**; hierarki jabatan (subtree) + izin menu per level; aturan Tiket Bantuan; catatan & pengingat privat; rapat pribadi per peserta; SSO Authty. Akun default kini `role: super_admin`.
- **requirements.txt**: TIDAK ada modul Python baru pada modul Tiket Bantuan (hanya memakai dependensi yang sudah ada). Semua paket di requirements.txt diverifikasi terpasang — `pywebpush`, `py-vapid`, `http_ece` sebelumnya hilang di pod ini dan sudah dipasang ulang sesuai versi pin (backend restart OK, `GET /api/` 200). Tidak ada perubahan isi requirements.txt.

## Update (2026-06-08h) — Pembersihan berkas mati (pra-push GitHub)
Audit seluruh repo (impor silang untuk frontend, daftar router untuk backend). Dihapus:
- **Frontend (sisa desain lama, 0 referensi)**: `pages/Settings.jsx`, `components/common.jsx`, `components/Layout.jsx`, `context/ThemeContext.jsx`, `components/Modal.jsx`, `components/ConfirmDialog.jsx`, `components/ImageUpload.jsx`.
- **Root/artefak uji**: `backend_test.py`, `debug_result_docs.py`, `.screenshots/`, `.ruff_cache/`, `tests/` (kosong), `backend/tests/` (uji lama yang sudah tidak valid karena peran admin/manager/member dihapus).
- **DIPERTAHANKAN**: `components/ui/*` (primitive shadcn, pustaka design system), `composite/{DatePicker,Combobox,sortable-table}.jsx` (SSOT guideline), `test_reports/`, `memory/`, `frontend/docs/`, `deploy/local/`, `design_guidelines.json`, `test_result.md`.
- `design-guard.sh`: daftar `LEGACY` kini **kosong** (pola `__NO_LEGACY__`) → guard mengawasi SELURUH kode fitur; exit 0. `docs/FLOWDESK_EXCEPTIONS.md`: E5 diperbarui + status migrasi Fase 5 & 5b ditandai selesai.
- Verifikasi pasca-hapus: tidak ada referensi tersisa (grep bersih), frontend restart & compile sukses (`localhost:3000` 200), halaman Profil + Tiket Bantuan render normal.
- **Ubah Kata Sandi ↔ Authty (hasil pemeriksaan)**: `PUT /api/profile/password` SUDAH terhubung — user `auth_source: "authty"` + SSO aktif → panggil Authty `POST /api/user-password`, sinkron `upsert_user`, hash lokal diperbarui; gagal → 400 (pesan Authty) / 503 (server tak terjangkau, sandi lokal tidak diubah). Akun lokal tetap jalur bcrypt. Catatan: UI belum memberi keterangan bahwa akun SSO diarahkan ke Authty (belum diminta user).

## Update (2026-06-08i) — Tiket Bantuan: kategori baru, ikon Detail, notifikasi lengkap, Dashboard
- **Kategori baru "Hapus Transaksi"** (perhatian khusus) ditambahkan di `routers/help_tickets.py` `CATEGORIES` + kedua halaman frontend (dialog tambah, filter, dan Informasi Tiket). Diverifikasi via `GET /api/help-tickets/meta` & dropdown filter.
- **Ikon aksi baris Detail** di Tiket Bantuan diganti `LifeBuoy` → **`Eye`** agar seragam dengan Kelola Tugas/Rapat/Time Schedule.
- **Menu Dashboard dipindah** dari grup "Selamat Datang" ke grup **"Menu Utama"** (grup lama dihapus) di `config/navigation.js`.
- **Notifikasi tiket dilengkapi (hanya ke pengguna terkait, pelaku tidak dinotifikasi sendiri)**: helper `notify()` lokal di `update_ticket` → (a) **penerima lama** diberi tahu "Tiket Dialihkan ke Orang Lain", (b) **pelapor** diberi tahu "Tujuan Tiket Diubah", (c) perubahan status kini juga dikirim ke **penerima** (bukan hanya pelapor, mis. saat Super Admin mengubah status). Komentar tetap ke pelapor+penerima.
- **Dashboard**: KPI card ke-5 **"Tiket Terbuka"** (klik → `/help-tickets`, hint "N perlu Anda tangani`) dan kartu **"Tiket Perlu Ditangani"** di kolom kanan (hanya tampil bila ada isi; baris padat 13px + badge prioritas + footer "Semua Tiket"). Grid KPI `lg:grid-cols-4` → `lg:grid-cols-5` (skeleton ikut 5). Backend `GET /api/dashboard/stats` menambah `open_tickets` (tiket terbuka dalam cakupan visibilitas tiket) & `my_tickets` (ditujukan ke saya, urut prioritas Urgent→Low).
- **Verifikasi**: `scripts/verify_ticket_hierarchy.py` diperluas → 18 langkah lolos (termasuk cek isi notifikasi tiap pihak & Dashboard per peran: `my_tickets` hanya muncul di penerima). UI diverifikasi via screenshot (KPI "TIKET TERBUKA 1", kartu "Tiket Perlu Ditangani", sidebar Dashboard di Menu Utama). `design-guard.sh` exit 0. Data uji & notifikasi uji dihapus; tiket contoh user dikembalikan ke `assignee: null`.

## Update (2026-06-08j) — Grafik tiket di Dashboard + label KPI "Tiket"
- Label KPI ke-5 diubah dari "Tiket Terbuka" → **"Tiket"** (permintaan user).
- **Dua kartu grafik baru** di bawah Tren Mingguan (grid `lg:grid-cols-2`, `items-start`):
  - **Tiket per Kategori** — bar horizontal (recharts `layout="vertical"`, tinggi adaptif `max(160, n*34)`, bar 14px, monokrom `--muted-foreground`), badge total di judul.
  - **Tiket per Prioritas** — bar vertikal berwarna per prioritas memakai token `--pr-urgent/high/medium/low` lewat `<Cell>` (konsisten dengan `PriorityBadge`, pengecualian E9); label Indonesia dari `PRIORITY_META`.
  - Komponen `ChartTip` bertoken (border/bg card, 12px) + `cursor` sorotan lembut `fillOpacity .08` (mengganti highlight abu-abu default recharts). EmptyState teks bila belum ada tiket.
- Backend `GET /api/dashboard/stats` menambah `tickets_by_category` (urut jumlah desc) & `tickets_by_priority` (urut Urgent→Low, selalu 4 entri) — dihitung dalam cakupan visibilitas tiket pengguna.
- Verifikasi: 6 tiket demo dibuat sementara → grafik render benar (kategori 5 batang, prioritas berwarna merah/oranye/biru/abu) → **tiket demo dihapus kembali**, sisa 1 tiket contoh milik user. `design-guard.sh` exit 0.

## Update (2026-06-08k) — FD14: header/footer Card & Dialog ber-latar muted + tinggi kartu Dashboard terkunci
- **FD14 (aturan baru, WAJIB — primitive)**: `CardHeader`/`CardFooter` (`ui/card.jsx`), `DialogHeader`/`DialogFooter` (`ui/dialog.jsx`), dan `AlertDialogHeader`/`AlertDialogFooter` kini memakai **`bg-muted`** + sudut membulat senada (`rounded-t-xl`/`rounded-b-xl` untuk Card, `sm:rounded-t-lg`/`sm:rounded-b-lg` untuk Dialog) sehingga area judul & aksi terlihat lebih gelap dari badan kartu. Perubahan dilakukan di **primitive** → otomatis berlaku di seluruh aplikasi (semua kartu, dialog, dan dialog konfirmasi). Padding FD6 (py-3 Card / py-4 Dialog) tidak berubah.
- **Dashboard — tinggi kartu terkunci + scroll**: baris utama kini `lg:h-[31.5rem]` (atau `lg:h-[40rem]` bila kartu "Tiket Perlu Ditangani" tampil); kartu kiri & kolom kanan `flex flex-col`, `CardContent` `min-h-0 flex-1 p-0`, dan `ListShell` `h-full overflow-y-auto` → semua kartu berukuran tetap dan isi berlebih otomatis dapat di-scroll (bukan memanjangkan kartu). EmptyState kini terpusat vertikal.
- **Kartu grafik**: "Tiket per Kategori/Prioritas" → **"Tiket Kategori"** & **"Tiket Prioritas"**, tinggi grafik dipatok 220px keduanya sehingga kedua kartu presisi sama (terukur 796×303 px).
- **Baris "Tiket Perlu Ditangani"**: urutan info ditukar — **nomor tiket** (tabular-nums, panjang seragam) di baris atas, judul + kategori di baris bawah.
- Verifikasi: data demo (8 tugas + 5 tiket) dibuat sementara untuk menguji scroll & keselarasan, screenshot light/dark + dialog memperlihatkan header/footer abu; **semua data demo, notifikasi, dan log demo dihapus kembali** (sisa: 1 tiket contoh user, 0 tugas). `design-guard.sh` exit 0.
