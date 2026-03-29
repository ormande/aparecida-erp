"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";

export function AppHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:left-[240px]">
      <div className="flex h-20 items-center gap-3 px-4 md:px-8">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 border-none bg-transparent p-0">
            <AppSidebar mobile onNavigate={() => undefined} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1">
          <WorkspaceSwitcher />
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-auto rounded-full px-2 py-1.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-[var(--color-gold)] text-[var(--color-navy)]">
                      {user?.avatar ?? "MA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                </div>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Conta demo</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
