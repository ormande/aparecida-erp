"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Option = {
  value: string;
  label: string;
};

const popoverMotionTransition = { duration: 0.15, ease: "easeOut" as const };

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
              "flex h-9 w-full items-center justify-between rounded-2xl border bg-background px-3 text-sm text-foreground outline-none transition-[border-color,background-color,color,box-shadow] duration-200",
              "border-border/55 hover:border-border/80 hover:bg-muted/60 dark:border-border/45 dark:hover:border-border/70",
              "focus-visible:border-[var(--color-gold)] focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/25",
              "disabled:pointer-events-none disabled:opacity-50",
              open && "border-[var(--color-gold)] shadow-[0_0_0_1px_rgba(201,168,76,0.2)]",
              !selected && "text-muted-foreground",
            )}
            disabled={disabled}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <motion.span
              className="ml-2 inline-flex shrink-0"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ChevronsUpDown className="h-4 w-4 opacity-50 text-muted-foreground" />
            </motion.span>
          </button>
        }
      />
      <PopoverContent
        id={listId}
        className={cn(
          "w-(--anchor-width) max-w-[min(100vw-2rem,var(--available-width,100vw))] overflow-hidden rounded-2xl border border-border/50 bg-popover p-0 text-popover-foreground shadow-lg",
          "ring-1 ring-border/15 dark:ring-border/30 outline-none !gap-0",
          "data-open:animate-none data-closed:animate-none duration-0",
          "data-[side=bottom]:slide-in-from-top-0 data-[side=top]:slide-in-from-bottom-0",
        )}
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="searchable-select-panel"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={popoverMotionTransition}
              className="flex flex-col"
            >
              <Command>
                <CommandInput placeholder="Buscar..." />
                <CommandList>
                  <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => {
                      const isSelected = option.value === value;
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          className={cn(
                            "[&>svg:last-child]:hidden",
                            "cursor-pointer rounded-lg px-2 py-2 transition-colors duration-150 ease-out",
                            "data-[selected=true]:bg-muted/80",
                            "aria-selected:bg-transparent",
                            isSelected && "bg-[rgba(201,168,76,0.12)] text-foreground dark:bg-[rgba(201,168,76,0.14)]",
                            !isSelected && "hover:bg-muted/50",
                          )}
                          onSelect={() => {
                            onChange(option.value);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0 transition-opacity duration-150",
                              isSelected ? "text-[var(--color-gold)] opacity-100" : "opacity-0",
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
