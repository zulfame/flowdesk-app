# BACKLOG — Deferred Components, Rules & Policies (Parked)

> Item yang **sudah disebut** namun **belum waktunya dikerjakan** untuk scope saat ini.
> Item di sini **tidak boleh diimprovisasi** lebih dulu. Aktifkan hanya setelah **trigger**
> terpenuhi + persetujuan, lalu pindahkan ke `DESIGN_SYSTEM.md` (status ✅) & catat di Changelog.

**Status implementasi:** 🔒 Deferred · ⏳ Menunggu prasyarat · 🔵 Forward-looking (aktif saat lintas-tim/publikasi) · ✅ Done (dipindah)

---

## 1. Komponen / Fitur Ditunda

| ID | Item | Alasan ditunda | Trigger aktivasi | Status |
|----|------|----------------|------------------|--------|
| B3 | **Reduced Motion** (`prefers-reduced-motion`) | Peningkatan aksesibilitas gerak; belum kritikal untuk scope saat ini | Ada kebutuhan a11y gerak / audit aksesibilitas | 🔒 |
| B5 | **Saved Filter** (DataTable) | Butuh persistensi (localStorage/backend) & UX manajemen filter | Halaman data nyata + kebutuhan simpan filter | 🔒 |
| B6 | **Virtualization** tabel/list besar | Data mock kecil (client-side cukup); butuh dependency baru (R37) | Dataset besar (> ~100–200 baris) / backend nyata | 🔒 |

---

## 2. Aturan / Kebijakan Forward-looking (sudah ditulis, aktif nanti)

| ID | Item | Alasan belum wajib | Trigger aktivasi | Status |
|----|------|--------------------|------------------|--------|
| BR3 | **Versioning & Release Policy** (2C.15) | Belum lintas-tim/publikasi | Design System dipakai lintas-tim / dirilis publik | 🔵 |
| BR4 | **Testing Standard** (2C.22) | Guard + review manual sudah cukup untuk scope | Adopsi automasi (Playwright/axe) / lintas-tim | 🔵 |
| BR5 | **Performance Guideline** (2C.23) | Mock frontend kecil | Data/halaman membesar / backend nyata | 🔵 |

---

## 3. Sengaja TIDAK ditambahkan (di luar scope saat ini)

Berdasarkan audit ahli — bukan karena tidak berguna, tetapi belum diperlukan:
i18n · Design Token baru · Design Principle baru · Accessibility Guide terpisah.
Dipertimbangkan hanya bila Design System dipakai lintas-tim atau dipublikasikan.

---

## 4. Sudah Dipindahkan ke DESIGN_SYSTEM.md (bukan lagi backlog)

| Item | Status baru | Catatan |
|------|-------------|---------|
| Alert form-level | ✅ Established | `LoginForm` (variant `destructive`). |
| Dark Mode Toggle (B1) | ✅ Established | Token 2-layer + `ThemeProvider`/`ModeToggle` (R28, Update 37). |
| Empty State pattern (B2 / BR2) | ✅ Established | `No Data Available` + klasifikasi 2C.18 + composite `EmptyState`. |
| Comfortable Density mode (B4) | ✅ Established | Default **Dense** ⇄ **Comfortable** runtime via `DensityProvider`/`DensityToggle` (CSS var, `localStorage`). 2B.21/2C.4, Update 68/69. |

---

> **Cara mengangkat item dari backlog:**
> 1. Trigger aktivasi terpenuhi + dapatkan persetujuan.
> 2. Implementasi memakai komponen resmi shadcn/ui (tanpa improvisasi).
> 3. Update `DESIGN_SYSTEM.md` (Bagian 1/2 → ✅) + Changelog.
> 4. Perbarui/hapus entri terkait di file ini.
