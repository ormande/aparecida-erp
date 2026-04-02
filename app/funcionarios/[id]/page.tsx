"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { EmployeeForm } from "@/components/employees/employee-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  currency,
  formatMoneyMaskFromNumber,
  formatMoneyMaskInput,
  parseMoneyMaskInput,
} from "@/lib/formatters";
import type { Employee, EmployeeAccessLevel } from "@/lib/app-types";

function AccessLevelBadge({ level }: { level: EmployeeAccessLevel }) {
  const styles =
    level === "Proprietário"
      ? "bg-[rgba(201,168,76,0.16)] text-[var(--color-gold-dark)]"
      : level === "Gestor"
        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
        : "bg-blue-500/15 text-blue-700 dark:text-blue-300";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{level}</span>;
}

export default function FuncionarioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  const isProprietario = session?.user?.accessLevel === "PROPRIETARIO";

  useEffect(() => {
    let active = true;

    fetch(`/api/employees/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Funcionário não encontrado.");
        }
        return data;
      })
      .then((data) => {
        if (active) {
          setEmployee(data.employee);
        }
      })
      .catch(() => {
        if (active) {
          setEmployee(null);
        }
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  useEffect(() => {
    if (goalOpen && employee) {
      setGoalInput(
        employee.monthlyGoal != null ? formatMoneyMaskFromNumber(employee.monthlyGoal) : "",
      );
    }
  }, [goalOpen, employee]);

  if (hydrated && !employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Funcionário não encontrado" subtitle="Esse registro não está mais disponível." />
        <button
          type="button"
          onClick={() => router.push("/funcionarios")}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
        >
          Voltar para funcionários
        </button>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  async function handleSaveGoal() {
    if (!employee) {
      return;
    }
    const monthlyGoal = parseMoneyMaskInput(goalInput);

    setGoalSaving(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/goal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyGoal }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message ?? "Não foi possível salvar a meta.");
        return;
      }
      setEmployee((prev) =>
        prev ? { ...prev, monthlyGoal: data.user.monthlyGoal as number | null } : prev,
      );
      toast.success("Meta salva com sucesso.");
      setGoalOpen(false);
    } catch {
      toast.error("Não foi possível salvar a meta.");
    } finally {
      setGoalSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={employee.nomeCompleto} subtitle={employee.email} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <EmployeeForm
              employee={employee}
              submitLabel="Salvar alterações"
              onSubmit={async (values) => {
                const response = await fetch(`/api/employees/${employee.id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(values),
                });

                const data = await response.json();

                if (!response.ok) {
                  toast.error(data.message ?? "Não foi possível atualizar o funcionário.");
                  return;
                }

                setEmployee(data.employee);
                toast.success("Funcionário cadastrado com sucesso!");
              }}
            />
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>Resumo</CardTitle>
            {isProprietario ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setGoalOpen(true)}>
                Definir meta
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nível de acesso</span>
              <AccessLevelBadge level={employee.nivelAcesso} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Situação</span>
              <StatusBadge status={employee.situacao} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Meta mensal</span>
              <span>{employee.monthlyGoal != null ? currency(employee.monthlyGoal) : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{employee.telefone || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span>{employee.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Meta mensal</DialogTitle>
            <DialogDescription>
              Defina o valor da meta de faturamento ou desempenho mensal para este colaborador. Deixe em branco para
              remover a meta.
            </DialogDescription>
          </DialogHeader>
          {employee.monthlyGoal != null ? (
            <p className="text-sm text-muted-foreground">
              Valor atual: <span className="font-medium text-foreground">{currency(employee.monthlyGoal)}</span>
            </p>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="monthly-goal-input">Nova meta (R$)</Label>
            <InputGroup className="h-9 rounded-2xl">
              <InputGroupAddon>
                <InputGroupText>R$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="monthly-goal-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0,00"
                value={goalInput}
                onChange={(e) => setGoalInput(formatMoneyMaskInput(e.target.value))}
                disabled={goalSaving}
              />
            </InputGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGoalOpen(false)} disabled={goalSaving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleSaveGoal()} disabled={goalSaving}>
              {goalSaving ? "Salvando..." : "Salvar meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
