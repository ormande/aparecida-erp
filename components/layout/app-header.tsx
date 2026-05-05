"use client";

import { LogOut, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  const pathname = usePathname();
  const [pageTitle, setPageTitle] = useState("");
  const [pageSubtitle, setPageSubtitle] = useState("");

  useEffect(() => {
    const syncHeaderMeta = () => {
      const meta = document.querySelector<HTMLElement>("[data-page-header-meta='true']");
      setPageTitle(meta?.dataset.pageTitle ?? "");
      setPageSubtitle(meta?.dataset.pageSubtitle ?? "");
    };

    syncHeaderMeta();

    const observer = new MutationObserver(syncHeaderMeta);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-page-title", "data-page-subtitle"],
    });

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:left-[240px]">
      <div className="flex min-h-20 items-start gap-3 px-4 py-4 md:px-8">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon-sm" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 border-none bg-transparent p-0" bodyClassName="p-0 gap-0">
            <AppSidebar mobile onNavigate={() => undefined} />
          </SheetContent>
        </Sheet>

        <div className="min-w-0 flex-1 pr-2">
          {pageTitle ? <p className="truncate text-2xl font-semibold tracking-tight">{pageTitle}</p> : null}
          {pageSubtitle ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{pageSubtitle}</p>
          ) : null}
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center rounded-full px-2 py-1.5 transition hover:bg-muted"
              />
            }
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-[var(--color-gold)] text-[var(--color-navy)]">
                  {user?.avatar ?? "AE"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await logout();
                  router.replace("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
