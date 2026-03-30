"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmployeeForm } from "@/components/employees/employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Employee } from "@/lib/app-types";

function AccessLevelBadge({ level }: { level: "Proprietário" | "Funcionário" }) {
  const styles =
    level === "Proprietário"
      ? "bg-[rgba(201,168,76,0.16)] text-[var(--color-gold-dark)]"
      : "bg-blue-500/15 text-blue-700 dark:text-blue-300";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{level}</span>;
}

export default function FuncionarioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
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
    </div>
  );
}
