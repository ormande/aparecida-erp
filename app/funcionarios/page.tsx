"use client";

import Link from "next/link";
import { Eye, HardHat, Pencil, Plus, Target, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeePreviewDialog } from "@/components/employees/employee-preview-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useEmployees } from "@/hooks/use-employees";
import type { EmployeeAccessLevel } from "@/lib/app-types";
import {
  currency,
  formatMoneyMaskFromNumber,
  formatMoneyMaskInput,
  parseMoneyMaskInput,
} from "@/lib/formatters";

function AccessLevelBadge({ level }: { level: EmployeeAccessLevel }) {
  const styles =
    level === "Proprietário"
      ? "bg-[rgba(201,168,76,0.16)] text-[var(--color-gold-dark)]"
      : level === "Gestor"
        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
        : "bg-blue-500/15 text-blue-700 dark:text-blue-300";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{level}</span>;
}

export default function FuncionariosPage() {
  const { user } = useAuth();
  const { employees, setEmployees } = useEmployees();
  const [open, setOpen] = useState(false);
  const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);
  const [goalEmployee, setGoalEmployee] = useState<{
    id: string;
    name: string;
    monthlyGoal: number | null;
  } | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);
  const searchKeys = useMemo<Array<(row: (typeof employees)[number]) => string>>(
    () => [(row) => row.nomeCompleto, (row) => row.email, (row) => row.telefone],
    [],
  );
  const viewingEmployee = employees.find((employee) => employee.id === viewingEmployeeId) ?? null;

  useEffect(() => {
    if (goalEmployee) {
      setGoalInput(
        goalEmployee.monthlyGoal != null ? formatMoneyMaskFromNumber(goalEmployee.monthlyGoal) : "",
      );
    }
  }, [goalEmployee]);

  async function patchMonthlyGoal(id: string, monthlyGoal: number | null) {
    const response = await fetch(`/api/employees/${id}/goal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyGoal }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível atualizar a meta.");
      return false;
    }
    setEmployees((items) =>
      items.map((item) =>
        item.id === id ? { ...item, monthlyGoal: data.user.monthlyGoal as number | null } : item,
      ),
    );
    return true;
  }

  async function handleSaveGoal() {
    if (!goalEmployee) {
      return;
    }
    const monthlyGoal = parseMoneyMaskInput(goalInput);
    setGoalSaving(true);
    try {
      const ok = await patchMonthlyGoal(goalEmployee.id, monthlyGoal);
      if (ok) {
        toast.success("Meta salva com sucesso.");
        setGoalEmployee(null);
      }
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleRemoveGoal() {
    if (!goalEmployee) {
      return;
    }
    setGoalSaving(true);
    try {
      const ok = await patchMonthlyGoal(goalEmployee.id, null);
      if (ok) {
        toast.success("Meta removida.");
        setGoalEmployee(null);
      }
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleDeactivate(id: string, name: string) {
    const current = employees.find((employee) => employee.id === id);

    if (!current) {
      return;
    }

    const response = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...current,
        situacao: "Inativo",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível desativar o funcionário.");
      return;
    }

    setEmployees((items) => items.map((item) => (item.id === id ? data.employee : item)));
    toast.success(`Funcionário ${name} desativado com sucesso!`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Funcionários"
        subtitle="Gerencie os registros da equipe com nível de acesso e situação operacional."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo funcionário
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo funcionário</DialogTitle>
                <DialogDescription>Cadastre o funcionário sem sair da lista.</DialogDescription>
              </DialogHeader>
              <EmployeeForm
                submitLabel="Salvar funcionário"
                onSubmit={async (values) => {
                  const response = await fetch("/api/employees", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(values),
                  });

                  const data = await response.json().catch(() => ({}));

                  if (!response.ok) {
                    toast.error(
                      (data as { message?: string; error?: string }).message ??
                        (data as { error?: string }).error ??
                        "Não foi possível cadastrar o funcionário.",
                    );
                    return;
                  }

                  toast.success("Funcionário cadastrado com sucesso!");
                  setOpen(false);
                  await mutate("/api/employees");
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={employees}
          pageSize={10}
          searchPlaceholder="Buscar por nome, e-mail ou telefone"
          searchKeys={searchKeys}
          columns={[
            {
              key: "name",
              header: "Nome",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[rgba(201,168,76,0.14)] p-2 text-[var(--color-gold-dark)]">
                    <HardHat className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{row.nomeCompleto}</span>
                </div>
              ),
            },
            { key: "email", header: "E-mail", render: (row) => row.email },
            { key: "phone", header: "Telefone", render: (row) => row.telefone || "-" },
            { key: "access", header: "Nível de acesso", render: (row) => <AccessLevelBadge level={row.nivelAcesso} /> },
            { key: "status", header: "Situação", render: (row) => <StatusBadge status={row.situacao} /> },
            {
              key: "monthlyGoal",
              header: "Meta mensal",
              render: (row) => (row.monthlyGoal != null ? currency(row.monthlyGoal) : "—"),
            },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewingEmployeeId(row.id)}>
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                  <Link href={`/funcionarios/${row.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  {user?.accessLevel === "PROPRIETARIO" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setGoalEmployee({
                          id: row.id,
                          name: row.nomeCompleto,
                          monthlyGoal: row.monthlyGoal,
                        })
                      }
                    >
                      <Target className="mr-1 h-4 w-4" />
                      Meta
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(row.id, row.nomeCompleto)}
                    disabled={row.situacao === "Inativo"}
                  >
                    <UserX className="mr-1 h-4 w-4" />
                    Desativar
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <EmployeePreviewDialog
        open={Boolean(viewingEmployee)}
        onOpenChange={(open) => !open && setViewingEmployeeId(null)}
        employee={viewingEmployee}
      />

      <Dialog open={goalEmployee !== null} onOpenChange={(open) => !open && setGoalEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {goalEmployee ? `Meta mensal — ${goalEmployee.name}` : "Meta mensal"}
            </DialogTitle>
            <DialogDescription>Defina ou altere o valor da meta mensal em reais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="employees-goal-input">Valor (R$)</Label>
            <InputGroup className="h-9 rounded-2xl">
              <InputGroupAddon>
                <InputGroupText>R$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="employees-goal-input"
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
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {goalEmployee?.monthlyGoal != null ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void handleRemoveGoal()}
                  disabled={goalSaving}
                >
                  Remover meta
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setGoalEmployee(null)} disabled={goalSaving}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleSaveGoal()} disabled={goalSaving}>
                {goalSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
