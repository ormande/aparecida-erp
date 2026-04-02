"use client";

import { Card, CardContent } from "@/components/ui/card";
import { currency } from "@/lib/formatters";

export function ReceivablesSummaryCards({
  totalPendente,
  totalVencido,
  totalRecebidoMes,
}: {
  totalPendente: number;
  totalVencido: number;
  totalRecebidoMes: number;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card className="surface-card border-none">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total pendente</p>
          <p className="mt-3 text-3xl font-semibold">{currency(totalPendente)}</p>
        </CardContent>
      </Card>
      <Card className="surface-card border-none">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total vencido</p>
          <p className="mt-3 text-3xl font-semibold">{currency(totalVencido)}</p>
        </CardContent>
      </Card>
      <Card className="surface-card border-none">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total recebido no mês</p>
          <p className="mt-3 text-3xl font-semibold">{currency(totalRecebidoMes)}</p>
        </CardContent>
      </Card>
    </section>
  );
}
