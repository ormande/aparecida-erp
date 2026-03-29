"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmployeeForm, employeeFormValuesToEmployee } from "@/components/employees/employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function FuncionarioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { employees, hydrated, updateEmployee } = useEmployees();
  const employee = employees.find((item) => item.id === params.id);

  if (hydrated && !employee) {
    return (
      <div className="space-y-6">
        <PageHeader title="Funcionário não encontrado" subtitle="Esse registro não está mais disponível nesta sessão." />
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
              onSubmit={(values) => {
                updateEmployee(employeeFormValuesToEmployee(values, employee));
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
