"use client";

import { Plus } from "lucide-react";

import { OsServiceItem } from "@/components/service-orders/os-service-item";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NovaOsController } from "@/hooks/use-nova-os";

const PAYMENT_METHOD_OPTIONS = [
  { value: "Pix", label: "Pix" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
] as const;

export function OsNovaMainForm({ os }: { os: NovaOsController }) {
  return (
    <Card className="surface-card border-none">
      <CardContent className="grid gap-6 p-6">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant={os.isStandalone ? "outline" : "default"} onClick={() => os.setIsStandalone(false)}>
              OS com cliente cadastrado
            </Button>
            <Button variant={os.isStandalone ? "default" : "outline"} onClick={os.enterStandaloneMode}>
              Lançar OS avulsa
            </Button>
          </div>
        </div>

        {os.isStandalone ? (
          <div className="grid gap-2">
            <Label htmlFor="customerNameSnapshot">Cliente avulso</Label>
            <Input
              id="customerNameSnapshot"
              value={os.customerNameSnapshot}
              onChange={(e) => os.setCustomerNameSnapshot(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <SearchableSelect
                value={os.clientId}
                onChange={(value) => {
                  os.setClientId(value);
                  os.setVehicleId("");
                }}
                placeholder="Selecione um cliente"
                options={os.customerOptions}
                disabled={!os.customersHydrated}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Veículo vinculado</Label>
                <Dialog open={os.vehicleModalOpen} onOpenChange={os.setVehicleModalOpen}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" size="sm" disabled={!os.clientId}>
                        <Plus className="mr-1 h-4 w-4" />
                        Cadastrar veículo
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Novo veículo</DialogTitle>
                      <DialogDescription>Cadastre o veículo do cliente sem sair da abertura da OS.</DialogDescription>
                    </DialogHeader>
                    <VehicleForm
                      customers={os.customers}
                      lockedClientId={os.clientId}
                      submitLabel="Salvar veículo"
                      onSubmit={os.handleCreateVehicle}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <SearchableSelect
                value={os.vehicleId}
                onChange={os.setVehicleId}
                placeholder={os.clientId ? "Selecione o veículo (opcional)" : "Selecione o cliente primeiro"}
                options={os.vehicleOptions}
                disabled={!os.clientId}
              />
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Unidade</Label>
            <SearchableSelect
              value={os.selectedUnitId}
              onChange={os.setSelectedUnitId}
              placeholder="Selecione a unidade"
              options={os.unitOptions}
              disabled={!os.unitOptions.length}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="mileage">Quilometragem atual</Label>
            <Input id="mileage" value={os.mileage} onChange={(e) => os.setMileage(e.target.value)} placeholder="Ex: 68420" />
          </div>
          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <SearchableSelect
              value={os.paymentMethod}
              onChange={os.setPaymentMethod}
              placeholder="Selecione a forma de pagamento"
              options={[...PAYMENT_METHOD_OPTIONS]}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Condição de pagamento</Label>
            <div className="flex gap-2">
              <Button variant={os.paymentTerm === "A_VISTA" ? "default" : "outline"} onClick={() => os.setPaymentTerm("A_VISTA")}>
                À vista
              </Button>
              <Button variant={os.paymentTerm === "A_PRAZO" ? "default" : "outline"} onClick={() => os.setPaymentTerm("A_PRAZO")}>
                A prazo
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dueDate">Vencimento</Label>
            <DatePicker
              value={os.dueDate}
              disabled={os.paymentTerm !== "A_PRAZO"}
              onChange={os.setDueDate}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl">Serviços</h2>
              <p className="text-sm text-muted-foreground">Use o catálogo cadastrado ou descreva o serviço manualmente.</p>
            </div>
            <Button variant="outline" onClick={os.addService}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar serviço
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={os.sameEmployeeForAll}
                onCheckedChange={(checked) => os.setSameEmployeeForAll(checked === true)}
              />
              Mesmo funcionário para todos os serviços
            </label>
            {os.sameEmployeeForAll ? (
              <div className="min-w-[220px] flex-1 sm:max-w-sm">
                <SearchableSelect
                  value={os.globalEmployeeId}
                  onChange={os.setGlobalEmployeeId}
                  placeholder="Funcionário para todos"
                  options={os.employeeOptions}
                  disabled={!os.employeeOptions.length}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            {os.services.map((service, index) => (
              <OsServiceItem
                key={service.id}
                service={service}
                index={index}
                catalogServices={os.catalogServices}
                serviceOptions={os.serviceOptions}
                servicesHydrated={os.servicesHydrated}
                employeeOptions={os.employeeOptions}
                sameEmployeeForAll={os.sameEmployeeForAll}
                canRemove={os.services.length > 1}
                onChange={os.onServiceChange}
                onRemove={os.removeService}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-dashed bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl">Peças</h2>
            <Badge variant="secondary">Em breve - módulo de estoque</Badge>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="mt-4 rounded-2xl border bg-muted p-4 text-sm text-muted-foreground">
                  O lançamento de peças será habilitado quando o módulo de estoque estiver ativo.
                </div>
              }
            />
            <TooltipContent>
              <p>Ative o módulo em Configurações para começar a usar o controle de estoque.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="notes">Observações / laudo técnico</Label>
          <Textarea
            id="notes"
            rows={6}
            value={os.notes}
            onChange={(e) => os.setNotes(e.target.value)}
            placeholder="Descreva o estado dos pneus, recomendações e orientações ao cliente."
          />
        </div>
      </CardContent>
    </Card>
  );
}
