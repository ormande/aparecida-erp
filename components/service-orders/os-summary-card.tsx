"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency } from "@/lib/formatters";

export function OsSummaryCard({
  total,
  unitName,
  clientName,
  vehiclePlate,
  paymentTerm,
  dueDate,
  isLoading,
  disabled,
  onSubmit,
}: {
  total: number;
  unitName: string;
  clientName: string;
  vehiclePlate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  dueDate: string;
  isLoading: boolean;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <Card className="surface-card sticky top-24 h-fit border-none">
      <CardHeader>
        <CardTitle>Resumo da OS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">Valor total calculado</p>
          <p className="mt-2 text-3xl font-semibold">{currency(total)}</p>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Unidade: {unitName}</p>
          <p>Cliente: {clientName}</p>
          <p>Veículo: {vehiclePlate}</p>
          <p>Pagamento: {paymentTerm === "A_VISTA" ? "À vista" : "A prazo"}</p>
          <p>Vencimento: {paymentTerm === "A_PRAZO" ? dueDate || "-" : "Pagamento imediato"}</p>
        </div>
        <Button className="w-full" onClick={onSubmit} disabled={disabled || isLoading}>
          Abrir OS
        </Button>
      </CardContent>
    </Card>
  );
}
