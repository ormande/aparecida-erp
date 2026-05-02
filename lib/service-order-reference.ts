import { prisma } from "@/lib/prisma";

/**
 * Número de OS no formato OS-AAAA-NNNNN (NNNNN com até 5 dígitos, alinhado a `buildOrderNumber` no backend).
 * Opcionalmente sufixo `-Pk` quando a OS é a k-ésima parcela (mesmo grupo de parcelamento).
 * Usar este padrão em todo o código que extrai referências a partir de texto (FEC, relatórios, etc.).
 */
export const SERVICE_ORDER_NUMBER_REGEX = /OS-\d{4}-\d{5}(?:-P\d+)?/g;

/** Sequência manual base (5 dígitos) para formulários, ex.: OS-2026-00123-P2 → "00123". */
export function extractOsManualSequence(number: string): string | null {
  const m = /^OS-(\d{4})-(\d{5})(?:-P\d+)?$/i.exec(number.trim());
  return m ? m[2] : null;
}

/** Remove sufixo `-Pk` do número (exibição amigável; o registro no banco mantém o número completo). */
export function stripServiceOrderParcelSuffix(number: string): string {
  return number.replace(/-P\d+$/i, "").trim();
}

/** Rótulo para UI: `OS-AAAA-NNNNN — kª parcela` quando for grupo parcelado real (parcelIndex/parcelCount). */
export function serviceOrderFriendlyNumberLabel(order: {
  number: string;
  parcelIndex?: number | null;
  parcelCount?: number | null;
}): string {
  const idx = order.parcelIndex;
  const cnt = order.parcelCount;
  if (
    idx != null &&
    cnt != null &&
    Number.isInteger(idx) &&
    Number.isInteger(cnt) &&
    cnt >= 2 &&
    idx >= 1 &&
    idx <= cnt
  ) {
    const base = stripServiceOrderParcelSuffix(order.number);
    return `${base} — ${idx}ª parcela`;
  }
  return order.number;
}

export const RECEIVABLE_REFERENCE_REGEX = /\[RCV:([^\]]+)\]/gi;

export function extractServiceOrderNumbersFromText(text: string): string[] {
  return Array.from(text.matchAll(SERVICE_ORDER_NUMBER_REGEX)).map((match) => match[0]);
}

export function extractReceivableIdsFromText(text: string): string[] {
  return Array.from(text.matchAll(RECEIVABLE_REFERENCE_REGEX)).map((match) => match[1]);
}

export type FecItemReferenceSource = {
  description: string;
  referencedOrderNumber?: string | null;
};

/** Referências a OS filhas em uma FEC: campo dedicado quando existir; senão extrai da descrição (legado). */
export function getReferencedOrderNumbersFromFecItems(items: FecItemReferenceSource[]): string[] {
  const nums: string[] = [];
  for (const item of items) {
    const fromField = item.referencedOrderNumber?.trim();
    if (fromField) {
      nums.push(fromField);
    } else {
      nums.push(...extractServiceOrderNumbersFromText(item.description));
    }
  }
  return Array.from(new Set(nums));
}

/** Total em aberto na FEC: ignora linhas zeradas e linhas marcadas como “já pago” (referência paga). */
export function fecOutstandingFromItems(items: Array<{ lineTotal: unknown; description: string }>): number {
  return items.reduce((sum, item) => {
    const n = Number(item.lineTotal);
    if (!Number.isFinite(n) || n <= 0) {
      return sum;
    }
    const d = item.description.toLowerCase();
    if (d.includes("já pago") || d.includes("ja pago")) {
      return sum;
    }
    return sum + n;
  }, 0);
}

/** Números de OS filhas citados em uma linha de item de FEC (campo dedicado ou texto). */
export function fecLineReferencedOrderNumbers(item: FecItemReferenceSource): string[] {
  const fromField = item.referencedOrderNumber?.trim();
  if (fromField) {
    return [fromField];
  }
  return extractServiceOrderNumbersFromText(item.description);
}

/** Soma dos lineTotal da FEC por número de OS de origem (ignora linhas “já pago”). */
export function aggregateFecLineContributionsByOrderNumber(
  items: Array<{ description: string; lineTotal: unknown; referencedOrderNumber?: string | null }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const n = Number(item.lineTotal);
    if (!Number.isFinite(n) || n <= 0) continue;
    const d = item.description.toLowerCase();
    if (d.includes("já pago") || d.includes("ja pago")) continue;

    const nums = fecLineReferencedOrderNumbers(item);
    if (nums.length === 0) continue;
    const share = n / nums.length;
    for (const num of nums) {
      map.set(num, (map.get(num) ?? 0) + share);
    }
  }
  return map;
}

const PLANNED_PARCEL_FEC_RE = /Parcela\s+(\d+)\/(\d+)\s+da\s+(OS-\d{4}-\d{5})\s+\(planejada\)/i;

/** Índices 0-based das parcelas planejadas incluídas na FEC, por número da OS. */
export function plannedParcelIndicesFromFecItems(
  items: Array<{ description: string; lineTotal: unknown; referencedOrderNumber?: string | null }>,
): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  for (const item of items) {
    const n = Number(item.lineTotal);
    if (!Number.isFinite(n) || n <= 0) continue;
    const m = item.description.match(PLANNED_PARCEL_FEC_RE);
    if (!m) continue;
    const parcelIndex = Number(m[1]) - 1;
    const osNumber = m[3];
    if (!Number.isInteger(parcelIndex) || parcelIndex < 0) continue;
    if (!result.has(osNumber)) {
      result.set(osNumber, new Set());
    }
    result.get(osNumber)!.add(parcelIndex);
  }
  return result;
}

export async function fetchReferencedReceivableIdsInAllClosures(
  companyId: string,
  unitId?: string,
): Promise<Set<string>> {
  const closures = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      ...(unitId ? { unitId } : {}),
      number: { startsWith: "FEC-" },
    },
    select: {
      items: {
        select: {
          description: true,
        },
      },
    },
  });

  const referenced = new Set<string>();
  for (const closure of closures) {
    for (const item of closure.items) {
      for (const receivableId of extractReceivableIdsFromText(item.description)) {
        referenced.add(receivableId);
      }
    }
  }
  return referenced;
}

/** OS já referenciadas em algum fechamento (FEC) ainda não totalmente pago. */
export async function fetchReferencedOrderNumbersInOpenClosures(
  companyId: string,
  unitId?: string,
): Promise<Set<string>> {
  const openClosures = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      ...(unitId ? { unitId } : {}),
      number: { startsWith: "FEC-" },
      paymentStatus: { not: "PAGO" },
    },
    select: {
      items: {
        select: {
          description: true,
          referencedOrderNumber: true,
        },
      },
    },
  });

  const referenced = new Set<string>();
  for (const closure of openClosures) {
    for (const number of getReferencedOrderNumbersFromFecItems(closure.items)) {
      referenced.add(number);
    }
  }
  return referenced;
}

/** OS já referenciadas em qualquer fechamento (aberto ou pago). */
export async function fetchReferencedOrderNumbersInAllClosures(
  companyId: string,
  unitId?: string,
): Promise<Set<string>> {
  const closures = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      ...(unitId ? { unitId } : {}),
      number: { startsWith: "FEC-" },
    },
    select: {
      items: {
        select: {
          description: true,
          referencedOrderNumber: true,
        },
      },
    },
  });

  const referenced = new Set<string>();
  for (const closure of closures) {
    for (const number of getReferencedOrderNumbersFromFecItems(closure.items)) {
      referenced.add(number);
    }
  }
  return referenced;
}
