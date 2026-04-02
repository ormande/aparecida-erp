"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { serviceOrderStatusBadgeClasses } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  "Aberta",
  "Em andamento",
  "Aguardando peça",
  "Concluída",
  "Cancelada",
] as const;

type StatusOrder = { id: string; number: string; status: string };

type OsStatusModalProps = {
  order: StatusOrder | null;
  onClose: () => void;
  onConfirm: (id: string, newStatus: string) => Promise<void>;
};

export function OsStatusModal({ order, onClose, onConfirm }: OsStatusModalProps) {
  const [selected, setSelected] = useState<string>(order?.status ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setSelected(order.status);
    }
  }, [order]);

  const open = Boolean(order);
  const unchanged = !order || selected === order.status;

  async function handleConfirm() {
    if (!order || unchanged) return;
    setSubmitting(true);
    try {
      await onConfirm(order.id, selected);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Alterar status do trabalho</DialogTitle>
          <DialogDescription>
            {order ? (
              <>
                OS <span className="font-medium text-foreground">{order.number}</span> — escolha o novo status.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {STATUS_OPTIONS.map((status) => {
            const colorClass = serviceOrderStatusBadgeClasses[status] ?? "bg-muted text-foreground";
            const isSelected = selected === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelected(status)}
                className={cn(
                  "flex w-full items-center rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                  isSelected ? "border-ring ring-2 ring-ring/30" : "border-border hover:bg-muted/50",
                  colorClass,
                )}
              >
                <span
                  className={cn(
                    "mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground/40",
                  )}
                >
                  {isSelected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                {status}
              </button>
            );
          })}
        </div>
        <DialogFooter className="border-t-0 bg-transparent p-0 sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={unchanged || submitting}>
            Confirmar alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
