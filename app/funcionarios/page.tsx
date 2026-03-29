"use client";

import Link from "next/link";
import { Eye, HardHat, Pencil, Plus, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEmployees } from "@/hooks/use-employees";

function AccessLevelBadge({ level }: { level: "Proprietário" | "Funcionário" }) {
  const styles =
    level === "Proprietário"
      ? "bg-[rgba(201,168,76,0.16)] text-[var(--color-gold-dark)]"
      : "bg-blue-500/15 text-blue-700 dark:text-blue-300";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{level}</span>;
}

export default function FuncionariosPage() {
  const { employees } = useEmployees();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Funcionários"
        subtitle="Gerencie os registros da equipe com nível de acesso e situação operacional."
        actions={
          <Link
            href="/funcionarios/novo"
            className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo funcionário
          </Link>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={employees}
          pageSize={10}
          searchPlaceholder="Buscar por nome, e-mail ou telefone"
          searchKeys={[(row) => row.nomeCompleto, (row) => row.email, (row) => row.telefone]}
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
                  <Link
                    href={`/funcionarios/${row.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-[12px] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Link>
                  <Link
                    href={`/funcionarios/${row.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-[12px] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success(`Funcionário ${row.nomeCompleto} marcado para desativação no protótipo.`)}
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
    </div>
  );
}
