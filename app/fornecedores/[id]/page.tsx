"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Supplier } from "@/lib/app-types";

function getSupplierDisplayName(supplier: Supplier) {
  return supplier.tipo === "pf" ? supplier.nomeCompleto ?? "-" : supplier.nomeFantasia ?? "-";
}

function getSupplierDocument(supplier: Supplier) {
  return supplier.tipo === "pf" ? supplier.cpf || "-" : supplier.cnpj || "-";
}

export default function FornecedorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/suppliers/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Fornecedor não encontrado.");
        }

        return data;
      })
      .then((data) => {
        if (active) {
          setSupplier(data.supplier);
        }
      })
      .catch(() => {
        if (active) {
          setSupplier(null);
        }
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (hydrated && !supplier) {
    return (
      <div className="space-y-6">
        <PageHeader title="Fornecedor não encontrado" subtitle="Esse registro não está mais disponível." />
        <button
          type="button"
          onClick={() => router.push("/fornecedores")}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
        >
          Voltar para fornecedores
        </button>
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
              onSubmit={async (values) => {
                const response = await fetch(`/api/suppliers/${supplier.id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(values),
                });

                const data = await response.json();

                if (!response.ok) {
                  toast.error(data.message ?? "Não foi possível atualizar o fornecedor.");
                  return;
                }

                setSupplier(data.supplier);
                toast.success("Fornecedor atualizado com sucesso!");
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
