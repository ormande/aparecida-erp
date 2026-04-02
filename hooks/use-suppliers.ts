"use client";

import { useCallback } from "react";
import useSWR from "swr";

import type { Supplier } from "@/lib/app-types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSuppliers() {
  const { data, error, mutate } = useSWR<{ suppliers?: Supplier[] }>("/api/suppliers", fetcher);

  const setSuppliers = useCallback(
    (value: Supplier[] | ((current: Supplier[]) => Supplier[])) => {
      void mutate((current) => {
        const suppliers = current?.suppliers ?? [];
        const nextSuppliers = typeof value === "function" ? value(suppliers) : value;

        return {
          suppliers: nextSuppliers,
        };
      }, false);
    },
    [mutate],
  );

  return {
    suppliers: data?.suppliers ?? [],
    hydrated: data !== undefined || error !== undefined,
    setSuppliers,
  };
}
