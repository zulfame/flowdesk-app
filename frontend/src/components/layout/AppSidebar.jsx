import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, LogOut, UserRound, Waves } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DEFAULT_AREA_ID,
  areaIdOf,
  firstRouteOf,
  getArea,
  getAreas,
} from "@/config/navigation";
import { useBranding } from "@/context/BrandingContext";
import { useAuth } from "@/context/AuthContext";
import { LOGOUT } from "@/constants/testIds/auth";

const AREA_KEY = "flowdesk.activeArea";

/** Avatar initials from a user's name or email. */
const initialsOf = (name, email) =>
  ((name || email || "U").trim().slice(0, 1) || "U").toUpperCase();

/**
 * AppSidebar
 * shadcn sidebar system (collapse-to-icon) with:
 *  - header: brand lockup + AREA switcher (Member Area / Administrator),
 *  - content: nav groups of the active area (from `config/navigation.js`),
 *  - footer: user dropdown (Profil, Keluar).
 */
export const AppSidebar = (props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { branding } = useBranding();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";
  const areas = getAreas(isAdmin);

  const [areaId, setAreaId] = useState(
    () => window.localStorage.getItem(AREA_KEY) || DEFAULT_AREA_ID
  );

  // Keep the switcher in sync with the route the user is actually on.
  useEffect(() => {
    const routeArea = areaIdOf(location.pathname);
    if (routeArea === "admin" && !isAdmin) return;
    setAreaId(routeArea);
  }, [location.pathname, isAdmin]);

  const activeArea = getArea(areaId, isAdmin);

  const changeArea = (nextId) => {
    setAreaId(nextId);
    window.localStorage.setItem(AREA_KEY, nextId);
    const target = firstRouteOf(getArea(nextId, isAdmin));
    if (target && target !== location.pathname) navigate(target);
  };

  const appName = branding?.app_name || "FlowDesk";
  const logoUrl = branding?.logo || "";

  const currentUser = {
    name: user?.name || "Pengguna",
    email: user?.email || "",
    initials: initialsOf(user?.name, user?.email),
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (to, end) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="sticky top-0 z-10 border-b border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-testid="area-switcher-trigger"
                >
                  {logoUrl ? (
                    <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg border">
                      <img src={logoUrl} alt="" className="size-8 object-contain" />
                    </div>
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Waves className="size-4" aria-hidden="true" />
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{appName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {activeArea?.label}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Area
                </DropdownMenuLabel>
                {areas.map((area) => {
                  const AreaIcon = area.icon;
                  return (
                    <DropdownMenuItem
                      key={area.id}
                      onClick={() => changeArea(area.id)}
                      className="gap-2"
                      data-testid={`area-option-${area.id}`}
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border">
                        <AreaIcon className="size-3.5 shrink-0" aria-hidden="true" />
                      </div>
                      <div className="grid flex-1 leading-tight">
                        <span className="truncate font-medium">{area.label}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {area.description}
                        </span>
                      </div>
                      {area.id === activeArea?.id ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : null}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {activeArea?.sections?.length ? (
          activeArea.sections.map((section) => (
            <SidebarGroup key={`${activeArea.id}-${section.label}`}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarMenu>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.to, item.end)}
                        tooltip={item.title}
                      >
                        <Link
                          to={item.to}
                          data-testid={`nav-${item.to === "/" ? "dashboard" : item.to.slice(1)}`}
                        >
                          {Icon ? <Icon aria-hidden="true" /> : null}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <p
              className="px-2 text-xs leading-relaxed text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
              data-testid="area-empty-note"
            >
              Menu area ini ditambahkan bertahap sesuai proses migrasi tampilan.
            </p>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="border border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  data-testid="user-menu-trigger"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {currentUser.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{currentUser.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {currentUser.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-xs">
                        {currentUser.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{currentUser.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild data-testid="user-menu-profile">
                  <Link to="/profile">
                    <UserRound aria-hidden="true" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid={LOGOUT.button}>
                  <LogOut aria-hidden="true" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
