import {
  Archive,
  Bell,
  BellRing,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Database,
  FileText,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Users2,
  Video,
} from "lucide-react";

/**
 * Centralised navigation config (R35).
 *
 * The sidebar is split into AREAS (switchable from the sidebar header):
 *   - `member` — day-to-day work for every user.
 *   - `admin`  — system administration (admin role only).
 *
 * Redesign phase: menus are re-added area by area as each module is migrated to
 * the design system. Routes stay registered in `App.js` (reachable by direct
 * URL) even while hidden from the sidebar.
 */
export const AREAS = [
  {
    id: "member",
    label: "Member Area",
    description: "Pekerjaan harian",
    icon: LayoutGrid,
    adminOnly: false,
    sections: [
      {
        label: "Selamat Datang",
        items: [
          { title: "Dashboard", to: "/", end: true, icon: LayoutDashboard },
        ],
      },
      {
        label: "Menu Utama",
        items: [
          { title: "Kalender", to: "/calendar", icon: CalendarDays, perm: "calendar" },
          { title: "Kelola Tugas", to: "/tasks", icon: CheckSquare, perm: "task" },
          { title: "Kelola Rapat", to: "/meetings", icon: Video, perm: "meeting" },
          { title: "Tiket Bantuan", to: "/help-tickets", icon: LifeBuoy },
          { title: "Time Schedule", to: "/time-schedule", icon: ClipboardList, perm: "time_schedule" },
          { title: "Kelola Catatan", to: "/notes", icon: FileText, perm: "note" },
          { title: "Ingatkan Saya", to: "/reminders", icon: Bell, perm: "reminder" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administrator",
    description: "Pengelolaan sistem",
    icon: ShieldCheck,
    adminOnly: true,
    sections: [
      {
        label: "Pengaturan",
        items: [
          { to: "/app-settings", title: "Kelola Aplikasi", icon: SlidersHorizontal },
          { to: "/archive", title: "Kelola Arsip", icon: Archive },
          { to: "/database", title: "Kelola Database", icon: Database },
          { to: "/security-settings", title: "Kelola Keamanan", icon: KeyRound },
          { to: "/notification-settings", title: "Kelola Notifikasi", icon: BellRing },
          { to: "/users", title: "Kelola Pengguna", icon: Users2 },
          { to: "/roles", title: "Kelola Peranan", icon: ShieldCheck },
          { to: "/activity", title: "Log Aktivitas", icon: ScrollText },
        ],
      },
    ],
  },
];

export const DEFAULT_AREA_ID = "member";

/** Areas visible for the current user, with items filtered by permission. */
export const getAreas = (isAdmin, can = () => true) =>
  AREAS.filter((area) => !area.adminOnly || isAdmin)
    .map((area) => ({
      ...area,
      sections: area.sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.perm || can(item.perm)),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((area) => area.sections.length > 0);

/** Resolve an area by id, falling back to the default area. */
export const getArea = (areaId, isAdmin, can) => {
  const areas = getAreas(isAdmin, can);
  return areas.find((a) => a.id === areaId) || areas[0];
};

/** First navigable route of an area (used when switching areas). */
export const firstRouteOf = (area) => area?.sections?.[0]?.items?.[0]?.to || null;

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
  [/^\/security-settings$/, ["Kelola Keamanan"]],
  [/^\/roles$/, ["Kelola Peranan"]],
  [/^\/users$/, ["Kelola Pengguna"]],
  [/^\/database$/, ["Kelola Database"]],
  [/^\/notification-settings$/, ["Kelola Notifikasi"]],
  [/^\/archive$/, ["Kelola Arsip"]],
  [/^\/activity$/, ["Log Aktivitas"]],
];

/** Routes that belong to the Administrator area (used to auto-select an area). */
const ADMIN_ROUTES = [
  /^\/users/,
  /^\/roles/,
  /^\/database/,
  /^\/app-settings/,
  /^\/security-settings/,
  /^\/notification-settings/,
  /^\/activity/,
  /^\/archive/,
];

/** Area id that owns a pathname. */
export const areaIdOf = (pathname) =>
  ADMIN_ROUTES.some((re) => re.test(pathname)) ? "admin" : "member";

/** Resolve the breadcrumb trail for a pathname. */
export function getBreadcrumb(pathname) {
  const match = ROUTE_TRAILS.find(([pattern]) => pattern.test(pathname));
  return { trail: match ? match[1] : ["Dashboard"] };
}
