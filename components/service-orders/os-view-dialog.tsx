"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrderDetails } from "@/hooks/use-os-page";
import { currency } from "@/lib/formatters";

export function OsViewDialog({ order, onClose }: { order: OrderDetails | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{order?.number}</DialogTitle>
          <DialogDescription>Visualização da OS preenchida.</DialogDescription>
        </DialogHeader>
        {order ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Unidade</span>
                <p>{order.unitName ?? "-"}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Cliente</span>
                <p>{order.clientName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Veículo</span>
                <p>{order.vehicleLabel}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Pagamento</span>
                <p>{order.paymentTerm === "A_PRAZO" ? "A prazo" : "A vista"}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">Serviços</p>
              <div className="mt-3 space-y-2">
                {order.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <span>{service.description}</span>
                    <span>{currency(service.laborPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">Observações</p>
              <p className="mt-2 text-sm text-muted-foreground">{order.notes || "Sem observações."}</p>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
