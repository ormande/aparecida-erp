"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

export type ServiceFormValues = {
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
};

type ServiceFormProps = {
  submitLabel: string;
  initialValues?: Partial<ServiceFormValues>;
  onSubmit: (values: ServiceFormValues) => void;
};

type ServiceFormErrors = Partial<Record<keyof ServiceFormValues, string>>;

export function ServiceForm({ submitLabel, initialValues, onSubmit }: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    basePrice: initialValues?.basePrice ?? 0,
    isActive: initialValues?.isActive ?? true,
  });
  const [basePriceInput, setBasePriceInput] = useState(
    formatCurrencyInput(String(Math.round((initialValues?.basePrice ?? 0) * 100))),
  );
  const [errors, setErrors] = useState<ServiceFormErrors>({});

  function updateField<K extends keyof ServiceFormValues>(field: K, value: ServiceFormValues[K]) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: ServiceFormErrors = {};

    if (!values.name.trim()) nextErrors.name = "Informe o nome do serviço.";
    if (Number.isNaN(values.basePrice) || values.basePrice < 0) nextErrors.basePrice = "Informe um valor válido.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <div className="grid gap-5 py-2">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome do serviço *</Label>
        <Input id="name" value={values.name} onChange={(event) => updateField("name", event.target.value)} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="basePrice">Valor base</Label>
          <Input
            id="basePrice"
            inputMode="decimal"
            value={basePriceInput}
            onChange={(event) => {
              const formatted = formatCurrencyInput(event.target.value);
              setBasePriceInput(formatted);
              updateField("basePrice", parseCurrencyInput(formatted));
            }}
          />
          {errors.basePrice ? <p className="text-xs text-destructive">{errors.basePrice}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label>Situação</Label>
          <Select value={values.isActive ? "Ativo" : "Inativo"} onValueChange={(value) => updateField("isActive", value === "Ativo")}>
            <SelectTrigger className="w-full rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
