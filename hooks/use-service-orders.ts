"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Falha ao carregar ordens de serviço.");
  }

  return response.json();
};

export type ServiceOrderRow = {
  id: string;
  number: string;
  clientId: string | null;
  unitId?: string | null;
  unitName?: string | null;
  clientName: string;
  servicesLabel: string;
  status: "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Cancelada";
  paymentStatus: "PENDENTE" | "PAGO_PARCIAL" | "PAGO";
  isBilled: boolean;
  isLockedByOpenClosure?: boolean;
  isLockedByAnyClosure?: boolean;
  total: number;
  openedAt: string;
  dueDate?: string | null;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  isStandalone?: boolean;
  receivableStatus?: "PAGO" | "PENDENTE" | "VENCIDO" | null;
  receivableCount?: number;
  receivableAmount?: number;
  receivableLines?: Array<{
    id: string;
    amount: number;
    dueDate: string;
    status: "PAGO" | "PENDENTE" | "VENCIDO";
    installmentNumber?: number | null;
    installmentCount?: number | null;
    isLockedByAnyClosure?: boolean;
  }>;
  executedByName?: string | null;
};

type UseServiceOrdersParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  unitId?: string;
  customerId?: string;
  numberPrefix?: string;
  excludeFechamentos?: boolean;
  openedMonth?: string;
  openedFrom?: string;
  openedTo?: string;
  minTotal?: number;
  maxTotal?: number;
  paymentStatus?: string;
  billingScope?: "ABERTAS" | "FATURADAS" | "PAGAS";
};

export type ServiceOrdersResponse = {
  data?: ServiceOrderRow[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export function useServiceOrders(filters?: UseServiceOrdersParams) {
  const key = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(filters?.page ?? 1));
    params.set("limit", String(filters?.limit ?? 10));

    if (filters?.search?.trim()) params.set("search", filters.search.trim());
    if (filters?.status) params.set("status", filters.status);
    if (filters?.unitId) params.set("unitId", filters.unitId);
    if (filters?.customerId) params.set("customerId", filters.customerId);
    if (filters?.numberPrefix) params.set("numberPrefix", filters.numberPrefix);
    if (filters?.excludeFechamentos) params.set("excludeFechamentos", "true");
    if (filters?.openedMonth) params.set("openedMonth", filters.openedMonth);
    if (filters?.openedFrom) params.set("openedFrom", filters.openedFrom);
    if (filters?.openedTo) params.set("openedTo", filters.openedTo);
    if (filters?.minTotal !== undefined) params.set("minTotal", String(filters.minTotal));
    if (filters?.maxTotal !== undefined) params.set("maxTotal", String(filters.maxTotal));
    if (filters?.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
    if (filters?.billingScope) params.set("billingScope", filters.billingScope);

    return `/api/service-orders?${params.toString()}`;
  }, [
    filters?.billingScope,
    filters?.customerId,
    filters?.excludeFechamentos,
    filters?.limit,
    filters?.maxTotal,
    filters?.minTotal,
    filters?.openedFrom,
    filters?.openedMonth,
    filters?.openedTo,
    filters?.numberPrefix,
    filters?.page,
    filters?.paymentStatus,
    filters?.search,
    filters?.status,
    filters?.unitId,
  ]);

  const { data, error, mutate } = useSWR<ServiceOrdersResponse>(key, fetcher);

  const setOrders = useCallback(
    (value: ServiceOrderRow[] | ((current: ServiceOrderRow[]) => ServiceOrderRow[])) => {
      void mutate((current) => {
        const orders = current?.data ?? [];
        const nextOrders = typeof value === "function" ? value(orders) : value;

        return {
          data: nextOrders,
          meta: current?.meta,
        };
      }, false);
    },
    [mutate],
  );

  return {
    orders: data?.data ?? [],
    meta: data?.meta,
    hydrated: data !== undefined || error !== undefined,
    setOrders,
    refresh: mutate,
  };
}
