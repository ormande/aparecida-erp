"use client";

import { useEffect, useMemo, useState } from "react";

import type { Employee } from "@/lib/app-types";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/employees", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar funcionários.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setEmployees(data.employees ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setEmployees([]);
        }
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return useMemo(
    () => ({
      employees,
      hydrated,
      setEmployees,
    }),
    [employees, hydrated],
  );
}
