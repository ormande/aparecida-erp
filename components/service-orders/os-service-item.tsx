"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { ServiceDraft } from "@/hooks/use-nova-os";
import type { AppService } from "@/lib/db-mappers";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

type ServiceOption = { value: string; label: string };

export function OsServiceItem({
  service,
  index,
  catalogServices,
  serviceOptions,
  servicesHydrated,
  canRemove,
  onChange,
  onRemove,
}: {
  service: ServiceDraft;
  index: number;
  catalogServices: AppService[];
  serviceOptions: ServiceOption[];
  servicesHydrated: boolean;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<ServiceDraft>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border bg-muted/30 p-4 md:grid-cols-[minmax(0,1fr)_180px_52px]">
      <div className="grid gap-3">
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
            onChange(service.id, {
              laborPriceInput: formatCurrencyInput(e.target.value),
              laborPrice: parseCurrencyInput(formatCurrencyInput(e.target.value)),
            })
          }
        />
      </div>
      <div className="grid gap-2">
        <Label className="opacity-0">Remover</Label>
        <Button variant="outline" size="icon-sm" disabled={!canRemove} onClick={() => onRemove(service.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
