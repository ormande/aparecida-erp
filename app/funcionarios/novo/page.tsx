"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { EmployeeForm } from "@/components/employees/employee-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function NovoFuncionarioPage() {
  const router = useRouter();

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
            onSubmit={async (values) => {
              const response = await fetch("/api/employees", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível cadastrar o funcionário.");
                return;
              }

              toast.success("Funcionário cadastrado com sucesso!");
              router.push("/funcionarios");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
