"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { clients, currency, getClientDisplayName, getClientDocument, vehicles } from "@/lib/mock-data";

type ServiceDraft = {
  id: string;
  description: string;
  laborPrice: number;
};

export default function NovaOsPage() {
  const searchParams = useSearchParams();
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [mileage, setMileage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([
    { id: "service-1", description: "", laborPrice: 0 },
  ]);

  useEffect(() => {
    const incomingClientId = searchParams.get("clientId");
    if (incomingClientId) {
      setClientId(incomingClientId);
    }
  }, [searchParams]);

  const vehicleOptions = useMemo(
    () =>
      vehicles
        .filter((vehicle) => !clientId || vehicle.clientId === clientId)
        .map((vehicle) => ({ value: vehicle.id, label: `${vehicle.plate} • ${vehicle.brand} ${vehicle.model}` })),
    [clientId],
  );

  const total = services.reduce((sum, service) => sum + Number(service.laborPrice || 0), 0);
  const selectedClient = clients.find((client) => client.id === clientId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nova Ordem de Serviço"
        subtitle="Abra uma nova OS com cliente, veículo, serviços executados e forma de pagamento."
        actions={
          <Link
            href="/ordens-de-servico"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition hover:bg-muted"
          >
            Voltar para a lista
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="surface-card border-none">
          <CardContent className="grid gap-6 p-6">
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
                  options={clients.map((client) => ({
                    value: client.id,
                    label: `${getClientDisplayName(client)} • ${getClientDocument(client)}`,
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Veículo vinculado</Label>
                <SearchableSelect
                  value={vehicleId}
                  onChange={setVehicleId}
                  placeholder="Selecione o veículo"
                  options={vehicleOptions}
                  disabled={!clientId}
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl">Serviços</h2>
                  <p className="text-sm text-muted-foreground">Adicione múltiplos serviços com valor de mão de obra.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    setServices((current) => [
                      ...current,
                      { id: `service-${current.length + 1}`, description: "", laborPrice: 0 },
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar serviço
                </Button>
              </div>

              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={service.id} className="grid gap-3 rounded-2xl border bg-muted/30 p-4 md:grid-cols-[minmax(0,1fr)_180px_44px]">
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
                    <div className="grid gap-2">
                      <Label>Valor mão de obra</Label>
                      <Input
                        type="number"
                        value={service.laborPrice}
                        onChange={(e) =>
                          setServices((current) =>
                            current.map((item) =>
                              item.id === service.id ? { ...item, laborPrice: Number(e.target.value) } : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="opacity-0">Remover</Label>
                      <Button
                        variant="outline"
                        size="icon"
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
                <Badge variant="secondary">Em breve — módulo de estoque</Badge>
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
              <p>Cliente: {selectedClient ? getClientDisplayName(selectedClient) : "Não selecionado"}</p>
              <p>Veículo: {vehicles.find((vehicle) => vehicle.id === vehicleId)?.plate ?? "Não selecionado"}</p>
              <p>Forma de pagamento: {paymentMethod}</p>
            </div>
            <Button className="w-full" onClick={() => toast.success("OS criada com sucesso!")}>
              Abrir OS
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
