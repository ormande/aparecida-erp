"use client";

import { Info, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEmployees } from "@/hooks/use-employees";
import { useAuth } from "@/hooks/use-auth";
import { useUnits } from "@/hooks/use-units";

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ConfiguracoesPage() {
  const [stockEnabled, setStockEnabled] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState("");
  const [unitDrafts, setUnitDrafts] = useState<Record<string, { name: string; address: string; phone: string }>>({});
  const [savingUnitId, setSavingUnitId] = useState<string | null>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const { user } = useAuth();

  const { units, addUnit, updateUnit } = useUnits();
  const { employees } = useEmployees();

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

  const activeUnitDraft = activeUnitId ? unitDrafts[activeUnitId] : null;

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

  async function handleSaveCompany() {
    setSavingCompany(true);

    const response = await fetch("/api/company", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: companyName,
        address: "",
        phone: "",
      }),
    });

    const data = await response.json();
    setSavingCompany(false);

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível salvar a empresa.");
      return;
    }

    setCompanyName(data.company.name ?? "");
    toast.success("Dados da empresa atualizados com sucesso!");
  }

  async function handleSaveUnit() {
    if (!activeUnitId || !activeUnitDraft) {
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

  const userCards = useMemo(
    () =>
      employees.map((user) => (
        <div key={user.id} className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
          <div>
            <p className="font-medium">{user.nomeCompleto}</p>
            <p className="text-sm text-muted-foreground">{user.nivelAcesso}</p>
          </div>
          <Badge>{user.situacao}</Badge>
        </div>
      )),
    [employees],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        subtitle="Ajuste os dados da empresa, unidades, usuários e módulos disponíveis."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome da empresa</Label>
              <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </div>
            <Button onClick={handleSaveCompany} disabled={savingCompany}>
              {savingCompany ? "Salvando..." : "Salvar empresa"}
            </Button>
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">{userCards}</CardContent>
        </Card>

        <Card className="surface-card border-none xl:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle>Áreas de trabalho</CardTitle>
              <Dialog open={unitModalOpen} onOpenChange={setUnitModalOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline">
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
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {units.map((unit, index) => (
                <Button
                  key={unit.id}
                  variant={unit.id === activeUnitId ? "default" : "outline"}
                  onClick={() => setActiveUnitId(unit.id)}
                >
                  {unitDrafts[unit.id]?.name || `Unidade ${index + 1}`}
                </Button>
              ))}
            </div>

            {activeUnitDraft ? (
              <div className="grid gap-4 rounded-2xl border bg-muted/20 p-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Nome da unidade</Label>
                  <Input
                    value={activeUnitDraft.name}
                    onChange={(event) =>
                      setUnitDrafts((current) => ({
                        ...current,
                        [activeUnitId]: { ...current[activeUnitId], name: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={activeUnitDraft.phone}
                    onChange={(event) =>
                      setUnitDrafts((current) => ({
                        ...current,
                        [activeUnitId]: { ...current[activeUnitId], phone: maskPhone(event.target.value) },
                      }))
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={activeUnitDraft.address}
                    onChange={(event) =>
                      setUnitDrafts((current) => ({
                        ...current,
                        [activeUnitId]: { ...current[activeUnitId], address: event.target.value },
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={handleSaveUnit} disabled={savingUnitId === activeUnitId}>
                    {savingUnitId === activeUnitId ? "Salvando..." : "Salvar unidade atual"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Nenhuma unidade cadastrada ainda.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
              <div>
                <p className="font-medium">Autenticação interna</p>
                <p className="text-sm text-muted-foreground">Login com e-mail e senha do próprio sistema</p>
              </div>
              <Badge>Ativo</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4">
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
                <DialogTrigger render={<Button variant="outline" size="sm">Alterar senha</Button>} />
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

        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Módulos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-2xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Módulo de Estoque</p>
                  <Tooltip>
                    <TooltipTrigger render={<Info className="h-4 w-4 text-muted-foreground" />} />
                    <TooltipContent>
                      <p>Ative quando quiser começar a usar o controle de estoque.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Neste momento, o toggle é ilustrativo. A flag real continua em `lib/config.ts`.
                </p>
              </div>
              <Switch checked={stockEnabled} onCheckedChange={setStockEnabled} />
            </div>
          </CardContent>
        </Card>

        {user?.accessLevel === "PROPRIETARIO" ? (
          <Card className="surface-card border-none xl:col-span-2">
            <CardHeader>
              <CardTitle>Backup de Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Exporte todos os dados da empresa em formato JSON. Guarde o arquivo em local seguro para uso em caso de
                restauração.
              </p>
              <Button onClick={handleExportBackup} disabled={exportingBackup}>
                {exportingBackup ? "Exportando..." : "Exportar backup"}
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
