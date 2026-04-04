"use client";

import { AnimatePresence, motion } from "framer-motion";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const popoverMotionTransition = { duration: 0.15, ease: "easeOut" as const };

function parseIsoLocal(iso: string): Date | undefined {
  const d = parse(iso, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecione uma data",
  disabled = false,
  minDate,
  maxDate,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  const selected = useMemo(() => (value ? parseIsoLocal(value) : undefined), [value]);

  const label = useMemo(() => {
    if (!selected) return null;
    return format(selected, "dd/MM/yyyy", { locale: ptBR });
  }, [selected]);

  const fromDate = useMemo(() => (minDate ? parseIsoLocal(minDate) : undefined), [minDate]);
  const toDate = useMemo(() => (maxDate ? parseIsoLocal(maxDate) : undefined), [maxDate]);

  const startMonth = useMemo(() => {
    if (fromDate) return new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    return new Date(1900, 0, 1);
  }, [fromDate]);

  const endMonth = useMemo(() => {
    if (toDate) return new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    return new Date(new Date().getFullYear() + 15, 11, 1);
  }, [toDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-expanded={open}
            aria-controls={contentId}
            disabled={disabled}
            className={cn(
              "flex h-9 w-full items-center justify-start gap-2 rounded-2xl border bg-background px-3 text-left text-sm text-foreground outline-none transition-[border-color,background-color,color,box-shadow] duration-200",
              "border-border/55 hover:border-border/80 hover:bg-muted/60 dark:border-border/45 dark:hover:border-border/70",
              "focus-visible:border-[var(--color-gold)] focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/25",
              "disabled:pointer-events-none disabled:opacity-50",
              open && "border-[var(--color-gold)] shadow-[0_0_0_1px_rgba(201,168,76,0.2)]",
              !label && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60 text-muted-foreground" aria-hidden />
            <span className="truncate">{label ?? placeholder}</span>
          </button>
        }
      />
      <PopoverContent
        id={contentId}
        initialFocus={false}
        className={cn(
          "w-auto max-w-[min(100vw-2rem,var(--available-width,100vw))] overflow-hidden rounded-2xl border border-border/50 bg-popover p-0 text-popover-foreground shadow-lg",
          "ring-1 ring-border/15 dark:ring-border/30 outline-none !gap-0",
          "data-open:animate-none data-closed:animate-none duration-0",
          "data-[side=bottom]:slide-in-from-top-0 data-[side=top]:slide-in-from-bottom-0",
        )}
        align="start"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="date-picker-panel"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={popoverMotionTransition}
              className="flex flex-col p-0"
            >
              <Calendar
                mode="single"
                locale={ptBR}
                captionLayout="dropdown"
                startMonth={startMonth}
                endMonth={endMonth}
                formatters={{
                  formatMonthDropdown: (date) => format(date, "MMMM", { locale: ptBR }),
                }}
                selected={selected}
                onSelect={(date) => {
                  if (date) {
                    onChange(format(date, "yyyy-MM-dd"));
                    setOpen(false);
                  }
                }}
                fromDate={fromDate}
                toDate={toDate}
                defaultMonth={selected}
                autoFocus={false}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
