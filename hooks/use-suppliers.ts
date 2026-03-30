"use client";

import { useEffect, useMemo, useState } from "react";

import type { Supplier } from "@/lib/app-types";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/suppliers", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar fornecedores.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setSuppliers(data.suppliers ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setSuppliers([]);
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
      suppliers,
      hydrated,
      setSuppliers,
    }),
    [hydrated, suppliers],
  );
}
