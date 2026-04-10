"use client";

import { useSession } from "next-auth/react";
import { useMemo } from "react";

/**
 * Retorna a primeira unidade do usuário como padrão para pré-seleção em formulários.
 * O unitId definitivo de cada operação deve ser gerenciado localmente em cada form
 * e enviado explicitamente no payload da requisição.
 */
export function useCurrentUnit() {
  const { data: session, status } = useSession();

  const units = useMemo(() => session?.user?.units ?? [], [session]);

  const defaultUnit = useMemo(() => units[0] ?? null, [units]);

  return useMemo(
    () => ({
      unitId: defaultUnit?.id ?? "",
      currentUnit: defaultUnit,
      units,
      isLoading: status === "loading",
    }),
    [defaultUnit, status, units],
  );
}
