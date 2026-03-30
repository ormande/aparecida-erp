"use client";

import { useEffect, useMemo, useState } from "react";

import type { AppService } from "@/lib/db-mappers";

export function useServices() {
  const [services, setServices] = useState<AppService[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/services", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar serviços.");
        }

        return response.json();
      })
      .then((data) => {
        if (active) {
          setServices(data.services ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setServices([]);
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
      services,
      hydrated,
      setServices,
    }),
    [hydrated, services],
  );
}
