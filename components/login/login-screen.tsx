"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, LogIn } from "lucide-react";
import { toast } from "sonner";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

export function LoginScreen() {
  const { isAuthenticated, loginDemo } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="navy-pattern relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,201,106,0.1),transparent_28%),linear-gradient(135deg,transparent_20%,rgba(255,255,255,0.02)_100%)]" />
      <Card className="relative w-full max-w-md border-white/10 bg-[rgba(13,27,42,0.78)] text-white shadow-2xl">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto">
            <NsaLogo compact className="justify-center" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold text-white">Aparecida ERP</h1>
            <p className="text-sm text-[rgba(240,244,248,0.72)]">Gestão para borracharias</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="block">
                  <Button
                    disabled
                    className="h-12 w-full cursor-not-allowed rounded-2xl bg-[rgba(201,168,76,0.22)] text-[var(--color-gold-light)] hover:bg-[rgba(201,168,76,0.22)]"
                  >
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Entrar com Google
                  </Button>
                </span>
              }
            />
            <TooltipContent>
              <p>Configuração necessária — veja o README</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="secondary"
            className="h-12 w-full rounded-2xl border border-white/10 bg-white text-[var(--color-navy)] hover:bg-white/90"
            onClick={() => {
              loginDemo();
              toast.success("Sessão demo iniciada com sucesso.");
              router.push(searchParams.get("next") || "/dashboard");
            }}
          >
            <LogIn className="mr-2 h-4 w-4" />
            Entrar como demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
        <CardFooter className="justify-center pt-2 text-xs text-[rgba(240,244,248,0.58)]">
          © 2025 Aparecida ERP
        </CardFooter>
      </Card>
    </div>
  );
}
