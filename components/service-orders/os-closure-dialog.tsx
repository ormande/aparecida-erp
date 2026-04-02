"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClosureRow } from "@/hooks/use-os-page";
import { currency } from "@/lib/formatters";

export function OsClosureDialog({
  row,
  onClose,
  onConfirm,
  paymentTerm,
  setPaymentTerm,
  dueDate,
  setDueDate,
}: {
  row: ClosureRow | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
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
            <div className="flex gap-2">
              <Button variant={paymentTerm === "A_VISTA" ? "default" : "outline"} onClick={() => setPaymentTerm("A_VISTA")}>
                A vista
              </Button>
              <Button variant={paymentTerm === "A_PRAZO" ? "default" : "outline"} onClick={() => setPaymentTerm("A_PRAZO")}>
                A prazo
              </Button>
            </div>
            <div className="grid gap-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                disabled={paymentTerm !== "A_PRAZO"}
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void onConfirm()}>Gerar fechamento</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
