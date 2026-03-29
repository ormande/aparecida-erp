"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label: string;
};

export function SearchableSelect({
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            role="combobox"
            aria-controls={listId}
            aria-expanded={open}
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm transition-colors outline-none",
              "hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:opacity-50",
              !selected && "text-muted-foreground",
            )}
            disabled={disabled}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        }
      />
      <PopoverContent id={listId} className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", option.value === value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
