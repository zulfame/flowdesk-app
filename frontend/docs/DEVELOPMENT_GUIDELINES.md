# Development Guidelines — WAJIB DIPATUHI (Non-Negotiable)

> Kontrak standar rekayasa perangkat lunak untuk proyek ini. Melengkapi
> `DESIGN_SYSTEM_RULES.md` (yang mengatur UI/komponen). Dokumen ini mengatur
> **kode, database, akses data, API, keamanan, performa, file, monitoring,
> backup, dan dokumentasi**.
>
> **SSOT in-app:** `src/config/developmentGuidelines.js` (dirender di area
> **Development Guidelines**, rute `/development`). Setiap perubahan pada aturan
> **wajib** disinkronkan antara dokumen ini dan file config tersebut.
>
> Stack acuan: **React (frontend) + FastAPI + MongoDB (backend)**.
> Bahasa: **Bahasa Indonesia**.

## Prinsip Umum
1. **Konsistensi di atas preferensi pribadi** — ikuti pola yang sudah ada.
2. **Fail fast, fail clear** — error eksplisit & dapat ditindaklanjuti.
3. **Security & privacy by default** — jangan pernah percaya input; jangan bocorkan rahasia.
4. **Config bukan kode** (12-factor) — nilai per-environment dari environment variable.
5. **Dokumen hidup** — dokumentasi & changelog diperbarui bersama perubahan kode.

---

## 1. Code
- **Code Structure** — feature-first; satu modul satu tanggung jawab; hindari circular import; file < ~400 baris.
- **Naming Convention** — Python `snake_case`/`PascalCase`/`UPPER_SNAKE`; JS `camelCase`/`PascalCase`; boolean `is/has/should`; tanpa magic number.
- **Code Readability** — fungsi pendek & fokus; early return; komentar menjelaskan "mengapa"; format via linter/formatter.
- **Code Reusability** — DRY (rule of three); util reusable di lokasi bersama; hindari abstraksi prematur.
- **Separation of Concerns** — UI ↔ service ↔ data terpisah; router tipis; frontend akses backend hanya via `lib/api.js`.
- **Error Handling** — status HTTP tepat (400/401/403/404/409/422/500); tidak ada catch kosong; pesan ramah di UI.
- **Exception Handling** — tangkap spesifik; handler global (FastAPI handler + React ErrorBoundary); bersihkan resource.
- **Logging** — logger terkonfigurasi, **bukan** `print`/`console.log`; level tepat; tanpa rahasia/PII; sertakan request id.
- **Configuration Management** — baca dari environment; **jangan hardcode** URL/port/secret; `MONGO_URL` & `REACT_APP_BACKEND_URL`; validasi var wajib saat startup.
- **Input Validation** — schema-based (Pydantic/Zod); validasi server wajib; whitelist; error 422 informatif.

## 2. Database (MongoDB — access-pattern first)
- **Schema Design** — desain berbasis pola akses; **UUID string** sebagai identitas (JANGAN ekspos ObjectId); bentuk dokumen konsisten; perubahan skema terdokumentasi.
- **Table/Collection Structure** — satu koleksi satu entitas; hindari field catch-all; nesting wajar.
- **Column/Field Naming** — `snake_case` konsisten; nama audit seragam (`created_at`/`updated_at`); referensi bersufiks `_id`.
- **Data Type Selection** — waktu UTC ISO 8601; angka sebagai number; **hindari float untuk uang**; enum untuk status.
- **Primary Key Strategy** — UUID v4 string, immutable; bukan kunci bisnis; **tidak** memakai ObjectId sebagai identitas publik.
- **Foreign Key Relationship** — referensi `<entity>_id`; validasi keberadaan di service; kebijakan delete jelas; anti-siklus.
- **Index Management** — index field panas; unique index untuk field unik (`code`/`name`); hindari over-indexing.
- **Constraint Management** — keunikan dua lapis (unique index + cek aplikasi → 409); required via schema; jaga invarian domain.
- **Normalization** — embed vs reference berdasarkan pola akses; denormalisasi terukur & terdokumentasi; jaga SSOT.
- **Audit Fields** — `created_at`/`updated_at` (UTC) wajib; `created_by`/`updated_by` bila ada user; pertimbangkan soft delete.

## 3. Data Access
- **Query Optimization** — filter & proyeksi di DB; hindari N+1; manfaatkan indeks & aggregation.
- **Data Pagination** — semua list terpaginasi; batas maksimum page size; cursor/keyset untuk data besar.
- **Batch Processing** — bulk operation + chunking; tangani kegagalan parsial; idempoten.
- **Transaction Management** — transaksi untuk perubahan atomik multi-dokumen; singkat; uji rollback; saga untuk lintas sistem.
- **Data Consistency** — invarian di server; operasi atomik (`find_one_and_update`); sinkronkan data denormal.

## 4. API & Integration
- **API Design** — semua route prefiks **`/api`**; resource-oriented (kata benda jamak); verb & status code tepat.
- **API Versioning** — breaking change → versi baru (`/api/v1`); umumkan deprekasi; changelog API.
- **Request Validation** — model Pydantic per endpoint; 422 informatif.
- **Response Standardization** — `response_model`; format error konsisten; **tidak** bocorkan ObjectId/internal.
- **Serialization Safety** — jangan pernah kembalikan dokumen Mongo mentah; ObjectId→str & `_id`→`id`; jangan spread `{**doc}`; buang `_id` dari dict yang dipakai ulang sebagai payload (audit); jaring pengaman list: `json.loads(json.dumps(docs, default=str))`.
- **Authentication** — mekanisme standar (JWT/OAuth2/session); hash password kuat (bcrypt/argon2); secret dari environment.
- **Authorization** — cek di server; least privilege (default deny); RBAC; UI menyembunyikan tapi server otoritatif.
- **Rate Limiting** — lindungi endpoint sensitif; 429 + `Retry-After`; limit per identitas.
- **Integration Management** — timeout + retry (backoff) + circuit breaker; kredensial dari environment; klien terisolasi; fallback.

## 5. Security
- **Secure Data Validation** — whitelist; validasi server wajib; anti-injeksi (NoSQL/command).
- **Sensitive Data Protection** — TLS in-transit; lindungi at-rest; tidak log/return sensitif; masking di UI.
- **Credential Management** — secret di `.env`/secret manager; **jangan commit/hardcode**; rotasi kunci; least privilege.
- **Integration Secret Handling** — secret dari user (bot token, webhook URL, SMTP password) bersifat write-only: jangan kembalikan ke client (kirim kosong + flag `*_set`); field secret kosong saat simpan = pertahankan nilai lama (merge); redaksi di audit; test koneksi utamakan validasi (Telegram getMe, SMTP login) bila memungkinkan.
- **File Security** — validasi tipe (MIME+magic bytes) & ukuran; nama file di-sanitasi; jangan eksekusi upload; akses download terotorisasi.
- **Session Management** — cookie `HttpOnly`/`Secure`/`SameSite`; timeout + revocation; regenerasi id saat login.
- **Security Headers** — HSTS, `X-Content-Type-Options: nosniff`, frame-ancestors/`X-Frame-Options`, CSP; CORS ketat.
- **Input & Output Sanitization** — escape output per konteks; hindari `dangerouslySetInnerHTML`; sanitasi HTML tak tepercaya; query berparameter.

## 6. Performance
- **Caching Strategy** — cache data mahal dengan TTL & strategi invalidasi; jangan cache data sensitif salah tempat.
- **Resource Optimization** — code splitting/minifikasi/kompresi; payload minimal; pantau bundel.
- **Background Processing** — kerja berat via queue/worker; idempoten & retryable; batasi konkurensi.
- **Lazy Loading** — lazy-load rute/komponen/gambar; virtualisasi list panjang.
- **Performance Monitoring** — latensi p50/p95/p99; Core Web Vitals; baseline & alert.

## 7. File Management
- **File Organization** — struktur direktori bermakna; storage persisten khusus; metadata di DB; publik vs privat terpisah.
- **File Naming** — nama fisik unik (UUID); sanitasi nama asli; anti path traversal.
- **File Validation** — whitelist tipe & batas ukuran; cek magic bytes; tolak file berbahaya.
- **File Retention** — kebijakan retensi; bersihkan file yatim; soft-delete + purge; patuhi regulasi.

## 8. Monitoring
- **Application Logging** — terstruktur & ber-level; request id; tanpa rahasia; rotasi.
- **Audit Logging** — catat aksi sensitif (aktor/aksi/target/waktu/hasil); append-only; retensi jelas.
- **Error Monitoring** — kumpulkan terpusat (mis. Sentry); agregasi & alert; kaitkan dengan versi rilis.
- **Health Monitoring** — health/readiness endpoint; cek dependensi vital; liveness vs readiness; alert.
- **Performance Metrics** — RED (rate/errors/duration) & USE (utilization/saturation/errors); dashboard; SLI/SLO.

## 9. Backup & Recovery
- **Data Backup** — 3-2-1; otomatis & terjadwal; terenkripsi & off-site; tetapkan RPO.
- **Recovery Procedure** — runbook restore; tetapkan RTO; drill berkala; peran & eskalasi.
- **Backup Verification** — verifikasi integritas (checksum); test-restore rutin; alert kegagalan.

## 10. Documentation
- **Architecture Documentation** — pelihara `ARCHITECTURE.md`; catat keputusan (ADR); perbarui saat berubah.
- **Database Documentation** — koleksi/field/tipe/relasi/indeks/constraint; selaras implementasi.
- **API Documentation** — OpenAPI/Swagger (FastAPI `/docs`); contoh & skema error; sinkron dengan kode.
- **Change Documentation** — CHANGELOG (SemVer + Keep a Changelog); commit/PR deskriptif; tandai breaking change.

---

## Definition of Done (checklist ringkas)
- [ ] Tidak ada hardcode URL/port/secret; nilai dari environment.
- [ ] Identitas memakai UUID; tidak ada ObjectId bocor ke API.
- [ ] Endpoint list terpaginasi; input tervalidasi schema; error/status code tepat.
- [ ] Tidak ada `print`/`console.log`; logging terstruktur tanpa rahasia.
- [ ] Otorisasi dicek di server; rahasia tidak masuk repo/log.
- [ ] Audit field (`created_at`/`updated_at`) terisi; perubahan tercatat di CHANGELOG.
- [ ] Dokumentasi (arsitektur/DB/API) diperbarui bila relevan.

> Detail lengkap tiap topik (prinsip, aturan, do/don't, contoh kode, checklist) —
> lihat area **Development Guidelines** in-app atau `src/config/developmentGuidelines.js`.
