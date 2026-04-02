"use client";

import { Check, ChevronsUpDown } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUnits } from "@/hooks/use-units";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export function WorkspaceSwitcher() {
  const { data: session, update } = useSession();
  const { units, isLoading } = useUnits();

  const activeRaw = session?.activeUnitId ?? session?.user?.activeUnitId;
  const workspaceId = activeRaw === undefined || activeRaw === null ? "" : activeRaw;

  const current = workspaceId === "" ? null : units.find((item) => item.id === workspaceId) ?? null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-[270px]"
          >
            <span className="truncate">
              {isLoading
                ? "Carregando unidades..."
                : workspaceId === ""
                  ? "Visão geral"
                  : current?.name ?? "Unidade"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </button>
        }
      />
      <PopoverContent className="w-[270px] p-0">
        <Command>
          <CommandInput placeholder="Buscar unidade..." />
          <CommandList>
            <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Visão geral"
                onSelect={() => {
                  void update({ activeUnitId: "" });
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", workspaceId === "" ? "opacity-100" : "opacity-0")}
                />
                Visão geral
              </CommandItem>
              {units.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => {
                    void update({ activeUnitId: workspace.id });
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      workspace.id === workspaceId ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {workspace.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
