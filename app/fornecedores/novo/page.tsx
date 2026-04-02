"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmNavigation, onModalOpenChange, handleNavigate } = useUnsavedChanges(isDirty);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo fornecedor"
        subtitle="Cadastre parceiros reais da empresa para compras e despesas futuras."
        actions={
          <Button type="button" variant="outline" onClick={() => handleNavigate("/fornecedores")}>
            Cancelar
          </Button>
        }
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            submitLabel="Salvar fornecedor"
            onDirtyChange={setIsDirty}
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
