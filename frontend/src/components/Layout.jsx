import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useBranding } from "@/context/BrandingContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard, CheckSquare, CalendarDays, Bell, FileText, Video, ScrollText,
  Search, Sun, Moon, LogOut, Menu, X, Waves, ChevronDown, PanelLeftClose, PanelLeft,
  UserCircle, Users2, ShieldCheck, Database, BellRing, SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const NAV_GROUPS = [
  {
    title: "Selamat Datang",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/profile", label: "Profil Pengguna", icon: UserCircle },
    ],
  },
  {
    title: "Menu Utama",
    items: [
      { to: "/calendar", label: "Kalender", icon: CalendarDays, badge: "calendar_month_tasks" },
      { to: "/tasks", label: "Kelola Tugas", icon: CheckSquare, badge: "my_tasks" },
      { to: "/meetings", label: "Kelola Rapat", icon: Video },
      { to: "/notes", label: "Kelola Catatan", icon: FileText },
      { to: "/reminders", label: "Ingatkan Saya", icon: Bell },
    ],
  },
  {
    title: "Menu Admin",
    adminOnly: true,
    items: [
      { to: "/app-settings", label: "Kelola Aplikasi", icon: SlidersHorizontal },
      { to: "/roles", label: "Kelola Peranan", icon: ShieldCheck },
      { to: "/users", label: "Kelola Pengguna", icon: Users2 },
      { to: "/database", label: "Kelola Database", icon: Database },
      { to: "/notification-settings", label: "Kelola Notifikasi", icon: BellRing },
      { to: "/activity", label: "Log Aktivitas", icon: ScrollText },
    ],
  },
];

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("flowdesk_sidebar_collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [unread, setUnread] = useState(0);
  const [badges, setBadges] = useState({ calendar_month_tasks: 0, my_tasks: 0 });

  const appName = branding?.app_name || "FlowDesk";

  useEffect(() => {
    localStorage.setItem("flowdesk_sidebar_collapsed", collapsed ? "1" : "0");
    document.documentElement.style.setProperty("--sidebar-w-lg", collapsed ? "76px" : "260px");
  }, [collapsed]);

  const loadCounters = useCallback(async () => {
    try {
      const [n, b] = await Promise.all([api.get("/notifications"), api.get("/nav-badges")]);
      setUnread(n.data.unread);
      setBadges(b.data);
    } catch {}
  }, []);

  useEffect(() => { loadCounters(); }, [loadCounters, location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!query) { setResults(null); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/search", { params: { q: query } });
        setResults(data);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const goto = (path) => { setSearchOpen(false); setQuery(""); navigate(path); };

  const visibleGroups = NAV_GROUPS
    .map((g) => ({ ...g }))
    .filter((g) => !g.adminOnly || user?.role === "admin");

  const SidebarContent = (
    <>
      <div className={cn("flex items-center gap-2.5 px-5 h-16 shrink-0", collapsed && "lg:justify-center lg:px-0")}>
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-soft overflow-hidden">
          {branding?.logo ? <img src={branding.logo} alt="logo" className="h-full w-full object-cover" /> : <Waves className="h-5 w-5 text-primary-foreground" />}
        </div>
        {!collapsed && <span className="font-heading font-extrabold text-xl tracking-tight truncate">{appName}</span>}
      </div>
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{group.title}</p>}
            <div className="space-y-1">
              {group.items.map((item) => {
                const badgeVal = item.badge ? badges[item.badge] : 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors relative group",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      collapsed && "lg:justify-center lg:px-0"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && badgeVal > 0 && (
                      <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center" data-testid={`sidebar-badge-${item.badge}`}>{badgeVal}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden lg:flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors"
          data-testid="btn-collapse-sidebar"
        >
          {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <><PanelLeftClose className="h-[18px] w-[18px]" /> <span>Sembunyikan</span></>}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}>
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[260px] bg-card border-r border-border flex flex-col">
            <button className="absolute top-4 right-4" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className={cn("transition-all duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]")}>
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 backdrop-blur-xl bg-background/80 border-b border-border">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} data-testid="btn-mobile-menu">
            <Menu className="h-5 w-5" />
          </Button>

          <button
            onClick={() => setSearchOpen(true)}
            data-testid="btn-open-search"
            className="flex items-center gap-2.5 h-10 px-3.5 rounded-xl border border-border bg-secondary/50 text-muted-foreground text-sm hover:bg-secondary transition-colors w-full max-w-sm"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Cari tugas, rapat, catatan...</span>
            <kbd className="hidden sm:inline text-xs bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" onClick={toggle} data-testid="btn-toggle-theme" title="Ganti tema">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/notifications")} data-testid="btn-notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-xl hover:bg-secondary transition-colors" data-testid="btn-user-menu">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initials(user?.name)}
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-semibold">{user?.name}</div>
                <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                <UserCircle className="h-4 w-4 mr-2" /> Profil Pengguna
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await logout(); navigate("/login"); }} className="text-destructive" data-testid="menu-logout">
                <LogOut className="h-4 w-4 mr-2" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto fade-in">{children}</main>
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 top-[20%] translate-y-0">
          <DialogTitle className="sr-only">Pencarian Global</DialogTitle>
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Cari di seluruh ${appName}...`}
              className="border-0 focus-visible:ring-0 h-14 text-base"
              data-testid="global-search-input"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {!results && <p className="text-sm text-muted-foreground p-6 text-center">Ketik untuk mencari tugas, rapat, pengingat, catatan, dan lampiran.</p>}
            {results && <SearchResults results={results} goto={goto} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchResults({ results, goto }) {
  const sections = [
    { key: "tasks", label: "Tugas", path: (r) => `/tasks/${r.id}` },
    { key: "meetings", label: "Rapat", path: (r) => `/meetings/${r.id}` },
    { key: "reminders", label: "Pengingat", path: () => `/reminders` },
    { key: "notes", label: "Catatan", path: () => `/notes` },
    { key: "attachments", label: "Lampiran", path: (r) => (r.module === "task" ? `/tasks/${r.parent_id}` : r.module === "meeting" ? `/meetings/${r.parent_id}` : `/notes`) },
  ];
  const total = sections.reduce((s, sec) => s + (results[sec.key]?.length || 0), 0);
  if (total === 0) return <p className="text-sm text-muted-foreground p-6 text-center">Tidak ada hasil ditemukan.</p>;
  return (
    <div className="space-y-3">
      {sections.map((sec) => (results[sec.key]?.length > 0) && (
        <div key={sec.key}>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1">{sec.label}</p>
          {results[sec.key].map((r) => (
            <button
              key={r.id}
              onClick={() => goto(sec.path(r))}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-sm transition-colors"
              data-testid={`search-result-${sec.key}-${r.id}`}
            >
              {r.title || r.original_filename}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
