"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  onSearchChange,
  searchInTrigger = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Option[];
  disabled?: boolean;
  onSearchChange?: (search: string) => void;
  searchInTrigger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState("");
  const triggerInputRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      const scrollY = window.scrollY;
      setOpen(true);
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: "instant" });
      });
    } else {
      setOpen(false);
    }
  }

  const listId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const visibleOptions = useMemo(() => {
    if (!searchInTrigger) {
      return options;
    }
    const query = triggerSearch.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchInTrigger, triggerSearch]);

  useEffect(() => {
    if (!searchInTrigger || !open) {
      return;
    }
    requestAnimationFrame(() => {
      triggerInputRef.current?.focus();
    });
  }, [open, searchInTrigger]);

  useEffect(() => {
    if (searchInTrigger) {
      onSearchChange?.(triggerSearch);
    }
  }, [onSearchChange, searchInTrigger, triggerSearch]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <div
            role="combobox"
            aria-controls={listId}
            aria-expanded={open}
            onClick={() => !disabled && handleOpenChange(true)}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-2xl border bg-background px-3 text-sm text-foreground outline-none transition-[border-color,background-color,color,box-shadow] duration-200",
              "border-border/55 hover:border-border/80 hover:bg-muted/60 dark:border-border/45 dark:hover:border-border/70",
              "focus-visible:border-[var(--color-gold)] focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/25",
              "disabled:pointer-events-none disabled:opacity-50",
              open && "border-[var(--color-gold)] shadow-[0_0_0_1px_rgba(201,168,76,0.2)]",
              !selected && "text-muted-foreground",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {searchInTrigger ? (
              <input
                ref={triggerInputRef}
                value={open ? triggerSearch : selected?.label ?? ""}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onFocus={() => !disabled && handleOpenChange(true)}
                onChange={(e) => {
                  const next = e.target.value;
                  setTriggerSearch(next);
                  if (!open) {
                    handleOpenChange(true);
                  }
                }}
                placeholder={placeholder}
                className="w-full bg-transparent pr-2 text-foreground outline-none placeholder:text-muted-foreground"
                disabled={disabled}
              />
            ) : (
              <span className="truncate">{selected?.label ?? placeholder}</span>
            )}
            <motion.span
              className="ml-2 inline-flex shrink-0"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ChevronsUpDown className="h-4 w-4 opacity-50 text-muted-foreground" />
            </motion.span>
          </div>
        }
      />
      <PopoverContent
        id={listId}
        initialFocus={false}
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
              <Command shouldFilter={!onSearchChange && !searchInTrigger}>
                {!searchInTrigger ? <CommandInput placeholder="Buscar..." onValueChange={onSearchChange} /> : null}
                <CommandList>
                  <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                  <CommandGroup>
                    {visibleOptions.map((option) => {
                      const isSelected = option.value === value;
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          className={cn(
                            "[&>svg:last-child]:hidden",
                            "cursor-pointer rounded-lg px-2 py-2 transition-colors duration-150 ease-out",
                            // hover segue o mouse
                            "hover:bg-[rgba(201,168,76,0.09)] dark:hover:bg-[rgba(201,168,76,0.15)]",
                            // estado de seleção do cmdk (teclado + mouse sobre)
                            "data-selected:bg-[rgba(201,168,76,0.16)] dark:data-selected:bg-[rgba(201,168,76,0.24)]",
                            // item atualmente selecionado no campo
                            isSelected && "bg-[rgba(201,168,76,0.12)] dark:bg-[rgba(201,168,76,0.16)] text-foreground",
                          )}
                          onSelect={() => {
                            onChange(option.value);
                            setTriggerSearch(option.label);
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
