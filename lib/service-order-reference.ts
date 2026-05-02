import { prisma } from "@/lib/prisma";

/**
 * Número de OS no formato OS-AAAA-NNNNN (NNNNN com até 5 dígitos, alinhado a `buildOrderNumber` no backend).
 * Usar este padrão em todo o código que extrai referências a partir de texto (FEC, relatórios, etc.).
 */
export const SERVICE_ORDER_NUMBER_REGEX = /OS-\d{4}-\d{5}/g;
export const RECEIVABLE_REFERENCE_REGEX = /\[RCV:([a-z0-9]+)\]/gi;

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
