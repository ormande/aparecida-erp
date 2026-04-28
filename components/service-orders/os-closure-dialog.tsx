"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ClosureRow, ClosureSelectableOrder } from "@/hooks/use-os-page";
import { currency, date } from "@/lib/formatters";

export function OsClosureDialog({
  row,
  onClose,
  onConfirm,
  availableOrders,
  selectedOrderIds,
  onToggleOrder,
  paymentTerm,
  setPaymentTerm,
  dueDate,
  setDueDate,
}: {
  row: ClosureRow | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  availableOrders: ClosureSelectableOrder[];
  selectedOrderIds: string[];
  onToggleOrder: (orderId: string) => void;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  setPaymentTerm: (value: "A_VISTA" | "A_PRAZO") => void;
  dueDate: string;
  setDueDate: (value: string) => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerar OS de fechamento</DialogTitle>
          <DialogDescription>
            O valor total mostrara tudo o que o cliente consumiu. O contas a receber levara somente o saldo ainda em aberto.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border bg-muted/20 p-4 text-sm">
              <p>
                <strong>Cliente:</strong> {row.customerName}
              </p>
              <p>
                <strong>Mes:</strong> {row.month}
              </p>
              <p>
                <strong>Total consumido:</strong> {currency(row.totalSpent)}
              </p>
              <p>
                <strong>Saldo em aberto:</strong> {currency(row.outstandingAmount)}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Selecionar OS para unificação</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-2xl border bg-muted/10 p-3">
                {availableOrders.map((order) => (
                  <label
                    key={order.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedOrderIds.includes(order.id)}
                        onCheckedChange={() => onToggleOrder(order.id)}
                      />
                      <div className="text-sm">
                        <p className="font-medium">{order.number}</p>
                        <p className="text-muted-foreground">
                          {date(order.openedAt)} - {currency(order.total)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {order.paymentStatus === "PAGO"
                        ? "Pago"
                        : order.paymentStatus === "PAGO_PARCIAL"
                          ? "Pago parcial"
                          : "Pendente"}
                    </span>
                  </label>
                ))}
                {availableOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma OS disponível para este cliente/período.</p>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={paymentTerm === "A_VISTA" ? "default" : "outline"} onClick={() => setPaymentTerm("A_VISTA")}>
                À vista
              </Button>
              <Button variant={paymentTerm === "A_PRAZO" ? "default" : "outline"} onClick={() => setPaymentTerm("A_PRAZO")}>
                À prazo
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>Vencimento</Label>
              <DatePicker
                disabled={paymentTerm !== "A_PRAZO"}
                value={dueDate}
                onChange={setDueDate}
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={selectedOrderIds.length <= 1} onClick={() => void onConfirm()}>
                Gerar fechamento
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
