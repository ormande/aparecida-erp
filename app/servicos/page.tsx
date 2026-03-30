"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useServices } from "@/hooks/use-services";
import { currency } from "@/lib/formatters";

export default function ServicosPage() {
  const { services, hydrated } = useServices();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Servicos"
        subtitle="Mantenha o catalogo de servicos que podera ser usado diretamente na abertura das OS."
        actions={
          <Link href="/servicos/novo">
            <Button className="rounded-full">
              <Plus className="mr-2 h-4 w-4" />
              Novo servico
            </Button>
          </Link>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={services}
          isLoading={!hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por nome ou descricao"
          searchKeys={[(row) => row.name, (row) => row.description]}
          emptyTitle="Nenhum servico cadastrado"
          emptyDescription="Cadastre os servicos da oficina para ganhar velocidade na abertura da OS."
          columns={[
            { key: "name", header: "Servico", render: (row) => <span className="font-medium">{row.name}</span> },
            { key: "description", header: "Descricao", render: (row) => row.description || "-" },
            { key: "basePrice", header: "Valor base", render: (row) => currency(row.basePrice) },
            {
              key: "status",
              header: "Situacao",
              render: (row) => <StatusBadge status={row.isActive ? "Ativo" : "Inativo"} />,
            },
            {
              key: "actions",
              header: "Acoes",
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
