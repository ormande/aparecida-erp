"use client";

import { useEffect, useMemo, useState } from "react";

import { authEvents, authStorageKeys } from "@/hooks/use-auth";
import { useUnits } from "@/hooks/use-units";

const GENERAL_WORKSPACE = "__general__";

function fromStorage(value: string | null) {
  return value === GENERAL_WORKSPACE ? "" : value ?? "";
}

function toStorage(value: string) {
  return value || GENERAL_WORKSPACE;
}

export function useCurrentUnit() {
  const { units, isLoading } = useUnits();
  const [unitId, setUnitId] = useState("");

  useEffect(() => {
    function handleStorageChange() {
      setUnitId(fromStorage(window.localStorage.getItem(authStorageKeys.workspace)));
    }

    window.addEventListener(authEvents.workspaceChanged, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    setUnitId(fromStorage(window.localStorage.getItem(authStorageKeys.workspace)));

    return () => {
      window.removeEventListener(authEvents.workspaceChanged, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!units.length) {
      return;
    }

    const validCurrent = unitId === "" || units.some((unit) => unit.id === unitId);
    const nextId = validCurrent ? unitId : units[0].id;

    setUnitId(nextId);
    window.localStorage.setItem(authStorageKeys.workspace, toStorage(nextId));
  }, [unitId, units]);

  return useMemo(
    () => ({
      unitId,
      currentUnit: unitId === "" ? null : units.find((unit) => unit.id === unitId) ?? null,
      isLoading,
    }),
    [isLoading, unitId, units],
  );
}
