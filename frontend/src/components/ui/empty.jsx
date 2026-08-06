import { cn } from "@/lib/utils";

function Empty({ className, ...props }) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-6 text-center",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className,
      )}
      {...props}
    />
  );
}

function EmptyMedia({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "mb-2 flex shrink-0 items-center justify-center [&_svg]:size-6",
        variant === "icon" &&
          "bg-muted text-foreground size-10 rounded-lg",
        className,
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }) {
  return (
    <div
      className={cn("text-base font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-muted-foreground text-sm/relaxed", className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
};
