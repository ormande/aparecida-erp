"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function OsSettleDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: { id: string; number: string } | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar baixa da OS</DialogTitle>
          <DialogDescription>
            {order ? `Deseja confirmar a baixa da ${order.number}?` : "Confirme a baixa da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!order) return;
              await onConfirm(order.id);
              onClose();
            }}
          >
            Confirmar baixa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
