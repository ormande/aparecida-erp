"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { ServiceForm } from "@/components/services/service-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { AppService } from "@/lib/db-mappers";

export default function ServicoDetailPage() {
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<AppService | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/services/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Serviço não encontrado.");
        return data;
      })
      .then((data) => {
        if (active) setService(data.service);
      })
      .catch(() => {
        if (active) setService(null);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  if (hydrated && !service) {
    return (
      <div className="space-y-6">
        <PageHeader title="Serviço não encontrado" subtitle="Esse cadastro não está mais disponível." />
        <Link href="/servicos">
          <Button variant="outline">Voltar para serviços</Button>
        </Link>
      </div>
    );
  }

  if (!service) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={service.name}
        subtitle="Atualize as informações do serviço e mantenha o catálogo organizado."
        actions={
          <Link href="/servicos">
            <Button variant="outline">Voltar</Button>
          </Link>
        }
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Dados do serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            submitLabel="Salvar alterações"
            initialValues={service}
            onSubmit={async (values) => {
              const response = await fetch(`/api/services/${service.id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(values),
              });

              const data = await response.json();

              if (!response.ok) {
                toast.error(data.message ?? "Não foi possível atualizar o serviço.");
                return;
              }

              setService(data.service);
              toast.success("Serviço atualizado com sucesso!");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
