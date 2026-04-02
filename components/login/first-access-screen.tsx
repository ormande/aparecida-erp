"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetupStatus } from "@/hooks/use-setup-status";

export function FirstAccessScreen() {
  const { hasUsers, isLoading } = useSetupStatus();
  const [companyName, setCompanyName] = useState("Borracharia Nossa Senhora Aparecida");
  const [unitName, setUnitName] = useState("Unidade 1");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && hasUsers) {
      router.replace("/login");
    }
  }, [hasUsers, isLoading, router]);

  async function handleSubmit() {
    if (!ownerName.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    setSubmitting(true);

    const response = await fetch("/api/setup/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyName,
        unitName,
        ownerName,
        email,
        phone,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setSubmitting(false);
      toast.error(data.message ?? "Não foi possível concluir o primeiro acesso.");
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (loginResult?.error) {
      toast.error("Primeiro acesso criado, mas o login automático falhou.");
      router.push("/login");
      return;
    }

    toast.success("Primeiro acesso configurado com sucesso!");
    router.push("/dashboard");
  }

  return (
    <div className="navy-pattern relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,201,106,0.1),transparent_28%),linear-gradient(135deg,transparent_20%,rgba(255,255,255,0.02)_100%)]" />
      <Card className="relative w-full max-w-2xl border-white/10 bg-[rgba(13,27,42,0.78)] text-white shadow-2xl">
        <CardHeader className="space-y-6 text-center">
          <div className="mx-auto">
            <NsaLogo compact className="justify-center" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold text-white">Primeiro acesso</h1>
            <p className="text-sm text-[rgba(240,244,248,0.72)]">
              Configure a empresa, a primeira unidade e o usuário proprietário.
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="companyName" className="text-white">Nome da empresa</Label>
              <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitName" className="text-white">Primeira unidade</Label>
              <Input id="unitName" value={unitName} onChange={(e) => setUnitName(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ownerName" className="text-white">Seu nome *</Label>
              <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-white">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-white">E-mail *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-white">Senha *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirmar senha *</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="border-white/10 bg-white/95 text-[var(--color-navy)]" />
          </div>

          <Button className="h-12 rounded-2xl" onClick={handleSubmit} disabled={submitting || isLoading}>
            {submitting ? "Configurando..." : "Concluir primeiro acesso"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center pt-2 text-xs text-[rgba(240,244,248,0.58)]">
          © 2026 Aparecida ERP
        </CardFooter>
      </Card>
    </div>
  );
}
