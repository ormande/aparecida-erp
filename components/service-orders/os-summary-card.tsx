"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { currency } from "@/lib/formatters";

export function OsSummaryCard({
  total,
  laborTotal,
  productsTotal,
  unitName,
  clientName,
  vehiclePlate,
  paymentTerm,
  dueDate,
  isLoading,
  disabled,
  onSubmit,
  onSubmitAndContinue,
}: {
  total: number;
  laborTotal: number;
  productsTotal: number;
  unitName: string;
  clientName: string;
  vehiclePlate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  dueDate: string;
  isLoading: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onSubmitAndContinue: () => void;
}) {
  return (
    <Card className="surface-card sticky top-24 h-fit border-none">
      <CardHeader>
        <CardTitle>Resumo da OS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl bg-muted/40 p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Mão de obra</span>
            <span>{currency(laborTotal)}</span>
          </div>
          {productsTotal > 0 ? (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Produtos</span>
              <span>{currency(productsTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>
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
        <Button
          className="w-full"
          variant="outline"
          onClick={onSubmitAndContinue}
          disabled={disabled || isLoading}
        >
          Salvar e continuar
        </Button>
      </CardContent>
    </Card>
  );
}
