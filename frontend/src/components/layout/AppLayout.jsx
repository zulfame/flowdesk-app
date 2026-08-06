import React, { Fragment } from "react";
import { useLocation } from "react-router-dom";

import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { ModeToggle } from "@/components/mode-toggle";
import { getBreadcrumb } from "@/config/navigation";

/**
 * AppLayout — application shell (R34).
 * Sidebar (collapse-to-icon) + fixed header (trigger + breadcrumb + actions).
 * Only the content region scrolls; the shell is locked to `h-svh`.
 * Density is permanently Compact (FD1) — no density switcher in the header.
 */
export default function AppLayout({ children }) {
  const location = useLocation();
  const { trail } = getBreadcrumb(location.pathname);

  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        {/* h-[65px] matches the sidebar header (64px + 1px border) so both
            bottom borders form one continuous line. */}
        <header className="flex h-[65px] shrink-0 items-center gap-2 border-b border-border bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {trail.map((label, index) => {
                const isLast = index === trail.length - 1;
                return (
                  <Fragment key={`${label}-${index}`}>
                    <BreadcrumbItem className={isLast ? undefined : "hidden md:block"}>
                      {isLast ? (
                        <BreadcrumbPage>{label}</BreadcrumbPage>
                      ) : (
                        <span className="text-muted-foreground">{label}</span>
                      )}
                    </BreadcrumbItem>
                    {isLast ? null : (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <ModeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
