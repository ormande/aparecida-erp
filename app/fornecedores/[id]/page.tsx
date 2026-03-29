"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { SupplierForm, supplierFormValuesToSupplier } from "@/components/suppliers/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSuppliers } from "@/hooks/use-suppliers";
import { getSupplierDisplayName, getSupplierDocument } from "@/lib/mock-data";

export default function FornecedorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { suppliers, hydrated, updateSupplier } = useSuppliers();
  const supplier = suppliers.find((item) => item.id === params.id);

  if (hydrated && !supplier) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fornecedor não encontrado" subtitle="Esse registro não está mais disponível nesta sessão." />
        <LinkBack onClick={() => router.push("/fornecedores")} />
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={getSupplierDisplayName(supplier)}
        subtitle={`${supplier.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} • ${getSupplierDocument(supplier)}`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierForm
              supplier={supplier}
              submitLabel="Salvar alterações"
              onSubmit={(values) => {
                updateSupplier(supplierFormValuesToSupplier(values, supplier));
                toast.success("Fornecedor cadastrado com sucesso!");
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
              <span className="text-muted-foreground">Situação</span>
              <StatusBadge status={supplier.situacao} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categoria</span>
              <span>{supplier.categoria}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{supplier.celular}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">WhatsApp</span>
              <span>{supplier.whatsapp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span>{supplier.email || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LinkBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
    >
      Voltar para fornecedores
    </button>
  );
}
