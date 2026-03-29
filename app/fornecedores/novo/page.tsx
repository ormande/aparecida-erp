"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SupplierForm, supplierFormValuesToSupplier } from "@/components/suppliers/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useSuppliers } from "@/hooks/use-suppliers";

export default function NovoFornecedorPage() {
  const router = useRouter();
  const { addSupplier } = useSuppliers();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo fornecedor"
        subtitle="Cadastre parceiros de compra e prestação de serviço sem depender de backend neste protótipo."
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            submitLabel="Salvar fornecedor"
            onSubmit={(values) => {
              addSupplier(supplierFormValuesToSupplier(values));
              toast.success("Fornecedor cadastrado com sucesso!");
              router.push("/fornecedores");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
