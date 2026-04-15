"use client";

import { useCallback } from "react";
import useSWR from "swr";

import type { Client } from "@/lib/app-types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type UseCustomersParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type CustomersResponse = {
  data?: Client[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export function useCustomers(params?: UseCustomersParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  const search = params?.search?.trim() ?? "";

  const { data, error, mutate } = useSWR<CustomersResponse>(() => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(page));
    searchParams.set("limit", String(limit));
    if (search) searchParams.set("search", search);
    return `/api/customers?${searchParams.toString()}`;
  }, fetcher);

  const setCustomers = useCallback(
    (value: Client[] | ((current: Client[]) => Client[])) => {
      void mutate((current) => {
        const customers = current?.data ?? [];
        const nextCustomers = typeof value === "function" ? value(customers) : value;

        return {
          data: nextCustomers,
          meta: current?.meta,
        };
      }, false);
    },
    [mutate],
  );

  return {
    customers: data?.data ?? [],
    meta: data?.meta,
    hydrated: data !== undefined || error !== undefined,
    setCustomers,
    refresh: mutate,
  };
}
