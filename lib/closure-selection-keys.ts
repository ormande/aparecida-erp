/** Chave de seleção no modal de fechamento para parcela ainda não faturada (plano na abertura). */
export function plannedInstallmentSelectionKey(orderId: string, index: number): string {
  return `planned:${orderId}:${index}`;
}

export function parsePlannedInstallmentSelectionKey(key: string): { orderId: string; index: number } | null {
  if (!key.startsWith("planned:")) return null;
  const rest = key.slice("planned:".length);
  const lastColon = rest.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const orderId = rest.slice(0, lastColon);
  const index = Number(rest.slice(lastColon + 1));
  if (!orderId || !Number.isInteger(index) || index < 0) return null;
  return { orderId, index };
}
