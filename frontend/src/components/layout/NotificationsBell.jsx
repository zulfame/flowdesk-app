import React from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

/**
 * NotificationsBell — header entry point for notifications.
 * Placeholder while the notification module is being migrated to the design
 * system; the popover shell is already final so only the list needs wiring.
 */
export function NotificationsBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Notifikasi"
          data-testid="notifications-bell"
        >
          <Bell className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3">
          <p className="text-sm font-semibold">Notifikasi</p>
        </div>
        <Separator />
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada notifikasi.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Modul notifikasi diaktifkan pada fase migrasi berikutnya.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
