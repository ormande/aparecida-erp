"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BarChart2,
  Boxes,
  Car,
  CarFront,
  ClipboardList,
  Gauge,
  HardHat,
  LogOut,
  Package,
  Settings,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { ESTOQUE_ATIVO } from "@/lib/config";
import { isFirstSevenDaysOfMonth } from "@/lib/report-dates";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

type NavChild = { href: string; label: string; icon: LucideIcon };
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavChild[];
};

const baseItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  {
    href: "/cadastros",
    label: "Cadastros",
    icon: Users,
    children: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/produtos", label: "Produtos", icon: Package },
      { href: "/veiculos", label: "Veículos", icon: Car },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/funcionarios", label: "Funcionários", icon: HardHat },
      { href: "/servicos", label: "Serviços", icon: Wrench },
    ],
  },
  { href: "/veiculos", label: "Veículos", icon: CarFront },
  {
    href: "/ordens-de-servico",
    label: "Ordens de Serviço",
    icon: Wrench,
    children: [
      { href: "/ordens-de-servico", label: "Ordens normais", icon: Wrench },
      { href: "/ordens-de-servico/fechamentos", label: "Fechamentos", icon: Package },
    ],
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: BadgeDollarSign,
    children: [
      { href: "/financeiro/receber", label: "Contas a Receber", icon: Package },
      { href: "/financeiro/pagar", label: "Contas a Pagar", icon: Package },
      { href: "/financeiro/fluxo", label: "Fluxo de Caixa", icon: Package },
      { href: "/financeiro/historico", label: "Histórico", icon: Package },
    ],
  },
  ...(ESTOQUE_ATIVO ? [{ href: "/estoque", label: "Estoque", icon: Boxes } satisfies NavItem] : []),
  { href: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { href: "/auditoria", label: "Auditoria", icon: ClipboardList },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

function currentYearMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function AppSidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [relatoriosDotHidden, setRelatoriosDotHidden] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const ym = currentYearMonthKey();
    setRelatoriosDotHidden(window.localStorage.getItem(`relatorios-visited-${ym}`) === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (pathname === "/relatorios" || pathname.startsWith("/relatorios/")) {
      const ym = currentYearMonthKey();
      window.localStorage.setItem(`relatorios-visited-${ym}`, "true");
      setRelatoriosDotHidden(true);
    }
  }, [pathname]);

  const showRelatoriosDot =
    relatoriosDotHidden === false &&
    isFirstSevenDaysOfMonth() &&
    user?.accessLevel === "PROPRIETARIO";

  const items = useMemo((): NavItem[] => {
    const level = user?.accessLevel;
    const isFuncionario = level === "FUNCIONARIO";
    const hideAuditAndSettings = level === "GESTOR" || level === "FUNCIONARIO";

    return baseItems
      .filter((item) => {
        if (item.href === "/financeiro" && isFuncionario) {
          return false;
        }
        if (item.href === "/relatorios" && isFuncionario) {
          return false;
        }
        if (item.href === "/auditoria" && hideAuditAndSettings) {
          return false;
        }
        if (item.href === "/configuracoes" && hideAuditAndSettings) {
          return false;
        }
        return true;
      })
      .map((item) => {
        if (item.href === "/cadastros" && item.children && isFuncionario) {
          return {
            ...item,
            children: item.children.filter(
              (c) => c.href !== "/fornecedores" && c.href !== "/funcionarios" && c.href !== "/servicos",
            ),
          };
        }
        if (item.href === "/ordens-de-servico" && item.children && isFuncionario) {
          return {
            ...item,
            children: item.children.filter((c) => c.href !== "/ordens-de-servico/fechamentos"),
          };
        }
        return item;
      });
  }, [user?.accessLevel]);

  async function handleLogout() {
    await logout();
    onNavigate?.();
    router.replace("/login");
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border px-5">
        <NsaLogo compact />
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 py-5">
        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              (item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`)) ?? false);

            return (
              <div key={item.href} className="space-y-2">
                <Link
                  href={item.children?.length ? item.children[0].href : item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-[rgba(240,244,248,0.76)] hover:bg-sidebar-accent hover:text-white",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <span className="flex flex-1 items-center gap-2">
                    <span>{item.label}</span>
                    {item.href === "/relatorios" && showRelatoriosDot ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </Link>

                {item.children?.length ? (
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-4">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive =
                        pathname === child.href || (child.href !== item.href && pathname.startsWith(`${child.href}/`));

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                            childActive
                              ? "bg-[rgba(201,168,76,0.18)] text-white"
                              : "text-[rgba(240,244,248,0.68)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white",
                          )}
                        >
                          <ChildIcon className="h-3.5 w-3.5" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="space-y-3 border-t border-sidebar-border px-5 py-4">
        <Button
          variant="outline"
          className="w-full justify-center border-white/12 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
        <p className="text-center text-[13px] leading-relaxed text-[rgba(240,244,248,0.68)]">
          Borracharia Nossa Senhora Aparecida
        </p>
      </div>
    </aside>
  );
}
