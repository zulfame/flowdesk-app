import { cn } from "@/lib/utils";

function TypographyH1({ className, ...props }) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH2({ className, ...props }) {
  return (
    <h2
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function TypographyH3({ className, ...props }) {
  return (
    <h3
      className={cn("scroll-m-20 text-base font-semibold", className)}
      {...props}
    />
  );
}

function TypographyP({ className, ...props }) {
  return <p className={cn("text-sm leading-relaxed", className)} {...props} />;
}

function TypographyLead({ className, ...props }) {
  return (
    <p className={cn("text-muted-foreground text-base", className)} {...props} />
  );
}

function TypographyMuted({ className, ...props }) {
  return (
    <p className={cn("text-muted-foreground text-xs", className)} {...props} />
  );
}

function TypographyInlineCode({ className, ...props }) {
  return (
    <code
      className={cn(
        "bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyP,
  TypographyLead,
  TypographyMuted,
  TypographyInlineCode,
};
