"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { currency, date } from "@/lib/formatters";

const PAYMENT_METHOD_OPTIONS = [
  { value: "Pix", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
  { value: "Boleto", label: "Boleto" },
] as const;

export function OsSettleDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: { id: string; number: string } | null;
  onClose: () => void;
  onConfirm: (id: string, paymentMethod?: string) => Promise<void>;
}) {
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [orderDetails, setOrderDetails] = useState<{
    id: string;
    number: string;
    clientName: string;
    dueDate: string;
    paymentTerm: "A_VISTA" | "A_PRAZO" | null;
    total: number;
    receivableAmount?: number;
    services: Array<{ id: string; description: string; laborPrice: number }>;
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isClosureOrder = order?.number.startsWith("FEC-") ?? false;

  useEffect(() => {
    if (!order) {
      setPaymentMethod("Pix");
      setOrderDetails(null);
      return;
    }

    let active = true;
    setLoadingDetails(true);
    fetch(`/api/service-orders/${order.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Não foi possível carregar a OS.");
        }
        return data.order;
      })
      .then((details) => {
        if (active) {
          setOrderDetails(details);
        }
      })
      .catch((error) => {
        if (active) {
          setOrderDetails(null);
          toast.error(error instanceof Error ? error.message : "Não foi possível carregar a OS.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDetails(false);
        }
      });

    return () => {
      active = false;
    };
  }, [order]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{order?.number ?? "Confirmar baixa da OS"}</DialogTitle>
          <DialogDescription>
            {order ? `Deseja confirmar a baixa da ${order.number}?` : "Confirme a baixa da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>
        {loadingDetails ? (
          <p className="text-sm text-muted-foreground">Carregando dados da OS...</p>
        ) : orderDetails ? (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">Cliente</span>
                <p>{orderDetails.clientName}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Vencimento</span>
                <p>
                  {orderDetails.paymentTerm === "A_PRAZO" && orderDetails.dueDate
                    ? date(orderDetails.dueDate)
                    : "À vista"}
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Valor devido</p>
                <p className="mt-2 text-3xl font-semibold">{currency(orderDetails.receivableAmount ?? orderDetails.total)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Valor total</p>
                <p className="mt-2 text-3xl font-semibold">{currency(orderDetails.total)}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">Serviços</p>
              <div className="mt-3 space-y-2">
                {orderDetails.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between text-sm">
                    <span>{service.description}</span>
                    <span>{currency(service.laborPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Forma de pagamento</Label>
              <SearchableSelect
                value={paymentMethod}
                onChange={setPaymentMethod}
                placeholder="Selecione a forma de pagamento"
                options={[...PAYMENT_METHOD_OPTIONS]}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Não foi possível carregar os detalhes desta OS.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!order) return;
              setSubmitting(true);
              try {
                await onConfirm(order.id, paymentMethod);
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={!paymentMethod || submitting || loadingDetails || !orderDetails || (isClosureOrder && !paymentMethod)}
          >
            Confirmar baixa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
