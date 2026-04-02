"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { Supplier } from "@/lib/app-types";

function getSupplierDisplayName(supplier: Supplier) {
  return supplier.tipo === "pf" ? supplier.nomeCompleto ?? "-" : supplier.nomeFantasia ?? "-";
}

function getSupplierDocument(supplier: Supplier) {
  return supplier.tipo === "pf" ? supplier.cpf || "-" : supplier.cnpj || "-";
}

export default function EditarFornecedorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmNavigation, onModalOpenChange, handleNavigate } = useUnsavedChanges(isDirty);

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
        <Button type="button" variant="outline" onClick={() => router.push("/fornecedores")}>
          Voltar para fornecedores
        </Button>
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Editar — ${getSupplierDisplayName(supplier)}`}
        subtitle={`${supplier.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} • ${getSupplierDocument(supplier)}`}
        actions={
          <Button type="button" variant="outline" onClick={() => handleNavigate(`/fornecedores/${supplier.id}`)}>
            Cancelar
          </Button>
        }
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            supplier={supplier}
            submitLabel="Salvar alterações"
            onDirtyChange={setIsDirty}
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

      <ConfirmModal
        open={showModal}
        onOpenChange={onModalOpenChange}
        title="Sair sem salvar?"
        description="Você tem alterações não salvas. Se sair agora, elas serão perdidas."
        onConfirm={confirmNavigation}
        confirmLabel="Sair sem salvar"
      />
    </div>
  );
}
