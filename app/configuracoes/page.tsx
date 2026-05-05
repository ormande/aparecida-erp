"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Archive, Building2, Link2, MapPin, Pencil, Plus, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useUnits } from "@/hooks/use-units";
import { cn } from "@/lib/utils";

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function SectionHeader({
  icon: Icon,
  id,
  title,
  description,
}: {
  icon: LucideIcon;
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 id={id} className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [activeUnitId, setActiveUnitId] = useState("");
  const [unitDrafts, setUnitDrafts] = useState<Record<string, { name: string; address: string; phone: string }>>({});
  const [savingUnitId, setSavingUnitId] = useState<string | null>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [isEditingUnit, setIsEditingUnit] = useState(false);

  const { user } = useAuth();

  const { units, addUnit, updateUnit } = useUnits();

  useEffect(() => {
    let active = true;

    fetch("/api/company", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Falha ao carregar empresa.");
        }
        return data;
      })
      .then((data) => {
        if (active) {
          setCompanyName(data.company.name ?? "");
        }
      })
      .catch(() => {
        if (active) {
          setCompanyName("");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!units.length) {
      setActiveUnitId("");
      return;
    }

    setUnitDrafts((current) => {
      const next = { ...current };
      for (const unit of units) {
        next[unit.id] = {
          name: current[unit.id]?.name ?? unit.name,
          address: current[unit.id]?.address ?? unit.address ?? "",
          phone: current[unit.id]?.phone ?? unit.phone ?? "",
        };
      }
      return next;
    });

    setActiveUnitId((current) => (current && units.some((unit) => unit.id === current) ? current : units[0].id));
  }, [units]);

  useEffect(() => {
    setIsEditingUnit(false);
  }, [activeUnitId]);

  const activeUnitDraft = activeUnitId ? unitDrafts[activeUnitId] : null;

  const activeUnit = useMemo(() => units.find((u) => u.id === activeUnitId), [units, activeUnitId]);

  const isUnitDirty = useMemo(() => {
    if (!activeUnitId || !activeUnitDraft || !activeUnit) {
      return false;
    }
    return (
      activeUnitDraft.name !== activeUnit.name ||
      (activeUnitDraft.address ?? "") !== (activeUnit.address ?? "") ||
      (activeUnitDraft.phone ?? "") !== (activeUnit.phone ?? "")
    );
  }, [activeUnitId, activeUnitDraft, activeUnit]);

  async function handleCreateUnit() {
    if (!unitName.trim()) {
      toast.error("Informe o nome da unidade.");
      return;
    }

    setCreatingUnit(true);

    const response = await fetch("/api/units", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: unitName,
      }),
    });

    const data = await response.json();
    setCreatingUnit(false);

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível criar a unidade.");
      return;
    }

    addUnit(data.unit);
    setActiveUnitId(data.unit.id);
    setUnitName("");
    setUnitModalOpen(false);
    toast.success("Unidade criada com sucesso!");
  }

  function handleCancelUnitEdit() {
    if (!activeUnitId || !activeUnit) {
      setIsEditingUnit(false);
      return;
    }
    setUnitDrafts((current) => ({
      ...current,
      [activeUnitId]: {
        name: activeUnit.name,
        address: activeUnit.address ?? "",
        phone: activeUnit.phone ?? "",
      },
    }));
    setIsEditingUnit(false);
  }

  async function handleSaveUnit() {
    if (!activeUnitId || !activeUnitDraft || !isUnitDirty) {
      return;
    }

    setSavingUnitId(activeUnitId);

    const response = await fetch(`/api/units/${activeUnitId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(activeUnitDraft),
    });

    const data = await response.json();
    setSavingUnitId(null);

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível salvar a unidade.");
      return;
    }

    updateUnit(data.unit);
    setIsEditingUnit(false);
    toast.success("Unidade atualizada com sucesso!");
  }

  async function handleExportBackup() {
    try {
      setExportingBackup(true);

      const response = await fetch("/api/backup");

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error((data as { message?: string } | null)?.message ?? "Falha ao exportar backup.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";

      let filename = `backup-${new Date().toISOString().slice(0, 10)}.json`;

      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
      if (match?.[1]) {
        filename = decodeURIComponent(match[1]);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.setTimeout(() => window.URL.revokeObjectURL(url), 0);

      toast.success("Backup exportado com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar backup.");
    } finally {
      setExportingBackup(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A nova senha e a confirmação não coincidem.");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message ?? "Não foi possível alterar a senha.");
        return;
      }
      toast.success("Senha alterada com sucesso!");
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="space-y-12 pb-8">
      <PageHeader
        title="Configurações"
        subtitle="Organização da empresa, unidades, integrações e segurança da conta."
      />

      {/* Empresa */}
      <section className="space-y-4" aria-labelledby="sec-empresa">
        <SectionHeader
          icon={Building2}
          id="sec-empresa"
          title="Empresa"
          description="Identidade fixa nesta instalação personalizada para a Borracharia Nossa Senhora Aparecida."
        />
        <Card className="surface-card overflow-hidden border-none ring-1 ring-primary/[0.08]">
          <CardHeader className="border-b bg-muted/25 pb-4">
            <CardTitle className="text-base font-medium">Identidade</CardTitle>
            <CardDescription>
              O nome da empresa não pode ser alterado aqui. Equipe e níveis de acesso ficam em{" "}
              <Link
                href="/funcionarios"
                className="font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus:underline"
              >
                Funcionários
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Nome da empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                readOnly
                aria-readonly="true"
                className="cursor-not-allowed opacity-80"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled className="pointer-events-none opacity-60">
                Salvar empresa
              </Button>
              <span className="self-center text-xs text-muted-foreground">
                Personalização exclusiva — cadastro bloqueado para edição.
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border/80" />

      {/* Unidades */}
      <section className="space-y-4" aria-labelledby="sec-unidades">
        <SectionHeader
          icon={MapPin}
          id="sec-unidades"
          title="Áreas de trabalho"
          description="Unidades operacionais e dados de contato por local."
        />
        <Card className="surface-card overflow-hidden border-none ring-1 ring-primary/[0.08]">
          <CardHeader className="flex flex-col gap-4 border-b bg-muted/25 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-medium">Unidades</CardTitle>
              <CardDescription className="mt-1">Selecione abaixo para revisar ou editar dados da unidade.</CardDescription>
            </div>
            <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" className="shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar unidade
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova unidade</DialogTitle>
                  <DialogDescription>Cadastre uma nova unidade operacional para a empresa.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="unitName">Nome da unidade</Label>
                    <Input id="unitName" value={unitName} onChange={(event) => setUnitName(event.target.value)} />
                  </div>
                  <Button onClick={handleCreateUnit} disabled={creatingUnit}>
                    {creatingUnit ? "Criando..." : "Salvar unidade"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="flex flex-wrap gap-2">
              {units.map((unit, index) => (
                <Button
                  key={unit.id}
                  variant={unit.id === activeUnitId ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full",
                    unit.id === activeUnitId && "shadow-sm ring-1 ring-border",
                  )}
                  onClick={() => setActiveUnitId(unit.id)}
                >
                  {unitDrafts[unit.id]?.name || `Unidade ${index + 1}`}
                </Button>
              ))}
            </div>

            {activeUnitDraft && activeUnit ? (
              <div className="rounded-2xl border border-border bg-background p-4 md:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Dados da unidade selecionada</p>
                  <div className="flex flex-wrap gap-2">
                    {!isEditingUnit ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingUnit(true)}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </Button>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancelUnitEdit}>
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleSaveUnit()}
                          disabled={
                            savingUnitId === activeUnitId || !isUnitDirty || !isEditingUnit
                          }
                        >
                          {savingUnitId === activeUnitId ? "Salvando..." : "Salvar unidade atual"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className={cn(!isEditingUnit && "text-muted-foreground")}>Nome da unidade</Label>
                    <Input
                      value={activeUnitDraft.name}
                      readOnly={!isEditingUnit}
                      onChange={(event) =>
                        setUnitDrafts((current) => ({
                          ...current,
                          [activeUnitId]: { ...current[activeUnitId], name: event.target.value },
                        }))
                      }
                      className={cn(
                        !isEditingUnit &&
                          "cursor-not-allowed text-muted-foreground opacity-70 selection:bg-transparent",
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className={cn(!isEditingUnit && "text-muted-foreground")}>Telefone</Label>
                    <Input
                      value={activeUnitDraft.phone}
                      readOnly={!isEditingUnit}
                      onChange={(event) =>
                        setUnitDrafts((current) => ({
                          ...current,
                          [activeUnitId]: { ...current[activeUnitId], phone: maskPhone(event.target.value) },
                        }))
                      }
                      placeholder="(00) 00000-0000"
                      className={cn(
                        !isEditingUnit &&
                          "cursor-not-allowed text-muted-foreground opacity-70 selection:bg-transparent",
                      )}
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label className={cn(!isEditingUnit && "text-muted-foreground")}>Endereço</Label>
                    <Input
                      value={activeUnitDraft.address}
                      readOnly={!isEditingUnit}
                      onChange={(event) =>
                        setUnitDrafts((current) => ({
                          ...current,
                          [activeUnitId]: { ...current[activeUnitId], address: event.target.value },
                        }))
                      }
                      className={cn(
                        !isEditingUnit &&
                          "cursor-not-allowed text-muted-foreground opacity-70 selection:bg-transparent",
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Nenhuma unidade cadastrada ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border/80" />

      {/* Integrações + Segurança */}
      <section className="space-y-4" aria-labelledby="sec-conta">
        <SectionHeader
          icon={Shield}
          id="sec-conta"
          title="Conta e integrações"
          description="Acesso e serviços conectados ao sistema."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="surface-card h-full border-none ring-1 ring-primary/[0.08]">
            <CardHeader className="border-b bg-muted/25 pb-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <CardTitle className="text-base font-medium">Integrações</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium">Autenticação interna</p>
                  <p className="text-sm text-muted-foreground">Login com e-mail e senha do próprio sistema</p>
                </div>
                <Badge variant="outline" className="rounded-full border-border">
                  Ativo
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-card h-full border-none ring-1 ring-primary/[0.08]">
            <CardHeader className="border-b bg-muted/25 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <CardTitle className="text-base font-medium">Segurança</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Senha de acesso</p>
                  <p className="text-sm text-muted-foreground">Altere sua senha de login</p>
                </div>
                <Dialog
                  open={passwordModalOpen}
                  onOpenChange={(open) => {
                    setPasswordModalOpen(open);
                    if (!open) {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }
                  }}
                >
                  <DialogTrigger render={<Button variant="outline" size="sm" className="shrink-0">Alterar senha</Button>} />
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Alterar senha</DialogTitle>
                      <DialogDescription>
                        Informe sua senha atual e escolha uma nova senha com pelo menos 6 caracteres.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                      <div className="grid gap-2">
                        <Label htmlFor="currentPassword">Senha atual</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="newPassword">Nova senha</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleChangePassword} disabled={changingPassword}>
                        {changingPassword ? "Alterando..." : "Confirmar alteração"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {user?.accessLevel === "PROPRIETARIO" ? (
        <>
          <Separator className="bg-border/80" />
          <section className="space-y-4" aria-labelledby="sec-backup">
            <SectionHeader
              icon={Archive}
              id="sec-backup"
              title="Backup de dados"
              description="Exportação completa em JSON para arquivo seguro."
            />
            <Card className="surface-card border-none ring-1 ring-primary/[0.08]">
              <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  Exporte todos os dados da empresa em formato JSON. Guarde o arquivo em local seguro para uso em caso de restauração.
                </p>
                <Button onClick={handleExportBackup} disabled={exportingBackup} className="shrink-0">
                  {exportingBackup ? "Exportando..." : "Exportar backup"}
                </Button>
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
