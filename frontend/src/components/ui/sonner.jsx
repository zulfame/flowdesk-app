import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/components/theme-provider";

/**
 * Toaster — global transient feedback surface (2C.17).
 *
 * Card stays monochrome; the toast TYPE is signalled by a coloured left accent
 * bar + coloured icon using semantic feedback tokens (FD7):
 *   Sukses → --success · Gagal → --destructive · Peringatan → --warning · Info → --foreground
 * Always create toasts through `lib/notify.js` so titles stay consistent.
 */
const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:items-start group-[.toaster]:gap-3 group-[.toaster]:border-l-4 group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-sm group-[.toast]:font-semibold",
          description: "group-[.toast]:text-sm group-[.toast]:text-muted-foreground",
          icon: "group-[.toast]:mt-0.5 group-[.toast]:size-4 group-[.toast]:shrink-0",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-l-success [&_[data-icon]]:text-success",
          error:
            "group-[.toaster]:border-l-destructive [&_[data-icon]]:text-destructive",
          warning: "group-[.toaster]:border-l-warning [&_[data-icon]]:text-warning",
          info: "group-[.toaster]:border-l-foreground [&_[data-icon]]:text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
