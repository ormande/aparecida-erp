"use client";

import { AnimatePresence, motion } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import type { OrderInstallmentPayload } from "@/lib/os-installments";
import { cn } from "@/lib/utils";

const installmentPanelTransition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as const,
};

const PARCEL_COUNT_MIN = 2;
const PARCEL_COUNT_MAX = 12;
const INTERVAL_DAYS_MIN = 5;
const INTERVAL_DAYS_MAX = 30;

function clampParcelCount(n: number) {
  return Math.min(PARCEL_COUNT_MAX, Math.max(PARCEL_COUNT_MIN, Math.round(n)));
}

function clampIntervalDays(n: number) {
  return Math.min(INTERVAL_DAYS_MAX, Math.max(INTERVAL_DAYS_MIN, Math.round(n)));
}

export type OsInstallmentPlanFieldsHandle = {
  validate: () => boolean;
  /** Abertura: omitir campo no POST quando parcela única */
  getForCreate: () => OrderInstallmentPayload[] | undefined;
  /** Edição: sempre enviar — [] limpa plano salvo; 2+ grava novo plano */
  getForEditSave: () => OrderInstallmentPayload[];
};

export type OsInstallmentPlanFieldsProps = {
  totalAmount: number;
  firstDueDate: string;
  openedAtFallback: string;
  initialStoredPlan?: OrderInstallmentPayload[] | null;
  resetKey: string;
  disabled?: boolean;
};

export const OsInstallmentPlanFields = forwardRef<OsInstallmentPlanFieldsHandle, OsInstallmentPlanFieldsProps>(
  function OsInstallmentPlanFields(
    {
      totalAmount,
      firstDueDate,
      openedAtFallback,
      initialStoredPlan,
      resetKey,
      disabled = false,
    },
    ref,
  ) {
    const [enableInstallments, setEnableInstallments] = useState(false);
    const [installmentCount, setInstallmentCount] = useState(2);
    const [installmentCountDraft, setInstallmentCountDraft] = useState<string | null>(null);
    const [customAmounts, setCustomAmounts] = useState(false);
    const [installmentDays, setInstallmentDays] = useState(30);
    const [installmentDaysDraft, setInstallmentDaysDraft] = useState<string | null>(null);
    const [installments, setInstallments] = useState<Array<{ dueDate: string; amountInput: string }>>([]);

    const installmentsAmount = useMemo(
      () => installments.reduce((sum, item) => sum + parseCurrencyInput(item.amountInput), 0),
      [installments],
    );
    const installmentsMatchTotal = Math.round(installmentsAmount * 100) === Math.round(totalAmount * 100);

    const prevResetKeyRef = useRef<string | null>(null);
    const skipNextAutoGenerateRef = useRef(false);

    useEffect(() => {
      if (prevResetKeyRef.current === resetKey) {
        return;
      }
      prevResetKeyRef.current = resetKey;

      const hasStored = Boolean(initialStoredPlan && initialStoredPlan.length >= 2);
      setEnableInstallments(hasStored);
      setInstallmentCount(hasStored ? initialStoredPlan!.length : 2);
      setInstallmentCountDraft(null);
      setCustomAmounts(hasStored);
      setInstallmentDays(30);
      setInstallmentDaysDraft(null);
      if (hasStored) {
        skipNextAutoGenerateRef.current = true;
        setInstallments(
          initialStoredPlan!.map((row) => ({
            dueDate: row.dueDate,
            amountInput: formatCurrencyInput(String(Math.round(row.amount * 100))),
          })),
        );
      } else {
        skipNextAutoGenerateRef.current = false;
        setInstallments([]);
      }
    }, [resetKey, initialStoredPlan]);

    useEffect(() => {
      if (!enableInstallments) return;
      if (skipNextAutoGenerateRef.current) {
        skipNextAutoGenerateRef.current = false;
        return;
      }
      const base = firstDueDate || openedAtFallback;
      if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(base)) return;
      const parts = base.split("-").map(Number);
      const baseDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      const count = clampParcelCount(installmentCount);
      const days = clampIntervalDays(installmentDays);
      const totalCents = Math.round(totalAmount * 100);
      const evenCents = Math.floor(totalCents / count);
      const remainder = totalCents - evenCents * count;

      setInstallments(
        Array.from({ length: count }).map((_, index) => {
          const due = new Date(baseDate);
          due.setDate(baseDate.getDate() + index * days);
          const y = due.getFullYear();
          const m = String(due.getMonth() + 1).padStart(2, "0");
          const d = String(due.getDate()).padStart(2, "0");
          const cents = customAmounts ? undefined : evenCents + (index < remainder ? 1 : 0);
          return {
            dueDate: `${y}-${m}-${d}`,
            amountInput: customAmounts ? formatCurrencyInput("0") : formatCurrencyInput(String(cents ?? 0)),
          };
        }),
      );
    }, [
      customAmounts,
      enableInstallments,
      firstDueDate,
      installmentCount,
      installmentDays,
      openedAtFallback,
      totalAmount,
    ]);

    function validate(): boolean {
      if (!enableInstallments) {
        return true;
      }
      if (installments.length < 2 || installments.length > 12) {
        toast.error("Use entre 2 e 12 parcelas.");
        return false;
      }
      if (installments.some((item) => !item.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate))) {
        toast.error("Preencha o vencimento de todas as parcelas.");
        return false;
      }
      if (installments.some((item) => parseCurrencyInput(item.amountInput) <= 0)) {
        toast.error("Informe um valor válido para todas as parcelas.");
        return false;
      }
      if (!installmentsMatchTotal) {
        toast.error("A soma das parcelas precisa bater com o total da OS.");
        return false;
      }
      return true;
    }

    function rowsForApi(): OrderInstallmentPayload[] {
      return installments.map((item) => ({
        dueDate: item.dueDate,
        amount: parseCurrencyInput(item.amountInput),
      }));
    }

    useImperativeHandle(ref, () => ({
      validate,
      getForCreate: () => (enableInstallments ? rowsForApi() : undefined),
      getForEditSave: () => (enableInstallments ? rowsForApi() : []),
    }));

    const installmentListScroll = enableInstallments && installments.length > 2;

    return (
      <motion.div className="grid min-w-0 gap-3 overflow-hidden rounded-xl border bg-muted/20 p-3 sm:p-4">
        <p className="text-xs font-medium text-muted-foreground">Parcelamento (definido na abertura da OS)</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={enableInstallments ? "default" : "outline"}
            disabled={disabled}
            onClick={() => setEnableInstallments(true)}
          >
            Parcelado
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!enableInstallments ? "default" : "outline"}
            disabled={disabled}
            onClick={() => setEnableInstallments(false)}
          >
            Parcela única
          </Button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {enableInstallments ? (
            <motion.div
              key="parcelado"
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.99 }}
              transition={installmentPanelTransition}
              className="grid gap-4 overflow-hidden"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid min-w-0 gap-1">
                  <Label>Qtd. parcelas (2–12)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={2}
                    disabled={disabled}
                    value={installmentCountDraft ?? String(installmentCount)}
                    onFocus={() => setInstallmentCountDraft(String(installmentCount))}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setInstallmentCountDraft(d);
                      if (d === "") return;
                      const n = Number(d);
                      if (Number.isNaN(n)) return;
                      if (n >= PARCEL_COUNT_MIN && n <= PARCEL_COUNT_MAX) {
                        setInstallmentCount(n);
                      }
                    }}
                    onBlur={() => {
                      const raw = installmentCountDraft ?? String(installmentCount);
                      let n = Number(raw.replace(/\D/g, ""));
                      if (Number.isNaN(n) || raw.trim() === "") n = installmentCount;
                      n = clampParcelCount(n);
                      setInstallmentCount(n);
                      setInstallmentCountDraft(null);
                    }}
                  />
                </div>
                <div className="grid min-w-0 gap-1">
                  <Label>Intervalo (dias, 5–30)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={2}
                    disabled={disabled}
                    value={installmentDaysDraft ?? String(installmentDays)}
                    onFocus={() => setInstallmentDaysDraft(String(installmentDays))}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setInstallmentDaysDraft(d);
                      if (d === "") return;
                      const n = Number(d);
                      if (Number.isNaN(n)) return;
                      if (n >= INTERVAL_DAYS_MIN && n <= INTERVAL_DAYS_MAX) {
                        setInstallmentDays(n);
                      }
                    }}
                    onBlur={() => {
                      const raw = installmentDaysDraft ?? String(installmentDays);
                      let n = Number(raw.replace(/\D/g, ""));
                      if (Number.isNaN(n) || raw.trim() === "") n = installmentDays;
                      n = clampIntervalDays(n);
                      setInstallmentDays(n);
                      setInstallmentDaysDraft(null);
                    }}
                  />
                </div>
                <div className="grid min-w-0 gap-1">
                  <Label>Valores</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={!customAmounts ? "default" : "outline"}
                      disabled={disabled}
                      onClick={() => setCustomAmounts(false)}
                    >
                      Igual
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={customAmounts ? "default" : "outline"}
                      disabled={disabled}
                      onClick={() => setCustomAmounts(true)}
                    >
                      Personalizado
                    </Button>
                  </div>
                </div>
              </div>
              <motion.div
                className={cn(
                  "space-y-3 overflow-x-hidden rounded-lg border bg-background p-2 sm:p-3",
                  installmentListScroll && "max-h-[min(16rem,34dvh)] overflow-y-auto overscroll-y-contain",
                )}
              >
                {installments.map((item, index) => (
                  <div
                    key={`${index}-${item.dueDate}`}
                    className="grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2 sm:gap-4"
                  >
                    <div className="grid min-w-0 gap-1.5">
                      <Label className="text-muted-foreground">Parcela {index + 1} — vencimento</Label>
                      <DatePicker
                        value={item.dueDate}
                        disabled={disabled}
                        onChange={(v) =>
                          setInstallments((current) =>
                            current.map((it, idx) => (idx === index ? { ...it, dueDate: v } : it)),
                          )
                        }
                      />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                      <Label className="text-muted-foreground">Valor</Label>
                      <Input
                        className="w-full min-w-0"
                        value={item.amountInput}
                        disabled={disabled || !customAmounts}
                        onChange={(e) =>
                          setInstallments((current) =>
                            current.map((it, idx) =>
                              idx === index ? { ...it, amountInput: formatCurrencyInput(e.target.value) } : it,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
              <p
                className={`text-xs leading-relaxed ${installmentsMatchTotal ? "text-emerald-600 dark:text-emerald-500" : "text-destructive"}`}
              >
                Soma das parcelas: {formatCurrencyInput(String(Math.round(installmentsAmount * 100)))} / Total da OS:{" "}
                {formatCurrencyInput(String(Math.round(totalAmount * 100)))}
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="unica"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={installmentPanelTransition}
              className="text-xs text-muted-foreground"
            >
              No faturamento será gerado um único recebível com o valor total no vencimento informado acima.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);
