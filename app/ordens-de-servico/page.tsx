"use client";

import Link from "next/link";
import { Eye, Plus } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { currency, date, getClientById, getClientDisplayName, getVehicleById, serviceOrders } from "@/lib/mock-data";

export default function OrdensDeServicoPage() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicleId");
  const clientId = searchParams.get("clientId");

  const data = useMemo(
    () =>
      serviceOrders
        .filter((order) => (vehicleId ? order.vehicleId === vehicleId : true))
        .filter((order) => (clientId ? order.clientId === clientId : true))
        .map((order) => ({
          ...order,
          clientName: getClientDisplayName(getClientById(order.clientId)),
          plate: getVehicleById(order.vehicleId)?.plate ?? "-",
          servicesLabel: order.services.map((service) => service.description).join(", "),
        })),
    [clientId, vehicleId],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Acompanhe o andamento das OS abertas, em execução e concluídas."
        actions={
          <div className="flex items-center gap-3">
            {vehicleId || clientId ? (
              <Link
                href="/ordens-de-servico"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
              >
                Limpar filtro
              </Link>
            ) : null}
            <Link
              href={clientId ? `/ordens-de-servico/nova?clientId=${clientId}` : "/ordens-de-servico/nova"}
              className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova OS
            </Link>
          </div>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={data}
          pageSize={10}
          searchPlaceholder="Buscar por número, cliente ou placa"
          searchKeys={[(row) => row.number, (row) => row.clientName, (row) => row.plate]}
          columns={[
            { key: "number", header: "Número OS", render: (row) => <span className="font-medium">{row.number}</span> },
            { key: "client", header: "Cliente", render: (row) => row.clientName },
            { key: "plate", header: "Placa", render: (row) => row.plate },
            { key: "services", header: "Serviços", render: (row) => row.servicesLabel },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "total", header: "Valor total", render: (row) => currency(row.total) },
            { key: "date", header: "Data abertura", render: (row) => date(row.openedAt) },
            {
              key: "actions",
              header: "Ações",
              render: () => (
                <Button variant="outline" size="sm">
                  <Eye className="mr-1 h-4 w-4" />
                  Detalhes
                </Button>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
