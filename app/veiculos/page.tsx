"use client";

import { Eye, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/ui/searchable-select";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { clients, getClientById, getClientDisplayName, vehicles } from "@/lib/mock-data";

function maskPlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export default function VeiculosPage() {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [form, setForm] = useState({
    plate: "",
    brand: "",
    model: "",
    year: "",
    color: "",
    notes: "",
  });

  const data = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        ...vehicle,
        clientName: getClientById(vehicle.clientId)
          ? getClientDisplayName(getClientById(vehicle.clientId))
          : "Não vinculado",
      })),
    [],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Veículos"
        subtitle="Controle de frota e veículos vinculados aos clientes da oficina."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo veículo
                </Button>
              }
            />
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Novo veículo</DialogTitle>
                <DialogDescription>Vincule o veículo a um cliente já cadastrado.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="plate">Placa</Label>
                  <Input
                    id="plate"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: maskPlate(e.target.value) })}
                    placeholder="ABC-1234 ou ABC1D23"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="year">Ano</Label>
                    <Input id="year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="color">Cor</Label>
                    <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Cliente vinculado</Label>
                  <SearchableSelect
                    value={clientId}
                    onChange={setClientId}
                    placeholder="Selecione um cliente"
                    options={clients.map((client) => ({ value: client.id, label: getClientDisplayName(client) }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
                <Button
                  onClick={() => {
                    toast.success("Veículo mockado criado com sucesso.");
                    setOpen(false);
                  }}
                >
                  Salvar veículo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={data}
          pageSize={10}
          searchPlaceholder="Buscar por placa, modelo ou cliente"
          searchKeys={[(row) => row.plate, (row) => row.model, (row) => row.clientName]}
          columns={[
            { key: "plate", header: "Placa", render: (row) => <span className="font-medium">{row.plate}</span> },
            { key: "model", header: "Modelo", render: (row) => row.model },
            { key: "brand", header: "Marca", render: (row) => row.brand },
            { key: "year", header: "Ano", render: (row) => row.year },
            { key: "color", header: "Cor", render: (row) => row.color },
            { key: "client", header: "Cliente vinculado", render: (row) => row.clientName },
            {
              key: "actions",
              header: "Ações",
              render: () => (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
