"use client";

import { useEffect, useMemo, useState } from "react";

import type { AppVehicle } from "@/lib/db-mappers";

export function useVehicles(customerId?: string) {
  const [vehicles, setVehicles] = useState<AppVehicle[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const query = customerId ? `?customerId=${customerId}` : "";

    fetch(`/api/vehicles${query}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar veículos.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setVehicles(data.vehicles ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setVehicles([]);
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
  }, [customerId]);

  return useMemo(
    () => ({
      vehicles,
      hydrated,
      setVehicles,
    }),
    [hydrated, vehicles],
  );
}
