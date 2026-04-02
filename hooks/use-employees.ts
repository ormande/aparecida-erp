"use client";

import { useCallback } from "react";
import useSWR from "swr";

import type { Employee } from "@/lib/app-types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useEmployees() {
  const { data, error, mutate } = useSWR<{ employees?: Employee[] }>("/api/employees", fetcher);

  const setEmployees = useCallback(
    (value: Employee[] | ((current: Employee[]) => Employee[])) => {
      void mutate((current) => {
        const employees = current?.employees ?? [];
        const nextEmployees = typeof value === "function" ? value(employees) : value;

        return {
          employees: nextEmployees,
        };
      }, false);
    },
    [mutate],
  );

  return {
    employees: data?.employees ?? [],
    hydrated: data !== undefined || error !== undefined,
    setEmployees,
  };
}
