"use client";

import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ESTOQUE_ATIVO } from "@/lib/config";

export default function EstoquePage() {
  if (!ESTOQUE_ATIVO) {
    return (
      <div className="space-y-8">
        <PageHeader title="Estoque" subtitle="Módulo protegido por flag até a ativação nas configurações." />
        <EmptyState
          title="Módulo de estoque ainda não ativado"
          description="Ative nas Configurações para começar a usar controle de produtos e pneus."
          action={
            <Link
              href="/configuracoes"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Ir para Configurações
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Estoque" subtitle="Tabela de produtos com aro, medida, marca, quantidade e preço." />
    </div>
  );
}
