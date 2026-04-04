"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ProductForm, type ProductFormValues } from "@/components/products/product-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type ProductData = ProductFormValues & { id: string };

export default function EditarProdutoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/products/${params.id}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Produto não encontrado.");
        return data;
      })
      .then((data) => {
        if (!active) return;
        const p = data.product;
        setProduct({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          brand: p.brand ?? "",
          category: p.category ?? "",
          unit: p.unit,
          internalCode: p.internalCode ?? "",
          costPrice: Number(p.costPrice),
          salePrice: Number(p.salePrice),
          isActive: p.isActive,
          notes: p.notes ?? "",
        });
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => { active = false; };
  }, [params.id]);

  if (hydrated && !product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Produto não encontrado" subtitle="Esse registro não está mais disponível." />
        <button
          type="button"
          onClick={() => router.push("/produtos")}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
        >
          Voltar para produtos
        </button>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-8">
      <PageHeader title={product.name} subtitle="Edite os dados do produto." />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Dados do produto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            initialValues={product}
            submitLabel="Salvar alterações"
            onSubmit={async (values) => {
              const response = await fetch(`/api/products/${product.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível atualizar o produto.");
                return;
              }

              toast.success("Produto atualizado com sucesso!");
              router.push("/produtos");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
