import { cn } from "@/lib/utils";

function ItemGroup({ className, ...props }) {
  return (
    <div
      role="list"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function Item({ className, ...props }) {
  return (
    <div
      data-slot="item"
      className={cn(
        "flex items-center gap-3 rounded-md border p-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}

function ItemMedia({ className, ...props }) {
  return (
    <div
      className={cn(
        "text-muted-foreground flex shrink-0 items-center justify-center [&_svg]:size-5",
        className,
      )}
      {...props}
    />
  );
}

function ItemContent({ className, ...props }) {
  return (
    <div
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function ItemTitle({ className, ...props }) {
  return (
    <div
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  );
}

function ItemDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

function ItemActions({ className, ...props }) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  );
}

export {
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
};
