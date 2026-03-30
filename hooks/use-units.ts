"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type AppUnit = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
};

export const unitsEvents = {
  changed: "app:units-changed",
};

async function fetchUnits() {
  const response = await fetch("/api/units", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Falha ao carregar unidades.");
  }

  const data = await response.json();
  return data.units ?? [];
}

export function useUnits() {
  const [units, setUnits] = useState<AppUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextUnits = await fetchUnits();
      setUnits(nextUnits);
    } catch {
      setUnits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function handleUnitsChanged() {
      void refresh();
    }

    window.addEventListener(unitsEvents.changed, handleUnitsChanged);
    return () => {
      window.removeEventListener(unitsEvents.changed, handleUnitsChanged);
    };
  }, [refresh]);

  return useMemo(
    () => ({
      units,
      isLoading,
      addUnit(unit: AppUnit) {
        setUnits((current) => [...current, unit]);
        window.dispatchEvent(new Event(unitsEvents.changed));
      },
      updateUnit(unit: AppUnit) {
        setUnits((current) => current.map((item) => (item.id === unit.id ? unit : item)));
        window.dispatchEvent(new Event(unitsEvents.changed));
      },
      refresh,
    }),
    [isLoading, refresh, units],
  );
}
