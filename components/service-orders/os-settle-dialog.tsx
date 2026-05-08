"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

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
  order: { id: string; number: string; receivableId?: string; outstandingAmount?: number } | null;
  onClose: () => void;
  onConfirm: (id: string, options?: { paymentMethod?: string; partialAmount?: number }) => Promise<void>;
}) {
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [orderDetails, setOrderDetails] = useState<{
    id: string;
    number: string;
    clientName: string;
    dueDate: string;
    paymentTerm: "A_VISTA" | "A_PRAZO" | null;
    total: number;
    receivableAmount?: number;
    services: Array<{ id: string; description: string; quantity?: number; laborPrice: number }>;
    products?: Array<{
      id: string;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!order) {
      setPaymentMethod("Pix");
      setIsPartial(false);
      setPartialAmountInput("");
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

  const outstandingAmount =
    order?.outstandingAmount != null
      ? order.outstandingAmount
      : orderDetails?.receivableAmount ?? orderDetails?.total ?? 0;
  const partialAmount = parseCurrencyInput(partialAmountInput);
  const remainingAmount = isPartial ? Math.max(outstandingAmount - partialAmount, 0) : outstandingAmount;

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
                <p className="text-sm font-medium text-muted-foreground">
                  {isPartial ? "Saldo restante" : "Valor devido"}
                </p>
                <p className="mt-2 text-3xl font-semibold">{currency(remainingAmount)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground">Valor total</p>
                <p className="mt-2 text-3xl font-semibold">{currency(orderDetails.total)}</p>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">Serviços</p>
              <div className="mt-3 space-y-2">
                {orderDetails.services.length ? (
                  orderDetails.services.map((service) => {
                    const qty = service.quantity ?? 1;
                    const lineTotal = qty * service.laborPrice;
                    return (
                      <div key={service.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 flex-1">
                          {service.description}
                          {qty !== 1 ? (
                            <span className="text-muted-foreground"> · {qty}×</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums">{currency(lineTotal)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum serviço lançado.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="font-medium">Produtos</p>
              <div className="mt-3 space-y-2">
                {orderDetails.products && orderDetails.products.length > 0 ? (
                  orderDetails.products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {product.description}
                        <span className="text-muted-foreground">
                          {" "}
                          · {product.quantity} {product.unit}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">{currency(product.totalPrice)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum produto lançado.</p>
                )}
              </div>
            </div>
            <div className="border-t" />
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isPartial}
                onCheckedChange={(checked) => {
                  setIsPartial(Boolean(checked));
                  setPartialAmountInput("");
                }}
              />
              <label className="text-sm font-medium">Registrar pagamento parcial</label>
            </div>
            {isPartial ? (
              <div className="grid gap-2">
                <Label>Valor pago agora</Label>
                <Input
                  value={partialAmountInput}
                  onChange={(event) => setPartialAmountInput(formatCurrencyInput(event.target.value))}
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-muted-foreground">
                  A OS só ficará como paga quando o valor total for quitado.
                </p>
              </div>
            ) : null}
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
              if (isPartial) {
                if (!orderDetails || partialAmount <= 0) {
                  toast.error("Informe um valor parcial válido.");
                  return;
                }
                if (partialAmount >= outstandingAmount) {
                  toast.error("O valor parcial deve ser menor que o valor devido.");
                  return;
                }
              }

              setSubmitting(true);
              try {
                await onConfirm(order.id, {
                  paymentMethod,
                  partialAmount: isPartial ? partialAmount : 0,
                });
                onClose();
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={!paymentMethod || submitting || loadingDetails || !orderDetails}
          >
            Confirmar baixa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
