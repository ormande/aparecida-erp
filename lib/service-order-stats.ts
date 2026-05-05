import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Uma OS “lógica” com várias linhas físicas (parcelamento na abertura) compartilha `parcelGroupId`.
 * Para contagens de quantidade de serviços/OS, conta-se só uma linha representativa.
 */
export const LOGICAL_SERVICE_ORDER_ROOT: Prisma.ServiceOrderWhereInput = {
  OR: [{ parcelGroupId: null }, { parcelIndex: 1 }],
};

type ParcelRow = { id: string; parcelGroupId: string | null };

/** Quantidade de OS lógicas a partir de linhas já filtradas (mesmo grupo = uma OS). */
export function countDistinctLogicalServiceOrders(rows: ParcelRow[]): number {
  const keys = new Set<string>();
  for (const r of rows) {
    keys.add(r.parcelGroupId ?? r.id);
  }
  return keys.size;
}

/**
 * OS considerada “concluída/faturada” no sentido de negócio: sem grupo = linha faturada;
 * com grupo = todas as parcelas (linhas) do grupo estão faturadas.
 */
export async function countLogicalFullyBilledServiceOrders(
  where: Prisma.ServiceOrderWhereInput,
): Promise<number> {
  const rows = await prisma.serviceOrder.findMany({
    where,
    select: { id: true, parcelGroupId: true, isBilled: true },
  });

  const byGroup = new Map<string, { total: number; billed: number }>();
  let singletonBilled = 0;

  for (const r of rows) {
    if (!r.parcelGroupId) {
      if (r.isBilled) {
        singletonBilled += 1;
      }
      continue;
    }
    if (!byGroup.has(r.parcelGroupId)) {
      byGroup.set(r.parcelGroupId, { total: 0, billed: 0 });
    }
    const g = byGroup.get(r.parcelGroupId)!;
    g.total += 1;
    if (r.isBilled) {
      g.billed += 1;
    }
  }

  let groupFullyBilled = 0;
  byGroup.forEach((g) => {
    if (g.total > 0 && g.total === g.billed) {
      groupFullyBilled += 1;
    }
  });

  return singletonBilled + groupFullyBilled;
}
