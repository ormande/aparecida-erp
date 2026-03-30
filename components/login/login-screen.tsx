"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useSetupStatus } from "@/hooks/use-setup-status";

export function LoginScreen() {
  const { isAuthenticated, login } = useAuth();
  const { hasUsers, isLoading } = useSetupStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !submitting;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(searchParams.get("next") || "/dashboard");
    }
  }, [isAuthenticated, router, searchParams]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha e-mail e senha para entrar.");
      return;
    }

    setSubmitting(true);

    const result = await login(email, password);

    setSubmitting(false);

    if (result?.error) {
      toast.error("E-mail ou senha inválidos.");
      return;
    }

    toast.success("Login realizado com sucesso.");
    router.push(searchParams.get("next") || "/dashboard");
  }

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
            <p className="text-sm text-[rgba(240,244,248,0.72)]">Acesso interno ao sistema da borracharia</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-white">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-white">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              placeholder="Sua senha"
            />
          </div>

          <Button
            className="h-12 w-full rounded-2xl border border-[var(--color-gold-dark)] bg-[var(--color-gold)] text-[var(--color-navy)] hover:bg-[var(--color-gold-light)]"
            onClick={handleLogin}
            disabled={!canSubmit}
          >
            <LogIn className="mr-2 h-4 w-4" />
            {submitting ? "Entrando..." : "Entrar no sistema"}
          </Button>

          {hasUsers === false && !isLoading ? (
            <Link href="/primeiro-acesso" className="block">
              <Button
                variant="outline"
                className="h-11 w-full border-[rgba(201,168,76,0.5)] bg-transparent text-[var(--color-gold-light)] hover:bg-[rgba(201,168,76,0.08)] hover:text-[var(--color-gold-light)]"
              >
                Primeiro acesso
              </Button>
            </Link>
          ) : null}
        </CardContent>
        <CardFooter className="justify-center pt-2 text-xs text-[rgba(240,244,248,0.58)]">
          © 2026 Aparecida ERP
        </CardFooter>
      </Card>
    </div>
  );
}
