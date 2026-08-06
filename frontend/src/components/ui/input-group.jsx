import { cn } from "@/lib/utils";

function InputGroup({ className, ...props }) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "border-input bg-transparent shadow-xs group/input-group relative flex h-9 w-full items-center rounded-md border text-sm outline-none has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }) {
  return (
    <input
      className={cn(
        "placeholder:text-muted-foreground flex-1 bg-transparent px-3 py-1 outline-none",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({ className, align = "inline-start", ...props }) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center [&_svg]:size-4",
        align === "inline-start" ? "pl-3" : "pr-3",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }) {
  return (
    <span
      className={cn("text-muted-foreground px-3 text-sm", className)}
      {...props}
    />
  );
}

export { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText };
