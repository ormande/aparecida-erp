"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { authStorageKeys } from "@/hooks/use-auth";
import { WORKSPACES } from "@/lib/config";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const [workspaceId, setWorkspaceId] = useState<string>(WORKSPACES[0].id);

  useEffect(() => {
    const stored = window.localStorage.getItem(authStorageKeys.workspace);
    if (stored) {
      setWorkspaceId(stored);
    }
  }, []);

  const current = WORKSPACES.find((item) => item.id === workspaceId) ?? WORKSPACES[0];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-[270px]"
          >
            <span className="truncate">{current.name}</span>
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
              {WORKSPACES.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={workspace.name}
                  onSelect={() => {
                    setWorkspaceId(workspace.id);
                    window.localStorage.setItem(authStorageKeys.workspace, workspace.id);
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
