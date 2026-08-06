import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex w-full flex-col gap-5", className)}
      {...props}
    />
  );
}

function Field({ className, ...props }) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }) {
  return <Label className={className} {...props} />;
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

function FieldError({ className, ...props }) {
  return (
    <p
      role="alert"
      className={cn("text-destructive text-xs font-medium", className)}
      {...props}
    />
  );
}

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldError };
