"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { cleanFecItemDescriptionForDisplay } from "@/lib/service-order-reference";

const PAYMENT_METHOD_OPTIONS = [
  { value: "Pix", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
  { value: "Boleto", label: "Boleto" },
] as const;

type SettleItem = {
  key: string;
  name: string;
  type: "Serviço" | "Produto";
  quantity: number;
  unitLabel: string;
  total: number;
  sourceOrderNumber: string | null;
};

export function OsSettleDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: {
    id: string;
    number: string;
    receivableId?: string;
    outstandingAmount?: number;
    originalAmount?: number;
    paidAmount?: number;
    isPartiallyPaid?: boolean;
  } | null;
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
    services: Array<{ id: string; description: string; quantity?: number; laborPrice: number; lineTotal?: number }>;
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
  const lineOriginalAmount = order?.originalAmount ?? null;
  const lineAlreadyPaid = order?.paidAmount ?? 0;
  const showPartialHistory = Boolean(order?.isPartiallyPaid && lineAlreadyPaid > 0);

  /**
   * Combina serviços e produtos da OS em uma única tabela com nome limpo
   * (sem markers internos como `[RCV:...]`, `[PLAN:...]` ou `[Produto]`).
   * Para FECs, a OS de origem citada entre parênteses é extraída em coluna
   * dedicada.
   */
  const items = useMemo<SettleItem[]>(() => {
    if (!orderDetails) return [];
    const result: SettleItem[] = [];

    for (const service of orderDetails.services) {
      const cleaned = cleanFecItemDescriptionForDisplay(service.description);
      const qty = service.quantity ?? 1;
      const total =
        typeof service.lineTotal === "number" && Number.isFinite(service.lineTotal)
          ? service.lineTotal
          : qty * service.laborPrice;
      result.push({
        key: `svc-${service.id}`,
        name: cleaned.name,
        type: cleaned.type === "produto" ? "Produto" : "Serviço",
        quantity: qty,
        unitLabel: "",
        total,
        sourceOrderNumber: cleaned.sourceOrderNumber,
      });
    }

    for (const product of orderDetails.products ?? []) {
      const cleaned = cleanFecItemDescriptionForDisplay(product.description);
      result.push({
        key: `prd-${product.id}`,
        name: cleaned.name,
        type: "Produto",
        quantity: Number(product.quantity) || 1,
        unitLabel: product.unit ?? "",
        total: Number(product.totalPrice) || 0,
        sourceOrderNumber: cleaned.sourceOrderNumber,
      });
    }

    return result;
  }, [orderDetails]);

  return (
    <Dialog open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-3xl"
        bodyClassName="flex min-h-0 flex-1 flex-col gap-0 p-0"
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{order?.number ?? "Confirmar baixa da OS"}</DialogTitle>
          <DialogDescription>
            {order ? `Deseja confirmar a baixa da ${order.number}?` : "Confirme a baixa da ordem de serviço."}
          </DialogDescription>
        </DialogHeader>

        {loadingDetails ? (
          <div className="px-6 py-6">
            <p className="text-sm text-muted-foreground">Carregando dados da OS...</p>
          </div>
        ) : orderDetails ? (
          <>
            <div className="shrink-0 px-6 pt-4">
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
            </div>

            <div className="shrink-0 px-6 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {isPartial ? "Saldo restante" : "Valor devido"}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{currency(remainingAmount)}</p>
                  {showPartialHistory ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Já recebido: <span className="font-medium">{currency(lineAlreadyPaid)}</span>
                      {lineOriginalAmount != null
                        ? ` de ${currency(lineOriginalAmount)} (valor original da parcela)`
                        : null}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {order?.receivableId ? "Valor total da OS" : "Valor total"}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{currency(orderDetails.total)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col px-6">
              <p className="mb-2 text-sm font-medium">Itens</p>
              <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-muted/10">
                {items.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum item lançado.</p>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-[100px]">Tipo</TableHead>
                        <TableHead className="w-[90px] text-right">Qtd.</TableHead>
                        <TableHead className="w-[120px] text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.key}>
                          <TableCell className="whitespace-normal">
                            <div className="leading-tight">
                              <span>{item.name}</span>
                              {item.sourceOrderNumber ? (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({item.sourceOrderNumber})
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{item.type}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.quantity}
                            {item.unitLabel ? ` ${item.unitLabel}` : ""}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{currency(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
              <div className="grid gap-3">
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
                <div className="grid gap-3 md:grid-cols-2">
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
                  ) : (
                    <div />
                  )}
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
                <div className="flex justify-end gap-2 pt-2">
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
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-6">
            <p className="text-sm text-muted-foreground">Não foi possível carregar os detalhes desta OS.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
