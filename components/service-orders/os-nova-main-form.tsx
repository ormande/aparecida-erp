"use client";

import { Plus } from "lucide-react";

import { ClientForm } from "@/components/clients/client-form";
import { OsProductsSection } from "@/components/service-orders/os-products-section";
import { OsServiceItem } from "@/components/service-orders/os-service-item";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
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
import type { NovaOsController } from "@/hooks/use-nova-os";
import { VEICULOS_ATIVO } from "@/lib/config";

const PAYMENT_METHOD_OPTIONS = [
  { value: "Pix", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
] as const;

export function OsNovaMainForm({ os }: { os: NovaOsController }) {
  const paymentMethodOptions =
    os.paymentTerm === "A_PRAZO"
      ? [...PAYMENT_METHOD_OPTIONS, { value: "Mensal", label: "Mensal" }]
      : [...PAYMENT_METHOD_OPTIONS];

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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Número da OS</Label>
            <div className="grid gap-1">
              <Input
                type="number"
                min={1}
                value={os.customOsNumber}
                onChange={(e) => os.setCustomOsNumber(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="Ex: 11042"
                className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={os.isStandalone}
              />
              {os.isStandalone ? (
                <p className="text-xs text-muted-foreground">
                  Na OS avulsa o número é gerado automaticamente pelo sistema.
                </p>
              ) : os.customOsNumber && Number(os.customOsNumber) > 0 ? (
                <p className="text-xs text-muted-foreground">
                  A OS será criada com o número{" "}
                  <span className="font-medium">
                    OS-{new Date().getFullYear()}-{String(os.customOsNumber).padStart(5, "0")}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Informe o número manual da OS.</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Unidade</Label>
            <div className="flex flex-wrap gap-2">
              {os.unitOptions.map((unit) => (
                <Button
                  key={unit.value}
                  type="button"
                  size="default"
                  variant={os.selectedUnitId === unit.value ? "default" : "outline"}
                  onClick={() => os.setSelectedUnitId(unit.value)}
                >
                  {unit.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {os.isStandalone ? (
          <div className={`grid gap-4 ${VEICULOS_ATIVO ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div className="grid gap-2">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <Label htmlFor="customerNameSnapshot">Cliente avulso</Label>
                <span className="h-9 w-px opacity-0" aria-hidden />
              </div>
              <Input
                id="customerNameSnapshot"
                value={os.customerNameSnapshot}
                onChange={(e) => os.setCustomerNameSnapshot(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <Label>Forma de pagamento</Label>
                <span className="h-9 w-px opacity-0" aria-hidden />
              </div>
              <SearchableSelect
                value={os.paymentMethod}
                onChange={os.setPaymentMethod}
                placeholder="Selecione a forma de pagamento"
                options={paymentMethodOptions}
                disabled={os.paymentTerm === "A_PRAZO"}
              />
            </div>

            {VEICULOS_ATIVO ? (
              <div className="grid gap-2">
                <div className="flex min-h-9 items-center justify-between gap-3">
                  <Label htmlFor="mileage">Quilometragem atual</Label>
                  <span className="h-9 w-px opacity-0" aria-hidden />
                </div>
                <Input
                  id="mileage"
                  value={os.mileage}
                  onChange={(e) => os.setMileage(e.target.value)}
                  placeholder="Ex: 68420"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <div className={`grid gap-4 ${VEICULOS_ATIVO ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label>Cliente</Label>
                <Dialog open={os.customerModalOpen} onOpenChange={os.setCustomerModalOpen}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <Plus className="mr-1 h-4 w-4" />
                        Cadastrar cliente
                      </Button>
                    }
                  />
                  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Novo cliente</DialogTitle>
                      <DialogDescription>Cadastre o cliente sem sair da abertura da OS.</DialogDescription>
                    </DialogHeader>
                    <ClientForm submitLabel="Salvar cliente" onSubmit={os.handleCreateCustomer} />
                  </DialogContent>
                </Dialog>
              </div>
              <SearchableSelect
                value={os.clientId}
                onChange={(value) => {
                  os.setClientId(value);
                  os.setVehicleId("");
                }}
                placeholder="Selecione um cliente"
                options={os.customerOptions}
                disabled={!os.customersHydrated}
                searchInTrigger
              />
            </div>
            <div className="grid gap-2">
              <div className="flex min-h-9 items-center justify-between gap-3">
                <Label>Forma de pagamento</Label>
                <span className="h-9 w-px opacity-0" aria-hidden />
              </div>
              <SearchableSelect
                value={os.paymentMethod}
                onChange={os.setPaymentMethod}
                placeholder="Selecione a forma de pagamento"
                options={paymentMethodOptions}
                disabled={os.paymentTerm === "A_PRAZO"}
              />
            </div>
            {VEICULOS_ATIVO ? (
              <>
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

                <div className="grid gap-2">
                  <div className="flex min-h-9 items-center justify-between gap-3">
                    <Label htmlFor="mileage">Quilometragem atual</Label>
                    <span className="h-9 w-px opacity-0" aria-hidden />
                  </div>
                  <Input
                    id="mileage"
                    value={os.mileage}
                    onChange={(e) => os.setMileage(e.target.value)}
                    placeholder="Ex: 68420"
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Data de lançamento</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={os.openedAtPreset === "today" ? "default" : "outline"}
                onClick={() => os.setOpenedAtPreset("today")}
              >
                Hoje
              </Button>
              <Button
                type="button"
                size="sm"
                variant={os.openedAtPreset === "yesterday" ? "default" : "outline"}
                onClick={() => os.setOpenedAtPreset("yesterday")}
              >
                Ontem
              </Button>
              <Button
                type="button"
                size="sm"
                variant={os.openedAtPreset === "other" ? "default" : "outline"}
                onClick={() => os.setOpenedAtPreset("other")}
              >
                Outra data
              </Button>
            </div>
            <DatePicker
              value={os.openedAtCustom}
              disabled={os.openedAtPreset !== "other"}
              onChange={os.setOpenedAtCustom}
            />
          </div>

          <div className="grid gap-2">
            <Label>Condição de pagamento</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={os.paymentTerm === "A_VISTA" ? "default" : "outline"}
                onClick={() => {
                  os.setPaymentTerm("A_VISTA");
                  if (os.paymentMethod === "Mensal") {
                    os.setPaymentMethod("Pix");
                  }
                }}
              >
                À vista
              </Button>
              <Button
                type="button"
                size="sm"
                variant={os.paymentTerm === "A_PRAZO" ? "default" : "outline"}
                onClick={() => {
                  os.setPaymentTerm("A_PRAZO");
                  os.setPaymentMethod("Mensal");
                }}
              >
                À prazo
              </Button>
            </div>
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

          {os.services.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex cursor-pointer items-center gap-2 text-sm font-medium select-none">
                <Checkbox
                  checked={os.sameEmployeeForAll}
                  onCheckedChange={(checked) => os.setSameEmployeeForAll(checked === true)}
                />
                <span onClick={() => os.setSameEmployeeForAll(!os.sameEmployeeForAll)}>
                  Mesmo funcionário para todos os serviços
                </span>
              </div>
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
          ) : null}

          {os.services.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Nenhum serviço adicionado. Clique em &quot;Adicionar serviço&quot; para começar.
            </div>
          ) : (
            <div className="space-y-4">
              {os.services.map((service, index) => (
                <OsServiceItem
                  key={service.id}
                  index={index}
                  service={service}
                  catalogServices={os.catalogServices}
                  serviceOptions={os.serviceOptions}
                  servicesHydrated={os.servicesHydrated}
                  employeeOptions={os.employeeOptions}
                  sameEmployeeForAll={os.sameEmployeeForAll}
                  canRemove
                  onChange={os.onServiceChange}
                  onRemove={os.removeService}
                />
              ))}
            </div>
          )}
        </div>

        <OsProductsSection
          products={os.products}
          onProductChange={os.onProductChange}
          removeProduct={os.removeProduct}
          addProduct={os.addProduct}
        />

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
