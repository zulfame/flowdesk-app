import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { api } from "@/lib/api";
import {
  LayoutDashboard, CheckSquare, Users2, CalendarDays, Bell, FileText,
  Video, ScrollText, Settings, Search, Sun, Moon, LogOut, Menu, X,
  Waves, ChevronDown, PanelLeftClose, PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "Tugas", icon: CheckSquare },
  { to: "/meetings", label: "Rapat", icon: Video },
  { to: "/calendar", label: "Kalender", icon: CalendarDays },
  { to: "/reminders", label: "Pengingat", icon: Bell },
  { to: "/notes", label: "Catatan", icon: FileText },
  { to: "/notifications", label: "Notifikasi", icon: Bell },
  { to: "/activity", label: "Log Aktivitas", icon: ScrollText },
  { to: "/users", label: "Pengguna", icon: Users2, adminOnly: true },
  { to: "/settings", label: "Pengaturan", icon: Settings },
];

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("flowdesk_sidebar_collapsed") === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    localStorage.setItem("flowdesk_sidebar_collapsed", collapsed ? "1" : "0");
    document.documentElement.style.setProperty("--sidebar-w-lg", collapsed ? "76px" : "260px");
  }, [collapsed]);

  const loadUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setUnread(data.unread);
    } catch {}
  }, []);

  useEffect(() => { loadUnread(); }, [loadUnread, location.pathname]);

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

  const navItems = NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  const SidebarContent = (
    <>
      <div className={cn("flex items-center gap-2.5 px-5 h-16 shrink-0", collapsed && "lg:justify-center lg:px-0")}>
        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-soft">
          <Waves className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-heading font-extrabold text-xl tracking-tight">FlowDesk</span>}
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
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
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
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
      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}>
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
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
        {/* Topbar */}
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
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {initials(user?.name)}
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
              <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-settings">
                <Settings className="h-4 w-4 mr-2" /> Pengaturan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await logout(); navigate("/login"); }} className="text-destructive" data-testid="menu-logout">
                <LogOut className="h-4 w-4 mr-2" /> Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto fade-in">{children}</main>
      </div>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 top-[20%] translate-y-0">
          <DialogTitle className="sr-only">Pencarian Global</DialogTitle>
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari di seluruh FlowDesk..."
              className="border-0 focus-visible:ring-0 h-14 text-base"
              data-testid="global-search-input"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {!results && <p className="text-sm text-muted-foreground p-6 text-center">Ketik untuk mencari tugas, rapat, pengingat, catatan, dan lampiran.</p>}
            {results && (
              <SearchResults results={results} goto={goto} />
            )}
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
