"use client";

import { useMemo, useState } from "react";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/app-types";

export type VehicleFormValues = {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  notes: string;
  clientId: string;
};

type VehicleFormProps = {
  customers: Client[];
  submitLabel: string;
  onSubmit: (values: VehicleFormValues) => void;
  initialValues?: Partial<VehicleFormValues>;
  lockedClientId?: string;
};

type VehicleFormErrors = Partial<Record<keyof VehicleFormValues, string>>;

function maskPlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8);
}

function getClientDisplayName(client: Client) {
  return client.tipo === "pf" ? client.nomeCompleto ?? "Sem nome" : client.nomeFantasia ?? "Sem nome";
}

export function VehicleForm({
  customers,
  submitLabel,
  onSubmit,
  initialValues,
  lockedClientId,
}: VehicleFormProps) {
  const [values, setValues] = useState<VehicleFormValues>({
    plate: initialValues?.plate ?? "",
    brand: initialValues?.brand ?? "",
    model: initialValues?.model ?? "",
    year: initialValues?.year ?? new Date().getFullYear(),
    color: initialValues?.color ?? "",
    notes: initialValues?.notes ?? "",
    clientId: lockedClientId ?? initialValues?.clientId ?? "",
  });
  const [errors, setErrors] = useState<VehicleFormErrors>({});

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: getClientDisplayName(customer),
      })),
    [customers],
  );

  function updateField<K extends keyof VehicleFormValues>(field: K, value: VehicleFormValues[K]) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: VehicleFormErrors = {};

    if (!values.clientId.trim()) nextErrors.clientId = "Selecione o cliente.";
    if (!values.plate.trim()) nextErrors.plate = "Informe a placa.";
    if (!values.brand.trim()) nextErrors.brand = "Informe a marca.";
    if (!values.model.trim()) nextErrors.model = "Informe o modelo.";
    if (!values.year || Number.isNaN(values.year)) nextErrors.year = "Informe o ano.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label>Cliente vinculado *</Label>
        <SearchableSelect
          value={values.clientId}
          onChange={(value) => updateField("clientId", value)}
          placeholder="Selecione o cliente"
          options={customerOptions}
          disabled={Boolean(lockedClientId)}
        />
        {errors.clientId ? <p className="text-xs text-destructive">{errors.clientId}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="plate">Placa *</Label>
        <Input
          id="plate"
          value={values.plate}
          onChange={(event) => updateField("plate", maskPlate(event.target.value))}
          placeholder="ABC-1234 ou ABC1D23"
        />
        {errors.plate ? <p className="text-xs text-destructive">{errors.plate}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="brand">Marca *</Label>
          <Input id="brand" value={values.brand} onChange={(event) => updateField("brand", event.target.value)} />
          {errors.brand ? <p className="text-xs text-destructive">{errors.brand}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="model">Modelo *</Label>
          <Input id="model" value={values.model} onChange={(event) => updateField("model", event.target.value)} />
          {errors.model ? <p className="text-xs text-destructive">{errors.model}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="year">Ano *</Label>
          <Input
            id="year"
            type="number"
            value={values.year}
            onChange={(event) => updateField("year", Number(event.target.value))}
          />
          {errors.year ? <p className="text-xs text-destructive">{errors.year}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="color">Cor</Label>
          <Input id="color" value={values.color} onChange={(event) => updateField("color", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Observacoes</Label>
        <Textarea id="notes" value={values.notes} onChange={(event) => updateField("notes", event.target.value)} />
      </div>

      <Button
        onClick={() => {
          if (!validate()) return;
          onSubmit(values);
        }}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
