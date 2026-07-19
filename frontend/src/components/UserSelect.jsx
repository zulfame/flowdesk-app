import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UserSelect({ users = [], value, onChange, placeholder = "Pilih pengguna...", testid = "user-select" }) {
  const [open, setOpen] = useState(false);

  const select = (u) => {
    onChange({ user_id: u.id, name: u.name, department: u.department || "", phone: u.phone || "", email: u.email || "" });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between rounded-xl font-normal h-11"
          data-testid={testid}
        >
          <span className={cn("flex items-center gap-2 truncate", !value?.name && "text-muted-foreground")}>
            <UserRound className="h-4 w-4 shrink-0" />
            {value?.name || placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {value?.name && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                className="hover:text-destructive"
                data-testid={`${testid}-clear`}
              >
                <X className="h-4 w-4" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari nama / email..." data-testid={`${testid}-search`} />
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
                  <Check className={cn("mr-2 h-4 w-4", value?.user_id === u.id ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.department ? `${u.department} · ` : ""}{u.email}</p>
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
