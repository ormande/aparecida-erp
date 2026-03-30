"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authEvents, authStorageKeys } from "@/hooks/use-auth";
import { useUnits } from "@/hooks/use-units";
import { cn } from "@/lib/utils";

const GENERAL_WORKSPACE = "__general__";

export function WorkspaceSwitcher() {
  const { units, isLoading } = useUnits();
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    const stored = window.localStorage.getItem(authStorageKeys.workspace);
    if (stored !== null) {
      setWorkspaceId(stored);
    }
  }, []);

  useEffect(() => {
    function handleWorkspaceChanged() {
      const stored = window.localStorage.getItem(authStorageKeys.workspace);
      if (stored !== null) {
        setWorkspaceId(stored);
      }
    }

    window.addEventListener(authEvents.workspaceChanged, handleWorkspaceChanged);
    return () => {
      window.removeEventListener(authEvents.workspaceChanged, handleWorkspaceChanged);
    };
  }, []);

  useEffect(() => {
    if (!units.length) {
      return;
    }

    const hasCurrent = workspaceId === GENERAL_WORKSPACE || units.some((unit) => unit.id === workspaceId);
    const fallbackId = hasCurrent ? workspaceId : units[0].id;

    setWorkspaceId(fallbackId);
    window.localStorage.setItem(authStorageKeys.workspace, fallbackId);
  }, [units, workspaceId]);

  const current = workspaceId === GENERAL_WORKSPACE ? null : units.find((item) => item.id === workspaceId) ?? units[0];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-[270px]"
          >
            <span className="truncate">
              {isLoading ? "Carregando unidades..." : current?.name ?? "Visão geral"}
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
                  setWorkspaceId(GENERAL_WORKSPACE);
                  window.localStorage.setItem(authStorageKeys.workspace, GENERAL_WORKSPACE);
                  window.dispatchEvent(new Event(authEvents.workspaceChanged));
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    workspaceId === GENERAL_WORKSPACE ? "opacity-100" : "opacity-0",
                  )}
                />
                Visão geral
              </CommandItem>
              {units.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => {
                    setWorkspaceId(workspace.id);
                    window.localStorage.setItem(authStorageKeys.workspace, workspace.id);
                    window.dispatchEvent(new Event(authEvents.workspaceChanged));
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
