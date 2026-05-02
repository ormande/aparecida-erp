"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";

export type OsBillConfirmPayload = {
  paymentMethod: string;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  dueDate: string;
};

export type OsBillConfirmInitial = OsBillConfirmPayload & {
  /** Data de emissão (YYYY-MM-DD), usada como vencimento quando condição é à vista */
  openedAt: string;
  totalInput: string;
};

const DEFAULT_PAYMENT_OPTIONS = [
  { value: "Pix", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
  { value: "Boleto", label: "Boleto" },
] as const;

type OsBillConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial: OsBillConfirmInitial | null;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  paymentMethodOptions?: ReadonlyArray<{ value: string; label: string }>;
  onConfirm: (payload: OsBillConfirmPayload) => void;
};

export function OsBillConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  confirmLabel = "Faturar OS",
  cancelLabel = "Cancelar",
  isLoading = false,
  paymentMethodOptions = [...DEFAULT_PAYMENT_OPTIONS],
  onConfirm,
}: OsBillConfirmDialogProps) {
  const [paymentTerm, setPaymentTerm] = useState<"A_VISTA" | "A_PRAZO">("A_VISTA");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const billDialogWasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      billDialogWasOpenRef.current = false;
      return;
    }
    if (!initial) return;

    const justOpened = !billDialogWasOpenRef.current;
    billDialogWasOpenRef.current = true;
    if (!justOpened) {
      return;
    }

    setPaymentTerm(initial.paymentTerm);
    setFirstDueDate(initial.dueDate || (initial.paymentTerm === "A_PRAZO" ? "" : initial.openedAt));
    setPaymentMethod(initial.paymentMethod || "");
  }, [open, initial]);

  function handleConfirm() {
    if (!initial) return;
    const method = paymentMethod.trim();
    if (!method) {
      toast.error("Selecione a forma de pagamento.");
      return;
    }
    if (!firstDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
      toast.error("Informe o vencimento da 1ª parcela.");
      return;
    }

    onConfirm({
      paymentTerm,
      paymentMethod: method,
      dueDate: paymentTerm === "A_PRAZO" ? firstDueDate : initial.openedAt,
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        size="wide"
        className="flex min-h-0 max-h-[calc(100dvh-1rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] flex-col gap-4 overflow-hidden p-5 sm:p-8"
      >
        <AlertDialogHeader className="shrink-0 text-left">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 [-webkit-overflow-scrolling:touch]">
          {initial ? (
            <div className="grid min-w-0 gap-5 pb-1 text-left">
              <div className="grid min-w-0 gap-4">
                <div className="grid gap-2">
                  <Label>Condição de pagamento</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentTerm === "A_VISTA" ? "default" : "outline"}
                      onClick={() => {
                        setPaymentTerm("A_VISTA");
                        setFirstDueDate(initial.openedAt);
                      }}
                    >
                      À vista
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={paymentTerm === "A_PRAZO" ? "default" : "outline"}
                      onClick={() => setPaymentTerm("A_PRAZO")}
                    >
                      À prazo
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid min-w-0 gap-2">
                    <Label>Vencimento da 1ª parcela</Label>
                    <DatePicker value={firstDueDate} onChange={setFirstDueDate} />
                  </div>

                  <div className="grid min-w-0 gap-2">
                    <Label>Forma de pagamento</Label>
                    <SearchableSelect
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      placeholder="Selecione a forma de pagamento"
                      options={[...paymentMethodOptions]}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                O parcelamento desta OS foi definido na abertura. Aqui você confere apenas condição, vencimento e forma
                de pagamento para gerar os recebíveis.
              </p>
            </div>
          ) : null}
        </div>

        <AlertDialogFooter className="shrink-0 -mx-5 -mb-5 flex-col gap-2 sm:-mx-8 sm:-mb-8 sm:flex-row sm:justify-end">
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <Button type="button" disabled={isLoading || !initial} onClick={handleConfirm}>
            {isLoading ? "Processando..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
