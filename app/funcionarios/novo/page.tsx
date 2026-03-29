"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmployeeForm, employeeFormValuesToEmployee } from "@/components/employees/employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useEmployees } from "@/hooks/use-employees";

export default function NovoFuncionarioPage() {
  const router = useRouter();
  const { addEmployee } = useEmployees();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo funcionário"
        subtitle="Cadastre membros da equipe com nível de acesso e situação atual."
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de funcionário</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            submitLabel="Salvar funcionário"
            onSubmit={(values) => {
              addEmployee(employeeFormValuesToEmployee(values));
              toast.success("Funcionário cadastrado com sucesso!");
              router.push("/funcionarios");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
