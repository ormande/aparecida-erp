"use client";

import useSWR from "swr";

type OsStatMetric = {
  count: number;
  total: number;
};

type DashboardOsStatsResponse = {
  coletadas: OsStatMetric;
  faturadas: OsStatMetric;
  emCaixa: OsStatMetric;
  totalProduzido: OsStatMetric;
};

const EMPTY_STATS: DashboardOsStatsResponse = {
  coletadas: { count: 0, total: 0 },
  faturadas: { count: 0, total: 0 },
  emCaixa: { count: 0, total: 0 },
  totalProduzido: { count: 0, total: 0 },
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Falha ao carregar indicadores de OS.");
  }
  return response.json() as Promise<DashboardOsStatsResponse>;
};

export function useDashboardOsStats(unitId?: string) {
  const params = new URLSearchParams();
  if (unitId) {
    params.set("unitId", unitId);
  }
  const suffix = params.toString();
  const key = suffix ? `/api/dashboard/os-stats?${suffix}` : "/api/dashboard/os-stats";

  const { data, error } = useSWR<DashboardOsStatsResponse>(key, fetcher);

  return {
    coletadas: data?.coletadas ?? EMPTY_STATS.coletadas,
    faturadas: data?.faturadas ?? EMPTY_STATS.faturadas,
    emCaixa: data?.emCaixa ?? EMPTY_STATS.emCaixa,
    totalProduzido: data?.totalProduzido ?? EMPTY_STATS.totalProduzido,
    hydrated: data !== undefined || error !== undefined,
  };
}
