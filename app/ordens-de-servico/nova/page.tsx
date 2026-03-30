"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { VehicleForm, type VehicleFormValues } from "@/components/vehicles/vehicle-form";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import { useServices } from "@/hooks/use-services";
import { useUnits } from "@/hooks/use-units";
import { useVehicles } from "@/hooks/use-vehicles";
import { currency, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

type ServiceDraft = {
  id: string;
  serviceId: string;
  description: string;
  laborPrice: number;
  laborPriceInput: string;
};

function getClientDisplayName(client?: {
  tipo: "pf" | "pj";
  nomeCompleto?: string;
  nomeFantasia?: string;
}) {
  if (!client) {
    return "Sem cliente";
  }

  return client.tipo === "pf" ? client.nomeCompleto ?? "Sem nome" : client.nomeFantasia ?? "Sem nome";
}

function getClientDocument(client?: {
  tipo: "pf" | "pj";
  cpf?: string;
  cnpj?: string;
}) {
  if (!client) {
    return "";
  }

  return client.tipo === "pf" ? client.cpf ?? "" : client.cnpj ?? "";
}

function createDraft(index: number): ServiceDraft {
  return {
    id: `service-${index}`,
    serviceId: "",
    description: "",
    laborPrice: 0,
    laborPriceInput: formatCurrencyInput("0"),
  };
}

export default function NovaOsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { unitId, currentUnit, isLoading: unitLoading } = useCurrentUnit();
  const { units } = useUnits();
  const { customers, hydrated: customersHydrated } = useCustomers();
  const { services: catalogServices, hydrated: servicesHydrated } = useServices();
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [isStandalone, setIsStandalone] = useState(false);
  const [customerNameSnapshot, setCustomerNameSnapshot] = useState("");
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [mileage, setMileage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentTerm, setPaymentTerm] = useState<"A_VISTA" | "A_PRAZO">("A_VISTA");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([createDraft(1)]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const { vehicles, hydrated: vehiclesHydrated, setVehicles } = useVehicles(clientId || undefined);

  useEffect(() => {
    const incomingClientId = searchParams.get("clientId");
    const standalone = searchParams.get("standalone");
    if (unitId) {
      setSelectedUnitId(unitId);
    }
    if (standalone === "1") {
      setIsStandalone(true);
    }
    if (incomingClientId) {
      setClientId(incomingClientId);
      setIsStandalone(false);
    }
  }, [searchParams, unitId]);

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        value: vehicle.id,
        label: `${vehicle.plate} • ${vehicle.brand} ${vehicle.model}`,
      })),
    [vehicles],
  );

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: [getClientDisplayName(customer), getClientDocument(customer)].filter(Boolean).join(" • "),
      })),
    [customers],
  );

  const serviceOptions = useMemo(
    () =>
      catalogServices
        .filter((service) => service.isActive)
        .map((service) => ({
          value: service.id,
          label: `${service.name} • ${currency(service.basePrice)}`,
        })),
    [catalogServices],
  );

  const selectedClient = customers.find((client) => client.id === clientId);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const total = services.reduce((sum, service) => sum + Number(service.laborPrice || 0), 0);
  const isLoading = unitLoading || !customersHydrated || !servicesHydrated || !vehiclesHydrated;
  const unitOptions = units.map((unit) => ({ value: unit.id, label: unit.name }));

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
      toast.error(data.message ?? "Não foi possível cadastrar o veículo.");
      return;
    }

    setVehicles((current) => [...current, data.vehicle]);
    setVehicleId(data.vehicle.id);
    setVehicleModalOpen(false);
    toast.success("Veículo cadastrado com sucesso!");
  }

  async function handleSubmit() {
    if (!selectedUnitId) {
      toast.error("Selecione uma unidade válida antes de abrir a OS.");
      return;
    }

    if (!isStandalone && !clientId) {
      toast.error("Selecione o cliente para abrir a OS.");
      return;
    }

    if (isStandalone && !customerNameSnapshot.trim()) {
      toast.error("Informe o nome do cliente avulso.");
      return;
    }

    if (paymentTerm === "A_PRAZO" && !dueDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    const normalizedServices = services
      .map((service) => ({
        serviceId: service.serviceId || undefined,
        description: service.description.trim(),
        laborPrice: Number(service.laborPrice || 0),
      }))
      .filter((service) => service.description.length > 0);

    if (!normalizedServices.length) {
      toast.error("Adicione pelo menos um serviço na OS.");
      return;
    }

    const response = await fetch("/api/service-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unitId: selectedUnitId,
        customerId: isStandalone ? null : clientId,
        customerNameSnapshot: isStandalone ? customerNameSnapshot : "",
        vehicleId: vehicleId || undefined,
        mileage: mileage ? Number(mileage) : undefined,
        paymentMethod,
        paymentTerm,
        dueDate: paymentTerm === "A_PRAZO" ? dueDate : null,
        notes,
        services: normalizedServices,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível abrir a OS.");
      return;
    }

    toast.success("OS criada com sucesso!");
    router.push("/ordens-de-servico");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nova Ordem de Serviço"
        subtitle="Abra uma nova OS com cliente cadastrado ou avulso."
        actions={
          <Link href="/ordens-de-servico" className="inline-flex">
            <Button variant="outline">Voltar para a lista</Button>
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="surface-card border-none">
          <CardContent className="grid gap-6 p-6">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="flex flex-wrap gap-2">
                <Button variant={isStandalone ? "outline" : "default"} onClick={() => setIsStandalone(false)}>
                  OS com cliente cadastrado
                </Button>
                <Button
                  variant={isStandalone ? "default" : "outline"}
                  onClick={() => {
                    setIsStandalone(true);
                    setClientId("");
                    setVehicleId("");
                  }}
                >
                  Lançar OS avulsa
                </Button>
              </div>
            </div>

            {isStandalone ? (
              <div className="grid gap-2">
                <Label htmlFor="customerNameSnapshot">Cliente avulso</Label>
                <Input
                  id="customerNameSnapshot"
                  value={customerNameSnapshot}
                  onChange={(e) => setCustomerNameSnapshot(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Cliente</Label>
                  <SearchableSelect
                    value={clientId}
                    onChange={(value) => {
                      setClientId(value);
                      setVehicleId("");
                    }}
                    placeholder="Selecione um cliente"
                    options={customerOptions}
                    disabled={!customersHydrated}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Veículo vinculado</Label>
                    <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
                      <DialogTrigger
                        render={
                          <Button variant="outline" size="sm" disabled={!clientId}>
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
                          customers={customers}
                          lockedClientId={clientId}
                          submitLabel="Salvar veículo"
                          onSubmit={handleCreateVehicle}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                  <SearchableSelect
                    value={vehicleId}
                    onChange={setVehicleId}
                    placeholder={clientId ? "Selecione o veículo (opcional)" : "Selecione o cliente primeiro"}
                    options={vehicleOptions}
                    disabled={!clientId}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <SearchableSelect
                  value={selectedUnitId}
                  onChange={setSelectedUnitId}
                  placeholder="Selecione a unidade"
                  options={unitOptions}
                  disabled={!unitOptions.length}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="mileage">Quilometragem atual</Label>
                <Input id="mileage" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="Ex: 68420" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment">Forma de pagamento</Label>
                <Input id="payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Condição de pagamento</Label>
                <div className="flex gap-2">
                  <Button variant={paymentTerm === "A_VISTA" ? "default" : "outline"} onClick={() => setPaymentTerm("A_VISTA")}>
                    À vista
                  </Button>
                  <Button variant={paymentTerm === "A_PRAZO" ? "default" : "outline"} onClick={() => setPaymentTerm("A_PRAZO")}>
                    A prazo
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  disabled={paymentTerm !== "A_PRAZO"}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl">Serviços</h2>
                  <p className="text-sm text-muted-foreground">Use o catálogo cadastrado ou descreva o serviço manualmente.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setServices((current) => [...current, createDraft(current.length + 1)])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar serviço
                </Button>
              </div>

              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={service.id} className="grid gap-3 rounded-2xl border bg-muted/30 p-4 md:grid-cols-[minmax(0,1fr)_180px_52px]">
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Serviço do catálogo</Label>
                        <SearchableSelect
                          value={service.serviceId}
                          onChange={(value) => {
                            const selectedService = catalogServices.find((item) => item.id === value);
                            setServices((current) =>
                              current.map((item) =>
                                item.id === service.id
                                  ? {
                                      ...item,
                                      serviceId: value,
                                      description: selectedService?.name ?? item.description,
                                      laborPrice: selectedService?.basePrice ?? item.laborPrice,
                                      laborPriceInput: formatCurrencyInput(
                                        String(Math.round((selectedService?.basePrice ?? item.laborPrice) * 100)),
                                      ),
                                    }
                                  : item,
                              ),
                            );
                          }}
                          placeholder="Selecione um serviço cadastrado"
                          options={serviceOptions}
                          disabled={!servicesHydrated}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Input
                          value={service.description}
                          onChange={(e) =>
                            setServices((current) =>
                              current.map((item) =>
                                item.id === service.id ? { ...item, description: e.target.value } : item,
                              ),
                            )
                          }
                          placeholder={`Serviço ${index + 1}`}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Valor do serviço</Label>
                      <Input
                        inputMode="decimal"
                        value={service.laborPriceInput}
                        onChange={(e) =>
                          setServices((current) =>
                            current.map((item) =>
                              item.id === service.id
                                ? {
                                    ...item,
                                    laborPriceInput: formatCurrencyInput(e.target.value),
                                    laborPrice: parseCurrencyInput(formatCurrencyInput(e.target.value)),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="opacity-0">Remover</Label>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={services.length === 1}
                        onClick={() => setServices((current) => current.filter((item) => item.id !== service.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva o estado dos pneus, recomendações e orientações ao cliente."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card sticky top-24 h-fit border-none">
          <CardHeader>
            <CardTitle>Resumo da OS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Valor total calculado</p>
              <p className="mt-2 text-3xl font-semibold">{currency(total)}</p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Unidade: {units.find((unit) => unit.id === selectedUnitId)?.name ?? currentUnit?.name ?? "Nenhuma unidade selecionada"}</p>
              <p>Cliente: {isStandalone ? customerNameSnapshot || "Não informado" : selectedClient ? getClientDisplayName(selectedClient) : "Não selecionado"}</p>
              <p>Veículo: {selectedVehicle?.plate ?? "Não vinculado"}</p>
              <p>Pagamento: {paymentTerm === "A_VISTA" ? "À vista" : "A prazo"}</p>
              <p>Vencimento: {paymentTerm === "A_PRAZO" ? dueDate || "-" : "Pagamento imediato"}</p>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={isLoading || !selectedUnitId}>
              Abrir OS
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
