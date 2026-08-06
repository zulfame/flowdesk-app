import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * PasswordInput — Input with a standardized show/hide eye toggle.
 * Composes Input + Button (ghost icon). Forwards ref & spreads props to the
 * underlying Input so it works with react-hook-form. autoComplete inherits the
 * Input default ("off"); pass a semantic value (e.g. "current-password") to override.
 */
const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
  const [show, setShow] = React.useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
        ref={ref}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => setShow((prev) => !prev)}
        aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        data-testid="password-toggle"
      >
        {show ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
