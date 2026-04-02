import { Suspense } from "react";

import { SelecionarUnidadeClient } from "./selecionar-unidade-client";

export default function SelecionarUnidadePage() {
  return (
    <Suspense
      fallback={
        <div className="navy-pattern flex min-h-screen items-center justify-center px-4 py-12">
          <p className="text-sm text-[rgba(240,244,248,0.72)]">Carregando...</p>
        </div>
      }
    >
      <SelecionarUnidadeClient />
    </Suspense>
  );
}
