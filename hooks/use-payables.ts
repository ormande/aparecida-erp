"use client";

import { useEffect, useMemo, useState } from "react";

type PayableRow = {
  id: string;
  description: string;
  category: "Aluguel" | "Fornecedores" | "Água/Luz" | "Funcionários" | "Outros";
  value: number;
  dueDate: string;
  status: "Pago" | "Pendente" | "Vencido";
  unitId?: string;
  supplierId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  supplierName: string;
  unitName: string;
};

export function usePayables(filters?: {
  status?: string;
  period?: string;
  unitId?: string;
}) {
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.period) params.set("period", filters.period);
    if (filters?.unitId) params.set("unitId", filters.unitId);

    fetch(`/api/payables${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar contas a pagar.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setPayables(data.payables ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setPayables([]);
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
  }, [filters?.period, filters?.status, filters?.unitId]);

  return useMemo(
    () => ({
      payables,
      hydrated,
      setPayables,
    }),
    [hydrated, payables],
  );
}
