import type { ReceivableOriginType } from "@prisma/client";

export type ParcelColumnSource = {
  originType: ReceivableOriginType;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  serviceOrder?: {
    number: string;
    parcelIndex?: number | null;
    parcelCount?: number | null;
  } | null;
};

/**
 * Coluna "Parcela": parcelamento do faturamento (k/n), parcelas físicas da OS (P1/3) ou manual (k/n).
 */
export function parcelColumnLabel(input: ParcelColumnSource): string {
  const n = input.installmentNumber;
  const c = input.installmentCount;
  if (n != null && c != null && c >= 2) {
    return `${n}/${c}`;
  }

  if (input.originType === "SERVICE_ORDER" && input.serviceOrder) {
    const so = input.serviceOrder;
    const pi = so.parcelIndex;
    const pc = so.parcelCount;
    if (pi != null && pc != null && pc >= 2) {
      return `P${pi}/${pc}`;
    }
    const m = /-P(\d+)$/i.exec(so.number.trim());
    if (m) {
      const idx = m[1];
      if (pc != null && pc >= 2) {
        return `P${idx}/${pc}`;
      }
      return `P${idx}`;
    }
  }

  if (input.originType === "MANUAL" && n != null && c != null) {
    return `${n}/${c}`;
  }

  return "-";
}
