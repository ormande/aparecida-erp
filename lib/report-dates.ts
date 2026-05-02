export function parseReportDayStart(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseReportDayEnd(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function formatReportLocalDate(d: Date): string {
  const y = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

export function iterDaysInclusive(startIso: string, endIso: string): string[] {
  const start = parseReportDayStart(startIso);
  const end = parseReportDayEnd(endIso);
  const out: string[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    out.push(formatReportLocalDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function defaultMonthToTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: formatReportLocalDate(start),
    endDate: formatReportLocalDate(now),
  };
}

/** Primeiro e último dia do mês civil anterior (horário local). */
export function previousCalendarMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastPrevMonth = new Date(firstThisMonth);
  lastPrevMonth.setDate(0);
  const firstPrevMonth = new Date(lastPrevMonth.getFullYear(), lastPrevMonth.getMonth(), 1);
  return {
    startDate: formatReportLocalDate(firstPrevMonth),
    endDate: formatReportLocalDate(lastPrevMonth),
  };
}

export function isFirstSevenDaysOfMonth(date = new Date()): boolean {
  const day = date.getDate();
  return day >= 1 && day <= 7;
}
