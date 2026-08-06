import { LayoutDashboard } from "lucide-react";

/**
 * Centralised navigation config (R35).
 *
 * Redesign phase: the sidebar intentionally exposes ONLY the Dashboard. Every
 * other module keeps its route registered in `App.js` (reachable by direct URL)
 * and is re-added here one at a time as it gets migrated to the design system.
 */
export const navSections = [
  {
    label: "Selamat Datang",
    items: [
      { title: "Dashboard", to: "/", end: true, icon: LayoutDashboard },
    ],
  },
];

/**
 * Breadcrumb titles per route. Legacy (not-yet-migrated) routes are listed too
 * so a direct URL visit still renders a meaningful trail.
 */
const ROUTE_TRAILS = [
  [/^\/$/, ["Dashboard"]],
  [/^\/profile$/, ["Profil Pengguna"]],
  [/^\/dashboard-legacy$/, ["Dashboard (lama)"]],
  [/^\/calendar$/, ["Kalender"]],
  [/^\/tasks$/, ["Kelola Tugas"]],
  [/^\/tasks\/new$/, ["Kelola Tugas", "Tugas Baru"]],
  [/^\/tasks\/[^/]+\/edit$/, ["Kelola Tugas", "Ubah Tugas"]],
  [/^\/tasks\/[^/]+$/, ["Kelola Tugas", "Detail Tugas"]],
  [/^\/meetings$/, ["Kelola Rapat"]],
  [/^\/meetings\/new$/, ["Kelola Rapat", "Rapat Baru"]],
  [/^\/meetings\/[^/]+\/edit$/, ["Kelola Rapat", "Ubah Rapat"]],
  [/^\/meetings\/[^/]+$/, ["Kelola Rapat", "Detail Rapat"]],
  [/^\/help-tickets$/, ["Tiket Bantuan"]],
  [/^\/time-schedule$/, ["Time Schedule"]],
  [/^\/time-schedule\/[^/]+$/, ["Time Schedule", "Linimasa"]],
  [/^\/notes$/, ["Kelola Catatan"]],
  [/^\/reminders$/, ["Ingatkan Saya"]],
  [/^\/notifications$/, ["Notifikasi"]],
  [/^\/app-settings$/, ["Kelola Aplikasi"]],
  [/^\/roles$/, ["Kelola Peranan"]],
  [/^\/users$/, ["Kelola Pengguna"]],
  [/^\/database$/, ["Kelola Database"]],
  [/^\/notification-settings$/, ["Kelola Notifikasi"]],
  [/^\/archive$/, ["Kelola Arsip"]],
  [/^\/activity$/, ["Log Aktivitas"]],
];

/** Resolve the breadcrumb trail for a pathname. */
export function getBreadcrumb(pathname) {
  const match = ROUTE_TRAILS.find(([pattern]) => pattern.test(pathname));
  return { trail: match ? match[1] : ["Dashboard"] };
}
