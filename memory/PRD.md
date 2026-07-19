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
