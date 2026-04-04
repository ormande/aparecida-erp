"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProductForm } from "@/components/products/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function NovoProdutoPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo produto"
        subtitle="Cadastre um produto no catálogo para uso nas ordens de serviço."
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de produto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            submitLabel="Salvar produto"
            onSubmit={async (values) => {
              const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível cadastrar o produto.");
                return;
              }

              toast.success("Produto cadastrado com sucesso!");
              router.push("/produtos");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
