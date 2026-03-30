"use client";

import { useEffect, useMemo, useState } from "react";

type ServiceOrderRow = {
  id: string;
  number: string;
  clientId: string | null;
  unitId?: string | null;
  unitName?: string | null;
  vehicleId: string | null;
  clientName: string;
  plate: string;
  servicesLabel: string;
  status: "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Cancelada";
  total: number;
  openedAt: string;
  dueDate?: string | null;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  isStandalone?: boolean;
  receivableStatus?: "PAGO" | "PENDENTE" | "VENCIDO" | null;
};

export function useServiceOrders(filters?: {
  unitId?: string;
  customerId?: string;
  vehicleId?: string;
}) {
  const [orders, setOrders] = useState<ServiceOrderRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filters?.unitId) params.set("unitId", filters.unitId);
    if (filters?.customerId) params.set("customerId", filters.customerId);
    if (filters?.vehicleId) params.set("vehicleId", filters.vehicleId);

    fetch(`/api/service-orders${params.toString() ? `?${params.toString()}` : ""}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar ordens de serviço.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setOrders(data.orders ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setOrders([]);
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
  }, [filters?.customerId, filters?.unitId, filters?.vehicleId]);

  return useMemo(
    () => ({
      orders,
      hydrated,
      setOrders,
    }),
    [hydrated, orders],
  );
}
