/** Prefixo YYYY-MM para filtros de período (alinhado à API de recebíveis/pagáveis). */

export function formatYearMonthPrefix(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentMonthPrefix(date = new Date()): string {
  return formatYearMonthPrefix(date);
}

export function getPreviousMonthPrefix(date = new Date()): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  return formatYearMonthPrefix(d);
}
