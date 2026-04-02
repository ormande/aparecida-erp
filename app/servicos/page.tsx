"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useMemo } from "react";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useServices } from "@/hooks/use-services";
import { currency } from "@/lib/formatters";

export default function ServicosPage() {
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
          <Link href="/servicos/novo">
            <Button className="rounded-full">
              <Plus className="mr-2 h-4 w-4" />
              Novo serviço
            </Button>
          </Link>
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
