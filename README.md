# FlowDesk — Sistem Manajemen Kerja Internal

FlowDesk adalah aplikasi web untuk mengelola pekerjaan operasional harian: tugas, rapat, catatan, pengingat, kalender, notifikasi, hingga administrasi pengguna & sistem. Dirancang dengan filosofi **"Sederhana untuk Pengguna, Kuat di Balik Layar"** dan antarmuka berbahasa Indonesia.

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
- **Dashboard** — ringkasan beban kerja, tren, dan rapat mendatang.
- **Kelola Tugas** — Kanban, checklist berdetail, dokumen bertingkat (Revisi/Final), progres & status otomatis, template, duplikasi, ekspor PDF, @mention.
- **Kelola Rapat** — notulen kaya teks, agenda, keputusan, action item; action item dapat dikonversi menjadi Tugas (tertaut).
- **Kelola Catatan** — catatan bersama dengan tag & warna.
- **Ingatkan Saya** — pengingat pribadi + broadcast via Email/Telegram dengan pengaturan waktu.
- **Kalender** — tampilan gabungan tugas, rapat, pengingat, dan acara.
- **Notifikasi** — pusat notifikasi + Web Push browser (real, muncul walau tab tertutup).
- **Admin** — Kelola Aplikasi (branding), Kelola Peranan (RBAC), Kelola Pengguna (impor CSV/XLSX), Kelola Database (konfigurasi S3, backup & restore), Kelola Notifikasi, Kelola Arsip (pemulihan data terhapus), Log Aktivitas.

## Arsitektur & Teknologi
- **Backend**: FastAPI (Python 3.11), Motor (MongoDB async), JWT (PyJWT) + bcrypt, background loop, pywebpush (VAPID), boto3 (S3 eksternal).
- **Frontend**: React 19, Tailwind CSS, Shadcn UI, Recharts, jsPDF, font Poppins.
- **Basis Data**: MongoDB.
- **Penyimpanan Berkas**: Object Storage (default platform Emergent) atau S3-compatible eksternal (dikonfigurasi lewat Kelola Database).
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
│   ├── notifications.py, services.py
│   ├── seed.py              # seeder / reset data awal
│   ├── requirements.txt, .env
│   └── routers/             # auth, users, tasks, meetings, reminders,
│                            #   notes, attachments, feeds, aggregate,
│                            #   settings, profile, database, push, archive
├── frontend
│   ├── src/                 # pages/, components/, context/, lib/
│   ├── public/sw.js         # service worker Web Push
│   ├── Dockerfile, nginx.conf, package.json, .env
├── Dockerfile.backend
└── docker-compose.yml
```

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
| `EMERGENT_LLM_KEY` | (Opsional) kunci untuk fitur AI |

### Frontend (`frontend/.env`)
| Kunci | Deskripsi |
|------|-----------|
| `REACT_APP_BACKEND_URL` | Base URL backend (tanpa `/api`) |

> Jangan menaruh nilai default rahasia di `.env` produksi. Ganti `JWT_SECRET` dan `ADMIN_PASSWORD`.

## Akun Default (Superadmin)
Saat pertama kali dijalankan, sistem membuat satu superadmin:

```
Email    : admin@flowdesk.com   (dari ADMIN_EMAIL)
Password : admin123             (dari ADMIN_PASSWORD)
Role     : admin (akses penuh)
```

**Segera ganti kata sandi** melalui menu **Profil Pengguna** setelah login pertama, dan ubah `ADMIN_PASSWORD` di produksi.

## Model Hak Akses
- **Admin & Manajer**: melihat seluruh data.
- **Anggota**: hanya melihat data yang terkait dirinya (pembuat, atau PIC/pemberi tugas pada tugas, atau peserta pada rapat).
- **Hapus & ubah info inti**: hanya oleh pembuat data atau Admin.
- **PIC tugas** (bukan pembuat): hanya dapat memperbarui status/progres/checklist/dokumen.
- **Catatan**: dapat dilihat semua (bersama), tetapi hanya pembuat/Admin yang boleh mengubah/menghapus.
- **Pengingat**: privat, hanya milik pembuatnya.
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

```bash
# dari root proyek (/app)
docker compose up -d --build
```
Layanan yang berjalan:
- Frontend  → `http://localhost:3000`
- Backend   → `http://localhost:8001`
- MongoDB   → `localhost:27017` (volume `mongo_data`)

Perintah berguna:
```bash
docker compose logs -f backend      # lihat log
docker compose down                 # hentikan
docker compose down -v              # hentikan + hapus data MongoDB
docker compose exec backend python seed.py --force   # reset data awal
```

Konfigurasi env diatur di `docker-compose.yml` (ganti `JWT_SECRET` & `ADMIN_PASSWORD`). Jika mengubah `REACT_APP_BACKEND_URL`, build ulang frontend: `docker compose up -d --build frontend`.

> Catatan: unggahan berkas menggunakan Object Storage platform Emergent secara default. Untuk self-host, konfigurasikan **S3 eksternal** di menu **Kelola Database** (endpoint, bucket, access key, secret, region, path).

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
- **Email (SMTP)** & **Telegram** — dikonfigurasi di **Kelola Notifikasi** (host, port, kredensial, bot token, chat id).
- **Web Push Browser** — aktifkan di **Kelola Notifikasi** → "Push Browser di Perangkat Ini". Notifikasi tetap muncul walau tab tertutup (memerlukan HTTPS di produksi).

---
© FlowDesk — Sistem Manajemen Kerja Internal.
