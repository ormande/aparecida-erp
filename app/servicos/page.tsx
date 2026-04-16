"use client";

import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ServiceForm } from "@/components/services/service-form";
import { useServices } from "@/hooks/use-services";
import { currency } from "@/lib/formatters";

export default function ServicosPage() {
  const [open, setOpen] = useState(false);
  const { services, hydrated } = useServices();
  const searchKeys = useMemo<Array<(row: (typeof services)[number]) => string>>(
    () => [(row) => row.name, (row) => row.description],
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Serviços"
        subtitle="Mantenha o catálogo de serviços que poderá ser usado diretamente na abertura das OS."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo serviço
                </Button>
              }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo serviço</DialogTitle>
                <DialogDescription>Cadastre o serviço sem sair da lista.</DialogDescription>
              </DialogHeader>
              <ServiceForm
                submitLabel="Salvar serviço"
                onSubmit={async (values) => {
                  const response = await fetch("/api/services", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(values),
                  });

                  const data = await response.json().catch(() => ({}));

                  if (!response.ok) {
                    toast.error((data as { message?: string; error?: string }).message ?? (data as { error?: string }).error ?? "Não foi possível cadastrar o serviço.");
                    return;
                  }

                  toast.success("Serviço cadastrado com sucesso!");
                  setOpen(false);
                  await mutate("/api/services");
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={services}
          isLoading={!hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por nome ou descrição"
          searchKeys={searchKeys}
          emptyTitle="Nenhum serviço cadastrado"
          emptyDescription="Cadastre os serviços da oficina para ganhar velocidade na abertura da OS."
          columns={[
            { key: "name", header: "Serviço", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "description", header: "Descrição", render: (row) => row.description || "-" },
            { key: "basePrice", header: "Valor base", render: (row) => currency(row.basePrice) },
            {
              key: "status",
              header: "Situação",
              render: (row) => <StatusBadge status={row.isActive ? "Ativo" : "Inativo"} />,
            },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <Link href={`/servicos/${row.id}`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
