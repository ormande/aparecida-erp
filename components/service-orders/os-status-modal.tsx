"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  "Aberta",
  "Em andamento",
  "Aguardando peça",
  "Concluída",
  "Cancelada",
] as const;

const STATUS_SELECTED: Record<
  (typeof STATUS_OPTIONS)[number],
  { option: string; radio: string }
> = {
  Aberta: {
    option: "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300",
    radio: "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500",
  },
  "Em andamento": {
    option: "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300",
    radio: "border-amber-600 bg-amber-600 dark:border-amber-500 dark:bg-amber-500",
  },
  "Aguardando peça": {
    option: "bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300",
    radio: "border-orange-600 bg-orange-600 dark:border-orange-500 dark:bg-orange-500",
  },
  Concluída: {
    option: "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300",
    radio: "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500",
  },
  Cancelada: {
    option: "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300",
    radio: "border-rose-600 bg-rose-600 dark:border-rose-500 dark:bg-rose-500",
  },
};

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
      <DialogContent className="sm:max-w-lg" bodyClassName="px-6 pb-6 pt-5" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-slate-950 dark:text-foreground">Alterar status do trabalho</DialogTitle>
          <DialogDescription className="text-slate-700 dark:text-muted-foreground">
            {order ? (
              <>
                OS{" "}
                <span className="font-semibold text-slate-900 dark:font-medium dark:text-foreground">
                  {order.number}
                </span>{" "}
                — escolha o novo status.
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 pb-2">
          {STATUS_OPTIONS.map((status) => {
            const sel = STATUS_SELECTED[status];
            const isSelected = selected === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setSelected(status)}
                className={cn(
                  "flex w-full items-center rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                  isSelected
                    ? sel.option
                    : "bg-muted/40 border-border text-foreground hover:bg-muted/70",
                )}
              >
                <span
                  className={cn(
                    "mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? sel.radio : "border-border bg-transparent",
                  )}
                >
                  {isSelected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                {status}
              </button>
            );
          })}
        </div>
        <DialogFooter className="border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
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
