# FlowDesk — Sistem Manajemen Kerja Internal

FlowDesk adalah aplikasi web untuk mengelola pekerjaan operasional harian: tugas, rapat, catatan, pengingat, time schedule, tiket bantuan, kalender, notifikasi, hingga administrasi pengguna & sistem. Dirancang dengan filosofi **"Sederhana untuk Pengguna, Kuat di Balik Layar"** dan antarmuka berbahasa Indonesia.

---

## Daftar Isi
1. [Fitur Utama](#fitur-utama)
2. [Arsitektur & Teknologi](#arsitektur--teknologi)
3. [Struktur Proyek](#struktur-proyek)
4. [Variabel Lingkungan](#variabel-lingkungan)
5. [Akun Default (Superadmin)](#akun-default-superadmin)
6. [Model Hak Akses](#model-hak-akses)
7. [Menjalankan Secara Lokal (Pengembangan)](#menjalankan-secara-lokal-pengembangan)
8. [Seeder / Reset Data Awal](#seeder--reset-data-awal)
9. [Deploy Lokal dengan Docker](#deploy-lokal-dengan-docker)
10. [Deploy di Server Produksi (Ubuntu 22.04 LTS)](#deploy-di-server-produksi-ubuntu-2204-lts)
11. [Deploy dengan Cloudflare Tunnel (Zero Trust)](#deploy-dengan-cloudflare-tunnel-zero-trust)
12. [Backup & Restore](#backup--restore)
13. [Notifikasi](#notifikasi)

---

## Fitur Utama
- **Dashboard** — ringkasan beban kerja (KPI tugas & tiket), tenggat terdekat, rapat hari ini/mendatang, tiket yang perlu Anda tangani, tren mingguan, serta grafik tiket per kategori & prioritas.
- **Kelola Tugas** — daftar (DataTable) + detail sunting-inline, checklist berdetail dengan persetujuan pemilik, dokumen bertingkat (Revisi/Final), progres & status otomatis, template, duplikasi, @mention.
- **Kelola Rapat** — notulen kaya teks, agenda, keputusan, action item; action item dapat dikonversi menjadi Tugas (tertaut).
- **Kelola Catatan** — catatan bersama dengan tag & warna.
- **Time Schedule** — jadwal kegiatan berbasis linimasa (Gantt): kegiatan berwarna kustom, garis "hari ini" & progres otomatis, penanda hari libur/Event, ekspor Excel, dan aksi **Buat Tugas** dari kegiatan (tertaut).
- **Ingatkan Saya** — pengingat pribadi + broadcast tepat waktu via **Email** atau **WhatsApp** (tautan wa.me ke nomor HP pembuat).
- **Tiket Bantuan** — pengajuan permintaan bantuan: judul, deskripsi, kategori, prioritas, **lampiran multi** (berkas/URL), tujuan (penerima), **komentar saling membalas**, dan penanganan status (Baru → Ditugaskan → Diproses → Menunggu Info → Selesai → Ditutup) + catatan penyelesaian. Nomor tiket otomatis `TKT-YYYYMM-NNNN`. Pemantauan berjenjang: pelapor, penerima, dan jabatan di atas keduanya dapat melihat; **atasan penerima** dapat mengalihkan tiket ke pegawai di bawah jabatannya.
- **Kalender** — tampilan gabungan tugas, rapat, pengingat, dan acara.
- **Notifikasi** — pusat notifikasi + Web Push browser (real, muncul walau tab tertutup).
- **Admin** — Kelola Aplikasi (identitas, aset merek, SEO & Open Graph), Kelola Keamanan (**SSO Authty** terpusat), Kelola Peranan (hierarki jabatan + izin menu per level), Kelola Pengguna (impor CSV/XLSX), Kelola Database (konfigurasi S3, backup & restore), Kelola Notifikasi, Kelola Arsip (pemulihan data terhapus), Log Aktivitas.

## Arsitektur & Teknologi
- **Backend**: FastAPI (Python 3.11), Motor (MongoDB async), JWT (PyJWT) + bcrypt, background loop, pywebpush (VAPID), boto3 (S3 eksternal), cryptography (enkripsi API key SSO).
- **Frontend**: React 19, Tailwind CSS, Shadcn UI (design system compact monokrom, font Geist), TanStack Table, Recharts.
- **Basis Data**: MongoDB.
- **Penyimpanan Lampiran**: Object Storage platform Emergent bila `EMERGENT_LLM_KEY` tersedia; jika tidak (self-host), otomatis memakai **filesystem lokal** (`LOCAL_STORAGE_DIR`). Deploy Docker sudah menyertakan volume khusus lampiran.
- **Backup Database**: dapat disimpan ke **S3-compatible eksternal** (dikonfigurasi di menu Kelola Database).
- **Routing**: seluruh endpoint backend diawali `/api`. Frontend memanggil `REACT_APP_BACKEND_URL`.

## Struktur Proyek
```
/app
├── backend
│   ├── server.py            # entrypoint FastAPI + background loops
│   ├── db.py, helpers.py, security.py
│   ├── storage.py           # object storage platform
│   ├── s3_storage.py        # S3 eksternal (boto3)
│   ├── webpush.py           # Web Push (VAPID)
│   ├── authty.py, crypto.py # SSO Authty + enkripsi API key
│   ├── notifications.py, services.py
│   ├── seed.py              # seeder / reset data awal
│   ├── scripts/             # skrip verifikasi (mis. verify_ticket_hierarchy.py)
│   ├── requirements.txt, .env
│   └── routers/             # auth, users, roles, tasks, meetings, reminders,
│                            #   notes, attachments, feeds, aggregate, settings,
│                            #   profile, database, push, archive, time_schedule,
│                            #   help_tickets, og, authty
├── frontend
│   ├── src/                 # pages/, components/, context/, lib/
│   ├── public/sw.js         # service worker Web Push
│   ├── Dockerfile, nginx.conf, package.json, .env
├── deploy/local/            # skrip deploy lokal opsional: start.sh, stop.sh,
│                            #   seed.sh, deploy.sh, docker-compose.yml, .env.example
└── README.md
```
> Catatan: Dockerfile/`docker-compose.yml` di root **sengaja tidak disertakan** — panel/deployer Anda (mis. Nexus Panel) yang menghasilkannya. Folder `deploy/local/` bersifat opsional untuk uji coba lokal manual.

## Variabel Lingkungan
### Backend (`backend/.env`)
| Kunci | Deskripsi |
|------|-----------|
| `MONGO_URL` | URL koneksi MongoDB (mis. `mongodb://localhost:27017`) |
| `DB_NAME` | Nama database (mis. `flowdesk`) |
| `CORS_ORIGINS` | Origin yang diizinkan, dipisah koma (mis. `https://app.domain.com`) |
| `JWT_SECRET` | Secret acak untuk menandatangani token JWT (**wajib kuat di produksi**) |
| `ADMIN_EMAIL` | Email superadmin yang di-seed saat startup |
| `ADMIN_PASSWORD` | Kata sandi superadmin awal |
| `EMERGENT_LLM_KEY` | (Opsional) kunci integrasi Emergent; bila ada, lampiran memakai Object Storage Emergent. Bila kosong, lampiran otomatis disimpan ke filesystem lokal. |
| `LOCAL_STORAGE_DIR` | (Opsional, self-host) folder penyimpanan lampiran di server. Bila di-set, lampiran selalu disimpan ke filesystem ini (mis. `/opt/flowdesk/data/uploads`). |

### Frontend (`frontend/.env`)
| Kunci | Deskripsi |
|------|-----------|
| `REACT_APP_BACKEND_URL` | Base URL backend (tanpa `/api`) |

> Jangan menaruh nilai default rahasia di `.env` produksi. Ganti `JWT_SECRET` dan `ADMIN_PASSWORD`.

## Environment Variables
Tabel lengkap seluruh variabel yang dibaca aplikasi (backend & frontend). Hanya variabel bertanda **Required** yang wajib disediakan; sisanya memiliki nilai default yang aman.

| Variable | Required/Optional | Default Value | Description |
|----------|-------------------|---------------|-------------|
| `MONGO_URL` | Required | - | MongoDB connection string (mis. `mongodb://localhost:27017`). |
| `DB_NAME` | Required | - | Nama database MongoDB. |
| `JWT_SECRET` | Required | - | Kunci rahasia untuk menandatangani & memverifikasi token JWT. |
| `REACT_APP_BACKEND_URL` | Required | - | Base URL backend saat build frontend, **tanpa** `/api` (mis. `https://app.example.com`). |
| `ADMIN_EMAIL` | Optional | `admin@flowdesk.com` | Email superadmin yang di-seed saat startup (idempoten). |
| `ADMIN_PASSWORD` | Optional | `admin123` | Kata sandi superadmin awal (disimpan ter-hash). Ganti di produksi. |
| `CORS_ORIGINS` | Optional | `*` | Daftar origin yang diizinkan, dipisah koma. |
| `LOCAL_STORAGE_DIR` | Optional | `/app/data` | Folder berkas persisten: lampiran (`/uploads`) & backup DB lokal (`/backups`). |
| `EMERGENT_LLM_KEY` | Optional | - | Kunci integrasi Emergent. Bila diisi, lampiran memakai Object Storage Emergent; bila kosong, lampiran disimpan di filesystem lokal di `LOCAL_STORAGE_DIR`. |
| `DISABLE_ESLINT_PLUGIN` | Optional | `false` | Flag build frontend. Set `true` agar `yarn build` tetap sukses walau ada peringatan ESLint. |
| `WDS_SOCKET_PORT` | Optional | - | (Hanya dev) port websocket dev-server CRA. Tidak dipakai pada build produksi. |
| `ENABLE_HEALTH_CHECK` | Optional | `false` | (Hanya dev) flag internal preview; tidak dipakai logika aplikasi. |

## Akun Default (Superadmin)
Saat pertama kali dijalankan, sistem membuat satu superadmin:

```
Email    : admin@flowdesk.com   (dari ADMIN_EMAIL)
Password : admin123             (dari ADMIN_PASSWORD)
Role     : super_admin (akses penuh, izin `*`)
```

**Segera ganti kata sandi** melalui menu **Profil Pengguna** setelah login pertama, dan ubah `ADMIN_PASSWORD` di produksi.

## Model Hak Akses
Sejak versi hierarki jabatan, peran `admin`/`manager`/`member` **dihapus**. Administrator = **Super Admin** (`super_admin`, izin `*`).
- **Hierarki jabatan (subtree)**: setiap peran punya `parent_id` & `level` (Komisaris → Dirut → Direksi → Kabag → Kasi → Staff). Pengguna melihat data **dirinya + seluruh bawahannya**; Super Admin melihat semua.
- **Izin menu per level** diatur di **Kelola Peranan**; frontend menggerbangi menu lewat `lib/perms.js`.
- **Penugasan**: kandidat PIC/penerima hanya pemegang jabatan **di bawah** jabatan pengguna (`GET /api/users/subordinates`).
- **Hapus & ubah info inti**: hanya oleh pembuat data atau Super Admin.
- **PIC tugas** (bukan pembuat): hanya dapat memperbarui status/progres/checklist/dokumen.
- **Catatan**: privat — hanya pembuatnya yang melihat & mengubah. **Pengingat**: privat.
- **Rapat**: shell rapat bersama, tetapi catatan/keputusan/lampiran bersifat pribadi per peserta.
- **Time Schedule**: pembuat & PIC kegiatan, plus atasannya (subtree).
- **Tiket Bantuan**: terlihat oleh pelapor, penerima, dan jabatan di atas keduanya. **Status** hanya dapat diubah penerima (atau Super Admin). **Tujuan tiket** dapat dipindahkan oleh pelapor, Super Admin, atau **atasan penerima** — dan bila bukan pelapor, hanya ke pegawai di bawah jabatannya.
- **Autentikasi**: bila **SSO Authty** aktif (Kelola Keamanan), pengguna masuk lewat Authty; Super Admin lokal tetap punya jalur darurat.
- Penghapusan bersifat **soft-delete** (dapat dipulihkan di **Kelola Arsip**); penghapusan permanen juga membersihkan berkas lampiran fisik.

## Menjalankan Secara Lokal (Pengembangan)
Prasyarat: Python 3.11+, Node.js 20+, Yarn, MongoDB berjalan.

```bash
# Backend
cd backend
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
# pastikan backend/.env terisi (MONGO_URL, DB_NAME, JWT_SECRET, dll.)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (terminal lain)
cd frontend
yarn install
# pastikan frontend/.env: REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```
Buka `http://localhost:3000`.

## Seeder / Reset Data Awal
Untuk memulai uji coba dari kondisi bersih (hanya menyisakan superadmin, semua data lain kosong, pengaturan direset ke default):

```bash
cd backend
python seed.py            # minta konfirmasi (ketik YA)
python seed.py --force    # tanpa konfirmasi (CI/otomatis)
```
Kredensial superadmin diambil dari `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

> ⚠️ **PERINGATAN**: `seed.py` menghapus SELURUH data (tugas, rapat, catatan, pengingat, lampiran, log, backup, dst.). Gunakan hanya untuk lingkungan uji coba.

## Deploy Lokal dengan Docker
Prasyarat: Docker & Docker Compose.

Gunakan skrip di `deploy/local/` (mendukung banyak project di 1 mesin tanpa bentrok port/volume):
```bash
cd deploy/local
./start.sh                # WIZARD: pilih nama project + port (setup awal)
./start.sh --reconfigure  # jalankan wizard lagi (ganti port/nama)
./start.sh -y             # non-interaktif: pakai port default
./stop.sh                 # hentikan stack (data aman di volume)
./seed.sh                 # reset data (superadmin saja) — ketik YA / ./seed.sh -y
./deploy.sh               # pull commit terbaru + rebuild kondisional
```

Wizard menyimpan pilihan ke `deploy/local/.env`:
- `COMPOSE_PROJECT_NAME` → prefiks unik container/volume/network (mis. `projectb_mongodb`, `projectb_mongo_data`).
- `FRONTEND_PORT` / `BACKEND_PORT` / `MONGO_PORT` / `MONGO_EXPRESS_PORT` → port host yang dipakai.

> Menjalankan >1 project Emergent di satu mesin? Cukup beri **nama project berbeda** dan **port berbeda** di wizard tiap project — container, volume MongoDB, dan network otomatis terpisah sehingga tidak ada konflik.

Perintah berguna (dari `deploy/local`):
```bash
docker compose logs -f backend      # lihat log
docker compose down                 # hentikan
docker compose down -v              # hentikan + hapus data MongoDB
./seed.sh -y                        # reset data awal
```

Konfigurasi disimpan di `deploy/local/.env` (dibuat oleh wizard `start.sh`). Ganti `JWT_SECRET` & `ADMIN_PASSWORD` untuk penggunaan nyata. Bila mengubah `BACKEND_PORT`/`REACT_APP_BACKEND_URL`, build ulang frontend: `docker compose up -d --build frontend`.

> Catatan penyimpanan lampiran: deploy Docker menyimpan lampiran ke **filesystem** (volume `<project>_uploads_data` via `LOCAL_STORAGE_DIR=/data/uploads`) sehingga **tidak memerlukan** Object Storage Emergent. Menu **Kelola Database** (S3 eksternal) khusus untuk **backup database**, bukan lampiran.

## Deploy via Control Panel (Nexus Panel / Docker)
Panel meng-clone repo lalu membangun backend & frontend dengan Docker yang ia hasilkan sendiri — **tidak ada Dockerfile/compose di root**.
- **Backend**: dijalankan dari folder `backend/` dengan `uvicorn server:app --host 0.0.0.0 --port 8001`. Objek FastAPI bernama `app` berada di `backend/server.py`.
- **Frontend**: `yarn install && yarn build` dari folder `frontend/`, lalu sajikan folder `build/` sebagai statis. `REACT_APP_BACKEND_URL` di-set saat build.
- Sediakan variabel **wajib** (lihat [Environment Variables](#environment-variables)): `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `REACT_APP_BACKEND_URL`.
- Mount volume persisten ke `LOCAL_STORAGE_DIR` (default `/app/data`) agar lampiran (`/app/data/uploads`) & backup DB lokal (`/app/data/backups`) tidak hilang saat rebuild.
- Semua endpoint backend berawalan `/api`; arahkan reverse-proxy path `/api` → backend `:8001`, sisanya → frontend statis.

## Deploy di Server Produksi (Ubuntu 22.04 LTS)
OS rekomendasi: **Ubuntu Server 22.04 LTS** (juga cocok untuk 24.04 LTS).

### 1. Paket dasar
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3.11 python3.11-venv python3-pip nginx git curl
# Node.js 20 + Yarn
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
```

### 2. MongoDB 7
```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

### 3. Kode & backend
```bash
sudo mkdir -p /opt/flowdesk && sudo chown $USER /opt/flowdesk
git clone <repo-anda> /opt/flowdesk && cd /opt/flowdesk/backend
python3.11 -m venv venv && source venv/bin/activate
pip install -r requirements.txt --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
# buat backend/.env untuk produksi (MONGO_URL, DB_NAME, JWT_SECRET kuat, CORS_ORIGINS=https://domain-anda, ADMIN_*)
```

> **Penyimpanan lampiran (self-host)**: karena `EMERGENT_LLM_KEY` tidak tersedia, tambahkan `LOCAL_STORAGE_DIR=/opt/flowdesk/data/uploads` pada `backend/.env` agar lampiran tersimpan permanen di server. Pastikan folder dapat ditulis oleh user service (`www-data`), mis. `sudo mkdir -p /opt/flowdesk/data/uploads && sudo chown www-data /opt/flowdesk/data/uploads`.

Buat service systemd `/etc/systemd/system/flowdesk-backend.service`:
```ini
[Unit]
Description=FlowDesk Backend
After=network.target mongod.service

[Service]
User=www-data
WorkingDirectory=/opt/flowdesk/backend
EnvironmentFile=/opt/flowdesk/backend/.env
ExecStart=/opt/flowdesk/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now flowdesk-backend
```

### 4. Build frontend
```bash
cd /opt/flowdesk/frontend
# frontend/.env: REACT_APP_BACKEND_URL=https://domain-anda
yarn install
yarn build      # hasil ada di frontend/build
```

### 5. Nginx (reverse proxy + SPA)
`/etc/nginx/sites-available/flowdesk`:
```nginx
server {
    listen 80;
    server_name domain-anda;

    # Frontend (React build)
    root /opt/flowdesk/frontend/build;
    index index.html;
    location / { try_files $uri /index.html; }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;   # untuk unggahan berkas
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/flowdesk /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
Karena Nginx memproksi `/api` ke backend pada domain yang sama, set `REACT_APP_BACKEND_URL=https://domain-anda` (tanpa `/api`).

### 6. HTTPS (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domain-anda
```

### 7. Firewall
```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
```

### 8. (Opsional) Reset data awal di produksi
```bash
cd /opt/flowdesk/backend && source venv/bin/activate && python seed.py
```

## Deploy dengan Cloudflare Tunnel (Zero Trust)
Cocok untuk server ber-**IP lokal** (tanpa IP publik) yang ingin diakses dari luar lewat domain. Cloudflare menangani **SSL/HTTPS otomatis** dan akses publik melalui koneksi keluar (outbound) — **tidak perlu membuka port masuk** di router/firewall.

**Ikuti Langkah 1–5** pada panduan produksi di atas (paket dasar, MongoDB, backend + systemd, build frontend, Nginx), dengan penyesuaian berikut, lalu **LEWATI Langkah 6 (certbot) & 7 (buka port publik)**.

### Penyesuaian env & build (gunakan domain publik Anda)
- `backend/.env` → `CORS_ORIGINS=https://app.domain-anda.com`
- `frontend/.env` → `REACT_APP_BACKEND_URL=https://app.domain-anda.com` (lalu `yarn build` ulang)
- Nginx tetap `listen 80;` (cukup diakses secara lokal oleh tunnel). Boleh set `server_name app.domain-anda.com;`. Karena Nginx memproksi `/api` ke backend di domain yang sama, konfigurasi tidak berubah.

### Pasang cloudflared
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login        # otorisasi lewat browser, pilih domain di akun Cloudflare
```

### Buat tunnel & routing
```bash
cloudflared tunnel create flowdesk          # menghasilkan <TUNNEL_ID> + file kredensial di ~/.cloudflared/
cloudflared tunnel route dns flowdesk app.domain-anda.com
```

Buat `/etc/cloudflared/config.yml`:
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: app.domain-anda.com
    service: http://localhost:80
  - service: http_status:404
```

### Jalankan sebagai service
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

### Pengaturan di dashboard Cloudflare
- **SSL/TLS mode**: `Full` (Cloudflare → origin lewat tunnel sudah aman; jangan `Flexible`).
- **Always Use HTTPS**: aktifkan.
- (Opsional) **Zero Trust → Access**: tambahkan Application/Policy bila ingin membatasi siapa yang boleh membuka domain (mis. email tertentu / SSO) sebelum mencapai halaman login FlowDesk.

### Firewall server (hanya SSH lokal)
```bash
sudo ufw allow OpenSSH && sudo ufw enable   # TIDAK perlu allow 80/443 dari internet
```

> Catatan penting:
> - Karena SSL ditangani Cloudflare, **abaikan certbot/Let's Encrypt**.
> - **Web Push** & clipboard butuh HTTPS — otomatis terpenuhi via domain Cloudflare.
> - Batas ukuran unggah plan Cloudflare Free = 100MB (sesuaikan `client_max_body_size` Nginx & `max_file_mb` di Kelola Database bila perlu).
> - Pastikan MongoDB tetap hanya mendengarkan `127.0.0.1` (default) — jangan diekspos ke jaringan.

## Backup & Restore
Melalui menu **Kelola Database**:
- **Backup & Unduh** — cadangan penuh (gzip JSON) diunduh ke perangkat.
- **Backup ke Object Storage** — disimpan ke S3 yang dikonfigurasi.
- **Backup Otomatis** — jadwal harian/mingguan otomatis.
- **Restore** — dari riwayat backup atau **unggah berkas** `.json.gz`.
- **Kelola Arsip** — memulihkan data yang terhapus (soft-delete).

## Notifikasi
Dikonfigurasi di **Kelola Notifikasi**. Notifikasi hanya dikirim melalui kanal yang **diaktifkan** (toggle per kanal).
- **Email (SMTP)** — host, port, kredensial, **Nama Pengirim** + email pengirim (tampil profesional sebagai `Nama <email>`).
- **Telegram** — bot token + Chat/Group ID. Ditujukan untuk **notifikasi sistem/internal ke grup**, bukan ke pengguna tertentu. Pesan penugasan & sebutan menyebut **nama** penerima (mis. "ditugaskan kepada Budi"), bukan "Anda".
- **WhatsApp (wa.me)** — broadcast pengingat pribadi dikirim ke **nomor HP pembuat** dalam format internasional (mis. `6281234567890`) sebagai tautan klik-untuk-chat.
- **Web Push Browser** — aktifkan di **Kelola Notifikasi** → "Push Browser di Perangkat Ini". Tetap muncul walau tab tertutup (memerlukan HTTPS di produksi).

---
© FlowDesk — Sistem Manajemen Kerja Internal.
