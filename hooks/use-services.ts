"use client";

import { useCallback } from "react";
import useSWR from "swr";

import type { AppService } from "@/lib/db-mappers";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useServices() {
  const { data, error, mutate } = useSWR<{ services?: AppService[] }>("/api/services", fetcher);

  const setServices = useCallback(
    (value: AppService[] | ((current: AppService[]) => AppService[])) => {
      void mutate((current) => {
        const services = current?.services ?? [];
        const nextServices = typeof value === "function" ? value(services) : value;

        return {
          services: nextServices,
        };
      }, false);
    },
    [mutate],
  );

  return {
    services: data?.services ?? [],
    hydrated: data !== undefined || error !== undefined,
    setServices,
  };
}
