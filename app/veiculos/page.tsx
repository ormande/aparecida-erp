"use client";

import { Eye, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PersonPreviewDialog } from "@/components/people/person-preview-dialog";
import { VehicleForm, type VehicleFormValues } from "@/components/vehicles/vehicle-form";
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
import { useCustomers } from "@/hooks/use-customers";
import { useVehicles } from "@/hooks/use-vehicles";

function getClientDisplayName(client?: {
  tipo: "pf" | "pj";
  nomeCompleto?: string;
  nomeFantasia?: string;
}) {
  if (!client) {
    return "Nao vinculado";
  }

  return client.tipo === "pf" ? client.nomeCompleto ?? "Sem nome" : client.nomeFantasia ?? "Sem nome";
}

export default function VeiculosPage() {
  const [open, setOpen] = useState(false);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const { customers, hydrated: customersHydrated } = useCustomers();
  const { vehicles, hydrated: vehiclesHydrated, setVehicles } = useVehicles();

  const data = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        ...vehicle,
        clientName: getClientDisplayName(customers.find((client) => client.id === vehicle.clientId)),
      })),
    [customers, vehicles],
  );
  const viewingCustomer = customers.find((customer) => customer.id === viewingCustomerId) ?? null;

  async function handleCreateVehicle(values: VehicleFormValues) {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Nao foi possivel cadastrar o veiculo.");
      return;
    }

    setVehicles((current) => [...current, data.vehicle]);
    setOpen(false);
    toast.success("Veiculo cadastrado com sucesso!");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Veiculos"
        subtitle="Cadastre veiculos quando precisar vincula-los a clientes, inclusive durante a abertura da OS."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo veiculo
                </Button>
              }
            />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Novo veiculo</DialogTitle>
                <DialogDescription>Cadastre o veiculo e deixe-o disponivel para a proxima ordem de servico.</DialogDescription>
              </DialogHeader>
              <VehicleForm customers={customers} submitLabel="Salvar veiculo" onSubmit={handleCreateVehicle} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={data}
          pageSize={10}
          isLoading={!customersHydrated || !vehiclesHydrated}
          searchPlaceholder="Buscar por placa, modelo ou cliente"
          searchKeys={[(row) => row.plate, (row) => row.model, (row) => row.clientName]}
          emptyTitle="Nenhum veiculo cadastrado"
          emptyDescription="Cadastre veiculos por aqui ou diretamente durante a abertura de uma ordem de servico."
          columns={[
            { key: "plate", header: "Placa", render: (row) => <span className="font-medium">{row.plate}</span> },
            { key: "model", header: "Modelo", render: (row) => row.model },
            { key: "brand", header: "Marca", render: (row) => row.brand },
            { key: "year", header: "Ano", render: (row) => String(row.year) },
            { key: "color", header: "Cor", render: (row) => row.color || "-" },
            { key: "client", header: "Cliente vinculado", render: (row) => row.clientName },
            {
              key: "actions",
              header: "Acoes",
              render: (row) => (
                <Button variant="outline" size="sm" onClick={() => row.clientId && setViewingCustomerId(row.clientId)}>
                  <Eye className="mr-1 h-4 w-4" />
                  Ver cliente
                </Button>
              ),
            },
          ]}
        />
      </div>

      <PersonPreviewDialog
        open={Boolean(viewingCustomer)}
        onOpenChange={(open) => !open && setViewingCustomerId(null)}
        person={viewingCustomer}
        title="Cliente"
        subtitle="Visualização rápida do cadastro do cliente vinculado."
      />
    </div>
  );
}
