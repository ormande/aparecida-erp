"use client";

import { useEffect, useMemo, useState } from "react";

type ReceivableRow = {
  id: string;
  description: string;
  clientId: string;
  value: number;
  dueDate: string;
  status: "Pago" | "Pendente" | "Vencido";
  unitId?: string;
  serviceOrderId?: string;
  originType: "SERVICE_ORDER" | "MANUAL";
  installmentNumber?: number;
  installmentCount?: number;
  clientName: string;
  unitName: string;
};

export function useReceivables(filters?: {
  status?: string;
  period?: string;
  unitId?: string;
}) {
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.period) params.set("period", filters.period);
    if (filters?.unitId) params.set("unitId", filters.unitId);

    fetch(`/api/receivables${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar contas a receber.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setReceivables(data.receivables ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setReceivables([]);
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
      receivables,
      hydrated,
      setReceivables,
    }),
    [hydrated, receivables],
  );
}
