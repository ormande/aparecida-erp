"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageHeader } from "@/components/ui/page-header";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { Client } from "@/lib/app-types";
import { getClientDisplayName, getClientDocument } from "@/lib/formatters";

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { showModal, confirmNavigation, onModalOpenChange, handleNavigate } = useUnsavedChanges(isDirty);

  useEffect(() => {
    let active = true;

    fetch(`/api/customers/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Cliente não encontrado.");
        }
        return data;
      })
      .then((data) => {
        if (active) {
          setClient(data.customer);
        }
      })
      .catch(() => {
        if (active) {
          setClient(null);
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

  if (hydrated && !client) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cliente não encontrado" subtitle="Esse registro não está mais disponível." />
        <Button type="button" variant="outline" onClick={() => router.push("/clientes")}>
          Voltar para clientes
        </Button>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Editar — ${getClientDisplayName(client)}`}
        subtitle={`${client.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} • ${getClientDocument(client)}`}
        actions={
          <Button type="button" variant="outline" onClick={() => handleNavigate(`/clientes/${client.id}`)}>
            Cancelar
          </Button>
        }
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            client={client}
            submitLabel="Salvar alterações"
            onDirtyChange={setIsDirty}
            onSubmit={async (values) => {
              const response = await fetch(`/api/customers/${client.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível atualizar o cliente.");
                return;
              }

              setClient(data.customer);
              toast.success("Cliente cadastrado com sucesso!");
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
