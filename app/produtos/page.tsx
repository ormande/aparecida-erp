"use client";

import Link from "next/link";
import { Package, Pencil, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { currency } from "@/lib/formatters";

type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string;
  internalCode: string | null;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
};

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (activeFilter) params.set("isActive", activeFilter);
    if (categoryFilter) params.set("category", categoryFilter);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setProducts(
          (data.products ?? []).map((p: any) => ({
            ...p,
            costPrice: Number(p.costPrice),
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
          <Link href="/produtos/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo produto
            </Button>
          </Link>
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
            { key: "costPrice", header: "Preço de custo", render: (row) => currency(row.costPrice) },
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
