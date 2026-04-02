"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

export default function NovoClientePage() {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmNavigation, onModalOpenChange, handleNavigate } = useUnsavedChanges(isDirty);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo cliente"
        subtitle="Cadastre pessoas físicas e jurídicas com contato rápido e visão completa do relacionamento."
        actions={
          <Button type="button" variant="outline" onClick={() => handleNavigate("/clientes")}>
            Cancelar
          </Button>
        }
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Cadastro de cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            submitLabel="Salvar cliente"
            onDirtyChange={setIsDirty}
            onSubmit={async (values) => {
              const response = await fetch("/api/customers", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível cadastrar o cliente.");
                return;
              }

              toast.success("Cliente cadastrado com sucesso!");
              router.push("/clientes");
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
