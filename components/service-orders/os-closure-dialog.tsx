"use client";

import type { Ref, RefObject } from "react";

import { OsInstallmentPlanFields, type OsInstallmentPlanFieldsHandle } from "@/components/service-orders/os-installment-plan-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
  isLoadingOrders = false,
  selectedOrderIds,
  onToggleOrder,
  paymentTerm,
  setPaymentTerm,
  dueDate,
  setDueDate,
  openedAtFallback,
  installmentPlanRef,
  installmentResetKey,
}: {
  row: ClosureRow | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  availableOrders: ClosureSelectableOrder[];
  isLoadingOrders?: boolean;
  selectedOrderIds: string[];
  onToggleOrder: (orderId: string) => void;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  setPaymentTerm: (value: "A_VISTA" | "A_PRAZO") => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  openedAtFallback: string;
  installmentPlanRef: RefObject<OsInstallmentPlanFieldsHandle | null>;
  installmentResetKey: string;
}) {
  const installmentFirstDue = paymentTerm === "A_PRAZO" ? dueDate : openedAtFallback;
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
                {isLoadingOrders ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : null}
                {!isLoadingOrders
                  ? availableOrders.map((order) => (
                  <details
                    key={order.id}
                    className={`rounded-lg border bg-background ${
                      order.disabled ? "opacity-70" : ""
                    }`}
                    open
                  >
                    <summary className="cursor-pointer list-none px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">
                          <p className="font-medium">{order.number}</p>
                          <p className="text-muted-foreground">
                            {date(order.openedAt)} - {currency(order.total)}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {order.paymentStatus === "PAGO"
                            ? "Pago"
                            : order.paymentStatus === "PAGO_PARCIAL"
                              ? "Pago parcial"
                              : "Pendente"}
                        </span>
                      </div>
                    </summary>
                    <div className="space-y-2 border-t px-2 py-2">
                      {order.selectionOptions.map((option) => (
                        <label
                          key={option.key}
                          className={`flex items-center justify-between gap-3 rounded-md border px-2 py-2 ${
                            option.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                          }`}
                          title={option.disabled ? option.disabledReason : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedOrderIds.includes(option.key)}
                              disabled={option.disabled}
                              onCheckedChange={() => onToggleOrder(option.key)}
                            />
                            <div className="text-sm">
                              <p className="font-medium">{option.label}</p>
                              <p className="text-muted-foreground">
                                Vencimento: {date(option.dueDate)} - {currency(option.amount)}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </details>
                    ))
                  : null}
                {!isLoadingOrders && availableOrders.length === 0 ? (
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
            {row.totalSpent > 0 ? (
              <OsInstallmentPlanFields
                ref={installmentPlanRef as Ref<OsInstallmentPlanFieldsHandle>}
                totalAmount={row.totalSpent}
                firstDueDate={installmentFirstDue}
                openedAtFallback={openedAtFallback}
                initialStoredPlan={null}
                resetKey={`closure-${installmentResetKey}`}
              />
            ) : null}
            <div className="flex justify-end">
              <Button
                disabled={isLoadingOrders || selectedOrderIds.length <= 1}
                title={selectedOrderIds.length <= 1 ? "Selecione ao menos duas OS elegíveis para gerar o fechamento." : undefined}
                onClick={() => void onConfirm()}
              >
                Gerar fechamento
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
