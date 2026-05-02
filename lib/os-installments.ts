import type { Prisma } from "@prisma/client";

import { ServiceError } from "@/services/service-error";

export type OrderInstallmentPayload = {
  dueDate: string;
  amount: number;
  /** Ordinal 1-based na OS original (ex.: 3ª parcela restante após fechamento parcial). */
  displayParcelNumber?: number;
};

/** Linhas normalizadas com Date local (meia-noite) para gravar recebíveis. */
export type NormalizedInstallmentRow = {
  dueDate: Date;
  amount: number;
};

export function buildInstallmentsForBilling(
  totalAmount: number,
  fallbackDueDate: Date,
  installments?: OrderInstallmentPayload[],
): NormalizedInstallmentRow[] {
  if (!installments || installments.length === 0) {
    return [
      {
        dueDate: fallbackDueDate,
        amount: totalAmount,
      },
    ];
  }

  if (installments.length < 1 || installments.length > 12) {
    throw new ServiceError("Quantidade de parcelas inválida. Use entre 1 e 12.", 400);
  }

  const normalized = installments.map((item, index) => {
    const due = item.dueDate?.trim();
    if (!due || !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      throw new ServiceError(`Vencimento inválido na parcela ${index + 1}.`, 400);
    }
    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ServiceError(`Valor inválido na parcela ${index + 1}.`, 400);
    }
    return {
      dueDate: new Date(`${due}T00:00:00`),
      amount,
    };
  });

  const totalFromPayload = normalized.reduce((sum, item) => sum + item.amount, 0);
  const payloadCents = Math.round(totalFromPayload * 100);
  const totalCents = Math.round(totalAmount * 100);
  if (payloadCents !== totalCents) {
    throw new ServiceError("A soma das parcelas deve ser igual ao total da OS.", 400);
  }

  return normalized;
}

export function installmentPlanToJson(plan: NormalizedInstallmentRow[]): Prisma.InputJsonValue {
  return plan.map((p) => ({
    dueDate: p.dueDate.toISOString().slice(0, 10),
    amount: p.amount,
  }));
}

/** Persiste plano já em formato de payload (ex.: após recorte de parcelas). */
export function orderInstallmentPayloadsToJson(plan: OrderInstallmentPayload[]): Prisma.InputJsonValue {
  return plan.map((p) => ({
    dueDate: p.dueDate,
    amount: p.amount,
    ...(p.displayParcelNumber != null ? { displayParcelNumber: p.displayParcelNumber } : {}),
  }));
}

/** Remove parcelas já faturadas via fechamento; mantém ordinal original em `displayParcelNumber`. */
export function trimBillingPlanRemovingParcelIndices(
  plan: OrderInstallmentPayload[],
  includedZeroBasedIndices: Set<number>,
): OrderInstallmentPayload[] {
  return plan
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ idx }) => !includedZeroBasedIndices.has(idx))
    .map(({ entry, idx }) => ({
      dueDate: entry.dueDate,
      amount: entry.amount,
      displayParcelNumber: idx + 1,
    }));
}

export function parseStoredBillingPlan(value: unknown): OrderInstallmentPayload[] | undefined {
  if (!value || !Array.isArray(value)) {
    return undefined;
  }
  const out: OrderInstallmentPayload[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return undefined;
    }
    const rec = item as Record<string, unknown>;
    const dueDate = typeof rec.dueDate === "string" ? rec.dueDate : null;
    const rawAmount = rec.amount;
    const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return undefined;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return undefined;
    }
    const dpn = rec.displayParcelNumber;
    out.push({
      dueDate,
      amount,
      ...(typeof dpn === "number" && Number.isInteger(dpn) && dpn > 0 ? { displayParcelNumber: dpn } : {}),
    });
  }
  return out.length ? out : undefined;
}
