"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { useUnits } from "@/hooks/use-units";

export function useCurrentUnit() {
  const { data: session, status } = useSession();
  const { units, isLoading: unitsLoading } = useUnits();

  const unitId = useMemo(() => {
    const raw = session?.activeUnitId ?? session?.user?.activeUnitId;
    if (raw === undefined || raw === null) {
      return "";
    }
    return raw;
  }, [session]);

  const currentUnit = useMemo(() => {
    if (unitId === "") {
      return null;
    }
    return units.find((unit) => unit.id === unitId) ?? null;
  }, [unitId, units]);

  return useMemo(
    () => ({
      unitId,
      currentUnit,
      isLoading: status === "loading" || unitsLoading,
    }),
    [currentUnit, status, unitId, unitsLoading],
  );
}
