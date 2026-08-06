import React, { useState } from "react";
import { Check, ChevronsUpDown, UserRound, X } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACTION } from "@/constants/labels";

/** Compact user picker (h-8 control, 13px) used across task/meeting/schedule forms. */
export default function UserSelect({
  users = [],
  value,
  onChange,
  placeholder = "Pilih pengguna...",
  testid = "user-select",
}) {
  const [open, setOpen] = useState(false);

  const select = (u) => {
    onChange({
      user_id: u.id,
      name: u.name,
      department: u.department || "",
      phone: u.phone || "",
      email: u.email || "",
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-8 w-full justify-between px-2.5 text-[13px] font-normal"
          data-testid={testid}
        >
          <span className={cn("flex items-center gap-2 truncate", !value?.name && "text-muted-foreground")}>
            <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
            {value?.name || placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value?.name ? (
              <span
                role="button"
                aria-label="Hapus pilihan"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="hover:text-destructive"
                data-testid={`${testid}-clear`}
              >
                <X className="size-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={ACTION.search} data-testid={`${testid}-search`} />
          <CommandList>
            <CommandEmpty>Tidak ada pengguna.</CommandEmpty>
            <CommandGroup>
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  value={`${u.name} ${u.email} ${u.department || ""}`}
                  onSelect={() => select(u)}
                  data-testid={`${testid}-option-${u.id}`}
                >
                  <Check
                    className={cn("mr-2 size-3.5", value?.user_id === u.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.department ? `${u.department} · ` : ""}
                      {u.email}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
