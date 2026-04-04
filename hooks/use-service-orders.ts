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

type ServiceOrderRow = {
  id: string;
  number: string;
  clientId: string | null;
  unitId?: string | null;
  unitName?: string | null;
  vehicleId: string | null;
  clientName: string;
  plate: string;
  servicesLabel: string;
  status: "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Cancelada";
  paymentStatus: "PENDENTE" | "PAGO_PARCIAL" | "PAGO";
  total: number;
  openedAt: string;
  dueDate?: string | null;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  isStandalone?: boolean;
  receivableStatus?: "PAGO" | "PENDENTE" | "VENCIDO" | null;
  receivableCount?: number;
  receivableAmount?: number;
  executedByName?: string | null;
};

type UseServiceOrdersParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  unitId?: string;
  customerId?: string;
  vehicleId?: string;
};

type ServiceOrdersResponse = {
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
    if (filters?.vehicleId) params.set("vehicleId", filters.vehicleId);

    return `/api/service-orders?${params.toString()}`;
  }, [
    filters?.customerId,
    filters?.limit,
    filters?.page,
    filters?.search,
    filters?.status,
    filters?.unitId,
    filters?.vehicleId,
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
