"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnits } from "@/hooks/use-units";
import { cn } from "@/lib/utils";

const popoverMotionTransition = { duration: 0.15, ease: "easeOut" as const };

export function WorkspaceSwitcher() {
  const { data: session, update } = useSession();
  const { units, isLoading } = useUnits();
  const [open, setOpen] = useState(false);

  const activeRaw = session?.activeUnitId ?? session?.user?.activeUnitId;
  const workspaceId = activeRaw === undefined || activeRaw === null ? "" : activeRaw;

  const current = workspaceId === "" ? null : units.find((item) => item.id === workspaceId) ?? null;

  const label =
    isLoading
      ? "Carregando unidades..."
      : workspaceId === ""
        ? "Visão geral"
        : current?.name ?? "Unidade";

  if (!isLoading && units.length <= 1) {
    return (
      <div
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-full border border-border/55 bg-background px-3 text-sm font-medium text-foreground shadow-sm",
          "dark:border-border/45",
          "md:w-[220px] md:min-w-0",
        )}
        aria-live="polite"
      >
        <Building2 className="h-4 w-4 shrink-0 text-[var(--color-gold)] opacity-90" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-full border bg-background px-3 text-sm font-medium text-foreground shadow-sm",
              "border-border/55 transition-[border-color,background-color,box-shadow] duration-200",
              "hover:border-border/80 hover:bg-muted/60 dark:border-border/45 dark:hover:border-border/70",
              "focus-visible:border-[var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/25",
              "md:w-[220px] md:min-w-0",
              open && "border-[var(--color-gold)] shadow-[0_0_0_1px_rgba(201,168,76,0.2)]",
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-[var(--color-gold)] opacity-90" aria-hidden />
              <span className="truncate">{label}</span>
            </span>
            <motion.span
              className="inline-flex shrink-0"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ChevronsUpDown className="h-4 w-4 opacity-50 text-muted-foreground" />
            </motion.span>
          </button>
        }
      />
      <PopoverContent
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
              key="workspace-switcher-panel"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={popoverMotionTransition}
              className="flex flex-col"
            >
              <Command>
                <CommandInput placeholder="Buscar..." />
                <CommandList>
                  <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="Visão geral"
                      className={cn(
                        "[&>svg:last-child]:hidden",
                        "cursor-pointer rounded-lg px-2 py-2 transition-colors duration-150 ease-out",
                        "data-[selected=true]:bg-muted/80 aria-selected:bg-transparent",
                        workspaceId === "" &&
                          "bg-[rgba(201,168,76,0.12)] dark:bg-[rgba(201,168,76,0.14)]",
                        workspaceId !== "" && "hover:bg-muted/50",
                      )}
                      onSelect={() => {
                        void update({ activeUnitId: "" });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0 transition-opacity duration-150",
                          workspaceId === ""
                            ? "text-[var(--color-gold)] opacity-100"
                            : "opacity-0",
                        )}
                      />
                      Visão geral
                    </CommandItem>
                    {units.map((workspace) => {
                      const isSelected = workspace.id === workspaceId;
                      return (
                        <CommandItem
                          key={workspace.id}
                          value={workspace.name}
                          className={cn(
                            "[&>svg:last-child]:hidden",
                            "cursor-pointer rounded-lg px-2 py-2 transition-colors duration-150 ease-out",
                            "data-[selected=true]:bg-muted/80 aria-selected:bg-transparent",
                            isSelected && "bg-[rgba(201,168,76,0.12)] dark:bg-[rgba(201,168,76,0.14)]",
                            !isSelected && "hover:bg-muted/50",
                          )}
                          onSelect={() => {
                            void update({ activeUnitId: workspace.id });
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0 transition-opacity duration-150",
                              isSelected ? "text-[var(--color-gold)] opacity-100" : "opacity-0",
                            )}
                          />
                          {workspace.name}
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
