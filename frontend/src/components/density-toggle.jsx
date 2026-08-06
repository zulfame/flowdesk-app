import React from "react";
import { ChevronDown, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDensity } from "@/components/density-provider";

const OPTIONS = [
  { value: "dense", label: "Rapat" },
  { value: "comfortable", label: "Lega" },
];

/** DensityToggle — kerapatan UI global (Rapat / Lega). */
export function DensityToggle() {
  const { density, setDensity } = useDensity();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="density-toggle-trigger"
          aria-label="Ubah kerapatan"
        >
          <Rows3 className="size-4" /> Kerapatan
          <ChevronDown className="size-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Kerapatan UI</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={density} onValueChange={setDensity}>
          {OPTIONS.map(({ value, label }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              data-testid={`density-option-${value}`}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
