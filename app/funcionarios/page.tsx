"use client";

import Link from "next/link";
import { Eye, HardHat, Pencil, Plus, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { EmployeePreviewDialog } from "@/components/employees/employee-preview-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEmployees } from "@/hooks/use-employees";
import type { EmployeeAccessLevel } from "@/lib/app-types";

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
  const { employees, setEmployees } = useEmployees();
  const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);
  const searchKeys = useMemo<Array<(row: (typeof employees)[number]) => string>>(
    () => [(row) => row.nomeCompleto, (row) => row.email, (row) => row.telefone],
    [],
  );
  const viewingEmployee = employees.find((employee) => employee.id === viewingEmployeeId) ?? null;

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
          <Link href="/funcionarios/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo funcionário
            </Button>
          </Link>
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
    </div>
  );
}
