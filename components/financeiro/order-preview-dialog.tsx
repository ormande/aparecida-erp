"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderPreview } from "@/hooks/use-receivables-page";
import { currency, date } from "@/lib/formatters";

export function OrderPreviewDialog({
  orderPreview,
  onClose,
  onRefresh,
}: {
  orderPreview: OrderPreview | null;
  onClose: () => void;
  onRefresh: (id: string) => void;
}) {
  return (
    <Dialog open={Boolean(orderPreview)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{orderPreview?.number}</DialogTitle>
          <DialogDescription>Visualização da OS vinculada a este recebível.</DialogDescription>
        </DialogHeader>
        {orderPreview ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Cliente</span>
                <p>{orderPreview.clientName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Abertura</span>
                <p>{date(orderPreview.openedAt)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Vencimento</span>
                <p>{orderPreview.paymentTerm === "A_PRAZO" && orderPreview.dueDate ? date(orderPreview.dueDate) : "À vista"}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">Serviços</p>
              <div className="mt-3 space-y-2">
                {orderPreview.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <span>{service.description}</span>
                    <span>{currency(service.laborPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
              <div>
                <p className="font-medium">Total da OS</p>
                <p className="text-sm text-muted-foreground">{orderPreview.paymentMethod || "Sem forma informada"}</p>
              </div>
              <p className="text-xl font-semibold">{currency(orderPreview.total)}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => onRefresh(orderPreview.id)}>Atualizar</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
