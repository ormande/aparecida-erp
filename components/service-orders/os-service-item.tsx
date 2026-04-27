"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ServiceDraft } from "@/hooks/use-nova-os";
import type { AppService } from "@/lib/db-mappers";
import { currency, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

type ServiceOption = { value: string; label: string };

export function OsServiceItem({
  index,
  service,
  catalogServices,
  serviceOptions,
  servicesHydrated,
  employeeOptions,
  sameEmployeeForAll,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  service: ServiceDraft;
  catalogServices: AppService[];
  serviceOptions: ServiceOption[];
  servicesHydrated: boolean;
  employeeOptions: ServiceOption[];
  sameEmployeeForAll: boolean;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<ServiceDraft>) => void;
  onRemove: (id: string) => void;
}) {
  const lineTotal = (Number(service.quantity) || 0) * service.laborPrice;

  return (
    <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Serviço {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={!canRemove}
          onClick={() => onRemove(service.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-2">
        <Label>Serviço do catálogo</Label>
        <SearchableSelect
          value={service.serviceId}
          onChange={(value) => {
            const selectedService = catalogServices.find((item) => item.id === value);
            onChange(service.id, {
              serviceId: value,
              description: selectedService?.name ?? service.description,
              laborPrice: selectedService?.basePrice ?? service.laborPrice,
              laborPriceInput: formatCurrencyInput(
                String(Math.round((selectedService?.basePrice ?? service.laborPrice) * 100)),
              ),
            });
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
          onChange={(e) => onChange(service.id, { description: e.target.value })}
          placeholder="Descrição do serviço"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Quantidade</Label>
          <Input
            inputMode="numeric"
            value={service.quantity}
            onChange={(e) => onChange(service.id, { quantity: e.target.value })}
            placeholder="1"
          />
        </div>

        <div className="grid gap-2">
          <Label>Valor unitário</Label>
          <Input
            inputMode="decimal"
            value={service.laborPriceInput}
            onChange={(e) =>
              onChange(service.id, {
                laborPriceInput: formatCurrencyInput(e.target.value),
                laborPrice: parseCurrencyInput(formatCurrencyInput(e.target.value)),
              })
            }
          />
        </div>

        <div className="grid gap-2">
          <Label>Total</Label>
          <div className="flex h-9 items-center rounded-2xl bg-muted px-3 text-sm font-medium">
            {currency(lineTotal)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="grid gap-2">
          <Label>Funcionário executante</Label>
          <SearchableSelect
            value={service.executedByUserId}
            onChange={(value) =>
              onChange(service.id, {
                executedByUserId: value,
                commissionRate: value === "__casa__" ? 0 : service.commissionRate,
              })
            }
            placeholder="Selecione o funcionário (opcional)"
            options={employeeOptions}
            disabled={sameEmployeeForAll || !employeeOptions.length}
          />
        </div>

        <div className="grid gap-2">
          <Label>Comissão</Label>
          <div className="flex gap-2">
            {service.executedByUserId === "__casa__" ? (
              <Button type="button" size="sm" variant="default" disabled>
                0% (Casa)
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={service.commissionRate === 12 ? "default" : "outline"}
                  onClick={() => onChange(service.id, { commissionRate: 12 })}
                >
                  12%
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={service.commissionRate === 30 ? "default" : "outline"}
                  onClick={() => onChange(service.id, { commissionRate: 30 })}
                >
                  30%
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
