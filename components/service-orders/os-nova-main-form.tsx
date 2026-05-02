"use client";

import type { Ref } from "react";
import { Plus } from "lucide-react";

import { ClientForm } from "@/components/clients/client-form";
import { OsProductsSection } from "@/components/service-orders/os-products-section";
import { OsServiceItem } from "@/components/service-orders/os-service-item";
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
import {
  OsInstallmentPlanFields,
  type OsInstallmentPlanFieldsHandle,
} from "@/components/service-orders/os-installment-plan-fields";
import type { NovaOsController } from "@/hooks/use-nova-os";
import { cn } from "@/lib/utils";

const PAYMENT_METHOD_OPTIONS = [
  { value: "Pix", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
] as const;

function OsAddItemsSplitButton({
  onAddService,
  onAddProduct,
  className,
}: {
  onAddService: () => void;
  onAddProduct: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full max-w-md overflow-hidden rounded-2xl border border-input bg-background text-foreground transition-[background-color] duration-200",
        className,
      )}
    >
      <button
        type="button"
        className="group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onAddService}
      >
        <Plus
          className="h-4 w-4 shrink-0 opacity-70 transition-all duration-200 ease-out group-hover:scale-110 group-hover:text-accent-foreground group-hover:opacity-100"
          aria-hidden
        />
        Adicionar serviço
      </button>
      <span className="w-px shrink-0 self-stretch bg-border" aria-hidden />
      <button
        type="button"
        className="group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-foreground transition-[background-color,color,transform,box-shadow] duration-200 ease-out hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onAddProduct}
      >
        <Plus
          className="h-4 w-4 shrink-0 opacity-70 transition-all duration-200 ease-out group-hover:scale-110 group-hover:text-accent-foreground group-hover:opacity-100"
          aria-hidden
        />
        Adicionar produto
      </button>
    </div>
  );
}

export function OsNovaMainForm({ os }: { os: NovaOsController }) {
  const hasAnyItems = os.services.length > 0 || os.products.length > 0;
  const installmentFirstDue = os.paymentTerm === "A_PRAZO" ? os.dueDate : os.resolvedOpenedAt;
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
              ) : os.isCheckingCustomOsNumber && os.customOsNumber ? (
                <p className="text-xs text-muted-foreground">Verificando número da OS...</p>
              ) : os.isCustomOsNumberDuplicate ? (
                <p className="text-xs text-destructive">
                  Este número já está em uso. Escolha outro para continuar.
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
          <div className="grid gap-4 md:grid-cols-2">
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
                options={[...PAYMENT_METHOD_OPTIONS]}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
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
                onChange={os.setClientId}
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
                options={[...PAYMENT_METHOD_OPTIONS]}
              />
            </div>
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
                onClick={() => os.setPaymentTerm("A_VISTA")}
              >
                À vista
              </Button>
              <Button
                type="button"
                size="sm"
                variant={os.paymentTerm === "A_PRAZO" ? "default" : "outline"}
                onClick={() => os.setPaymentTerm("A_PRAZO")}
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

        {hasAnyItems && os.total > 0 ? (
          <OsInstallmentPlanFields
            ref={os.installmentPlanRef as Ref<OsInstallmentPlanFieldsHandle>}
            totalAmount={os.total}
            firstDueDate={installmentFirstDue}
            openedAtFallback={os.resolvedOpenedAt}
            initialStoredPlan={null}
            resetKey={`nova-${os.installmentResetKey}`}
          />
        ) : null}

        <div className="space-y-4">
          {!hasAnyItems ? (
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                Nenhum item adicionado. Inclua serviços ou produtos para compor a OS.
              </p>
              <OsAddItemsSplitButton onAddService={os.addService} onAddProduct={os.addProduct} />
            </div>
          ) : (
            <>
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
                <OsProductsSection
                  products={os.products}
                  onProductChange={os.onProductChange}
                  removeProduct={os.removeProduct}
                />
              </div>

              <div className="flex justify-center pt-2">
                <OsAddItemsSplitButton onAddService={os.addService} onAddProduct={os.addProduct} />
              </div>
            </>
          )}
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
