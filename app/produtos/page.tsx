"use client";

import Link from "next/link";
import { Package, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { currency } from "@/lib/formatters";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string;
  internalCode: string | null;
  costPrice: number | null;
  salePrice: number;
  isActive: boolean;
};

/** Shape of each item in GET /api/products `products` array (decimals as numbers or strings). */
type ProductApiRow = Omit<Product, "costPrice" | "salePrice"> & {
  costPrice: number | string | null;
  salePrice: number | string;
};

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setHydrated(false);

    const params = new URLSearchParams();
    if (activeFilter) params.set("isActive", activeFilter);
    if (categoryFilter) params.set("category", categoryFilter);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setProducts(
          ((data.products ?? []) as ProductApiRow[]).map((p) => ({
            ...p,
            costPrice: p.costPrice == null || p.costPrice === "" ? null : Number(p.costPrice),
            salePrice: Number(p.salePrice),
          })),
        );
      })
      .catch(() => {})
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => { active = false; };
  }, [categoryFilter, activeFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Todas as categorias" },
      ...categories.map((cat) => ({ value: cat, label: cat })),
    ],
    [categories],
  );

  async function handleToggleActive(id: string, current: boolean) {
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (!response.ok) return;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !current } : p)),
    );
  }

  const searchKeys = useMemo<Array<(row: Product) => string>>(
    () => [(row) => row.name, (row) => row.brand ?? "", (row) => row.internalCode ?? "", (row) => row.category ?? ""],
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Produtos"
        subtitle="Gerencie o catálogo de produtos disponíveis para lançamento nas OS."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo produto
                </Button>
              }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo produto</DialogTitle>
                <DialogDescription>Cadastre o produto sem sair da lista.</DialogDescription>
              </DialogHeader>
              <ProductForm
                submitLabel="Salvar produto"
                categories={categories}
                onSubmit={async (values) => {
                  const response = await fetch("/api/products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                  });

                  const data = await response.json().catch(() => ({}));

                  if (!response.ok) {
                    toast.error(
                      (data as { message?: string; error?: string }).message ??
                        (data as { error?: string }).error ??
                        "Não foi possível cadastrar o produto.",
                    );
                    return;
                  }

                  toast.success("Produto cadastrado com sucesso!");
                  setOpen(false);

                  // Recarrega a lista respeitando os filtros atuais
                  const params = new URLSearchParams();
                  if (activeFilter) params.set("isActive", activeFilter);
                  if (categoryFilter) params.set("category", categoryFilter);
                  setHydrated(false);
                  const refreshed = await fetch(`/api/products?${params.toString()}`).then((res) => res.json()).catch(() => ({}));
                  setProducts(
                    ((refreshed as { products?: ProductApiRow[] }).products ?? []).map((p) => ({
                      ...p,
                      costPrice: p.costPrice == null || p.costPrice === "" ? null : Number(p.costPrice),
                      salePrice: Number(p.salePrice),
                    })),
                  );
                  setHydrated(true);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px]">
            <SearchableSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Categoria"
              options={categoryOptions}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeFilter === "true" ? "default" : "outline"}
              onClick={() => setActiveFilter("true")}
            >
              Ativos
            </Button>
            <Button
              size="sm"
              variant={activeFilter === "" ? "default" : "outline"}
              onClick={() => setActiveFilter("")}
            >
              Todos
            </Button>
            <Button
              size="sm"
              variant={activeFilter === "false" ? "default" : "outline"}
              onClick={() => setActiveFilter("false")}
            >
              Inativos
            </Button>
          </div>
        </div>

        <DataTable
          data={products}
          pageSize={10}
          isLoading={!hydrated}
          searchPlaceholder="Buscar por nome, marca ou código"
          searchKeys={searchKeys}
          columns={[
            {
              key: "name",
              header: "Nome",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[rgba(201,168,76,0.14)] p-2 text-[var(--color-gold-dark)]">
                    <Package className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{row.name}</span>
                </div>
              ),
            },
            { key: "code", header: "Código", render: (row) => row.internalCode || "—" },
            { key: "category", header: "Categoria", render: (row) => row.category || "—" },
            { key: "unit", header: "Unidade", render: (row) => row.unit },
            {
              key: "costPrice",
              header: "Preço de custo",
              render: (row) => (row.costPrice != null ? currency(row.costPrice) : "—"),
            },
            { key: "salePrice", header: "Preço de venda", render: (row) => currency(row.salePrice) },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={row.isActive ? "Ativo" : "Inativo"} />,
            },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/produtos/${row.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleToggleActive(row.id, row.isActive)}
                  >
                    {row.isActive ? "Desativar" : "Ativar"}
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
