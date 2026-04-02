"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function SelecionarUnidadeClient() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const nextHref = searchParams.get("next") ?? "/dashboard";
  const units = session?.user?.units ?? [];
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(
        `/login?next=${encodeURIComponent(`/selecionar-unidade?next=${encodeURIComponent(nextHref)}`)}`,
      );
    }
  }, [nextHref, router, status]);

  async function handleSelect(unitId: string) {
    setSelectingId(unitId);
    try {
      await update({ activeUnitId: unitId });
      toast.success("Unidade selecionada.");
      router.replace(nextHref);
    } catch {
      toast.error("Não foi possível salvar a unidade. Tente novamente.");
    } finally {
      setSelectingId(null);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="navy-pattern flex min-h-screen items-center justify-center px-4 py-12">
        <p className="text-sm text-[rgba(240,244,248,0.72)]">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="navy-pattern relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,201,106,0.1),transparent_28%),linear-gradient(135deg,transparent_20%,rgba(255,255,255,0.02)_100%)]" />
      <Card className="relative w-full max-w-lg border-white/10 bg-[rgba(13,27,42,0.78)] text-white shadow-2xl">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto">
            <NsaLogo compact className="justify-center" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Selecione a unidade</h1>
            <p className="text-sm text-[rgba(240,244,248,0.72)]">
              Escolha em qual unidade deseja trabalhar.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {units.map((unit) => (
            <Button
              key={unit.id}
              type="button"
              variant="outline"
              className="flex h-auto w-full justify-start gap-3 border-white/15 bg-white/5 py-4 text-left text-white hover:bg-white/10 hover:text-white"
              disabled={selectingId !== null}
              onClick={() => void handleSelect(unit.id)}
            >
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-gold-light)]" />
              <span className="font-medium">{unit.name}</span>
              {selectingId === unit.id ? (
                <span className="ml-auto text-xs text-[rgba(240,244,248,0.58)]">Salvando...</span>
              ) : null}
            </Button>
          ))}
        </CardContent>
        <CardFooter className="justify-center pt-2 text-xs text-[rgba(240,244,248,0.58)]">
          © 2026 Aparecida ERP
        </CardFooter>
      </Card>
    </div>
  );
}
