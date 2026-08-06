import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function NativeSelect({ className, children, ...props }) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "border-input shadow-xs flex h-[var(--ctl-h)] w-full appearance-none rounded-md border bg-transparent px-3 py-1 pr-8 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 opacity-50"
        aria-hidden="true"
      />
    </div>
  );
}

export { NativeSelect };
