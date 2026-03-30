"use client";

import { useEffect, useMemo, useState } from "react";

import type { Client } from "@/lib/app-types";

export function useCustomers() {
  const [customers, setCustomers] = useState<Client[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/customers", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar clientes.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setCustomers(data.customers ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setCustomers([]);
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
      customers,
      hydrated,
      setCustomers,
    }),
    [customers, hydrated],
  );
}
