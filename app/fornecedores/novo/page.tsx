"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function NovoFornecedorPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo fornecedor"
        subtitle="Cadastre parceiros reais da empresa para compras e despesas futuras."
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            submitLabel="Salvar fornecedor"
            onSubmit={async (values) => {
              const response = await fetch("/api/suppliers", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível cadastrar o fornecedor.");
                return;
              }

              toast.success("Fornecedor cadastrado com sucesso!");
              router.push("/fornecedores");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
