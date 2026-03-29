"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  Boxes,
  CarFront,
  Gauge,
  HardHat,
  Package,
  Settings,
  Truck,
  Users,
  Wrench,
} from "lucide-react";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ESTOQUE_ATIVO } from "@/lib/config";
import { cn } from "@/lib/utils";

type SidebarProps = {
  mobile?: boolean;
  onNavigate?: () => void;
};

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  {
    href: "/cadastros",
    label: "Cadastros",
    icon: Users,
    children: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/funcionarios", label: "Funcionários", icon: HardHat },
    ],
  },
  { href: "/veiculos", label: "Veículos", icon: CarFront },
  { href: "/ordens-de-servico", label: "Ordens de Serviço", icon: Wrench },
  {
    href: "/financeiro",
    label: "Financeiro",
    icon: BadgeDollarSign,
    children: [
      { href: "/financeiro/receber", label: "Contas a Receber", icon: Package },
      { href: "/financeiro/pagar", label: "Contas a Pagar", icon: Package },
      { href: "/financeiro/fluxo", label: "Fluxo de Caixa", icon: Package },
    ],
  },
  ...(ESTOQUE_ATIVO ? [{ href: "/estoque", label: "Estoque", icon: Boxes }] : []),
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <NsaLogo compact className="justify-center" />
      </div>

      <ScrollArea className="flex-1 px-3 py-5">
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
                  href={item.children ? item.children[0].href : item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-[rgba(240,244,248,0.76)] hover:bg-sidebar-accent hover:text-white",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <span>{item.label}</span>
                </Link>

                {item.children ? (
                  <div className="ml-4 space-y-1 border-l border-sidebar-border pl-4">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = pathname === child.href || pathname.startsWith(`${child.href}/`);

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

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-center text-[13px] leading-relaxed text-[rgba(240,244,248,0.68)]">
          Borracharia Nossa Senhora Aparecida
        </p>
      </div>
    </aside>
  );
}
