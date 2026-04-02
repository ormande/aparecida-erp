"use client";

import { useCallback } from "react";
import useSWR from "swr";

import type { AppVehicle } from "@/lib/db-mappers";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useVehicles(customerId?: string) {
  const query = customerId ? `?customerId=${customerId}` : "";
  const { data, error, mutate } = useSWR<{ vehicles?: AppVehicle[] }>(`/api/vehicles${query}`, fetcher);

  const setVehicles = useCallback(
    (value: AppVehicle[] | ((current: AppVehicle[]) => AppVehicle[])) => {
      void mutate((current) => {
        const vehicles = current?.vehicles ?? [];
        const nextVehicles = typeof value === "function" ? value(vehicles) : value;

        return {
          vehicles: nextVehicles,
        };
      }, false);
    },
    [mutate],
  );

  return {
    vehicles: data?.vehicles ?? [],
    hydrated: data !== undefined || error !== undefined,
    setVehicles,
  };
}
