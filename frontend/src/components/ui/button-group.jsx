import { cn } from "@/lib/utils";

function ButtonGroup({ className, orientation = "horizontal", ...props }) {
  return (
    <div
      role="group"
      data-orientation={orientation}
      className={cn(
        "flex w-fit items-stretch [&>*]:focus-visible:z-10",
        orientation === "horizontal"
          ? "[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none"
          : "flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupText({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-muted text-muted-foreground flex items-center rounded-md border px-3 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupText };
