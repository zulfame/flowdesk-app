import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Reusable single Date Picker (composite of Popover + Calendar).
 * Controlled: pass `value` (Date) and `onChange`. Full-width by default.
 * Dependency: `react-day-picker` (via `ui/calendar`) — lihat 2C.24.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  "data-testid": testid,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          data-testid={testid}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value ? value.toLocaleDateString() : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
