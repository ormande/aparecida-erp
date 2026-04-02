"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { NsaLogo } from "@/components/layout/nsa-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function maskPhoneBr(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function FirstAccessScreen() {
  const [companyName, setCompanyName] = useState("");
  const [unitName, setUnitName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!companyName.trim() || !unitName.trim() || !ownerName.trim() || !email.trim() || !password.trim()) {
      toast.error("Preencha os campos obrigat\u00f3rios.");
      return;
    }

    if (companyName.trim().length < 2 || unitName.trim().length < 2) {
      toast.error("Nome da empresa e da unidade precisam ter pelo menos 2 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas n\u00e3o conferem.");
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
      toast.error(data.message ?? "N\u00e3o foi poss\u00edvel concluir o primeiro acesso.");
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (loginResult?.error) {
      toast.error("Primeiro acesso criado, mas o login autom\u00e1tico falhou.");
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
              {"Configure a empresa, a primeira unidade e o usu\u00e1rio propriet\u00e1rio."}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="companyName" className="text-white">Nome da empresa</Label>
              <Input
                id="companyName"
                placeholder="Ex.: Borracharia Silva"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unitName" className="text-white">Primeira unidade</Label>
              <Input
                id="unitName"
                placeholder="Ex.: Matriz"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ownerName" className="text-white">Seu nome *</Label>
              <Input
                id="ownerName"
                placeholder="Ex.: Maria Silva"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-white">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(maskPhoneBr(e.target.value))}
                className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-white">E-mail *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-white">Senha *</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/10 bg-white/95 text-[var(--color-navy)]"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirmar senha *</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-white/10 bg-white/95 text-[var(--color-navy)]"
            />
          </div>

          <Button className="h-12 rounded-2xl" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Configurando..." : "Concluir primeiro acesso"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center pt-2 text-xs text-[rgba(240,244,248,0.58)]">
          {"\u00a9"} 2026 Aparecida ERP
        </CardFooter>
      </Card>
    </div>
  );
}
