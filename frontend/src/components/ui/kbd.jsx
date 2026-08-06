import { cn } from "@/lib/utils";

function KbdGroup({ className, ...props }) {
  return (
    <kbd
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  );
}

function Kbd({ className, ...props }) {
  return (
    <kbd
      className={cn(
        "bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
