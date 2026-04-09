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
import {
  formatCurrencyInput,
  formatMoneyMaskFromNumber,
  formatMoneyMaskInput,
  parseCurrencyInput,
  parseMoneyMaskInput,
} from "@/lib/formatters";

const UNIT_OPTIONS = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "PAR", label: "Par (PAR)" },
  { value: "KIT", label: "Kit (KIT)" },
  { value: "L", label: "Litro (L)" },
  { value: "ML", label: "Mililitro (ML)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "G", label: "Grama (G)" },
  { value: "CX", label: "Caixa (CX)" },
] as const;

export type ProductFormValues = {
  name: string;
  description: string;
  brand: string;
  category: string;
  unit: string;
  internalCode: string;
  costPrice: number | null;
  salePrice: number;
  notes: string;
};

type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

type ProductFormProps = {
  initialValues?: Partial<ProductFormValues>;
  categories?: string[];
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => void;
};

function getDefaults(initial?: Partial<ProductFormValues>): ProductFormValues & { costPriceInput: string; salePriceInput: string } {
  const cost = initial?.costPrice;
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    brand: initial?.brand ?? "",
    category: initial?.category ?? "",
    unit: initial?.unit ?? "UN",
    internalCode: initial?.internalCode ?? "",
    costPrice: cost === undefined || cost === null ? null : cost,
    salePrice: initial?.salePrice ?? 0,
    notes: initial?.notes ?? "",
    costPriceInput:
      cost === undefined || cost === null ? "" : formatMoneyMaskFromNumber(cost),
    salePriceInput: formatCurrencyInput(String(Math.round((initial?.salePrice ?? 0) * 100))),
  };
}

export function ProductForm({ initialValues, categories = [], submitLabel, onSubmit }: ProductFormProps) {
  const [values, setValues] = useState(() => getDefaults(initialValues));
  const [errors, setErrors] = useState<ProductFormErrors>({});

  function updateField<K extends keyof typeof values>(field: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: ProductFormErrors = {};
    if (!values.name.trim()) nextErrors.name = "Informe o nome do produto.";
    if (values.costPrice !== null && values.costPrice < 0) {
      nextErrors.costPrice = "Preço de custo inválido.";
    }
    if (values.salePrice < 0) nextErrors.salePrice = "Preço de venda inválido.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <div className="grid gap-5 py-2">
      <div className="grid gap-2">
        <Label htmlFor="product-name">Nome do produto *</Label>
        <Input
          id="product-name"
          value={values.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Ex: Pneu 175/70 R13"
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="product-brand">Marca</Label>
          <Input
            id="product-brand"
            value={values.brand}
            onChange={(e) => updateField("brand", e.target.value)}
            placeholder="Ex: Pirelli"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-category">Categoria</Label>
          <Input
            id="product-category"
            list="product-categories"
            value={values.category}
            onChange={(e) => updateField("category", e.target.value)}
            placeholder="Ex: Pneus"
          />
          {categories.length > 0 ? (
            <datalist id="product-categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Unidade</Label>
          <Select value={values.unit} onValueChange={(value) => updateField("unit", value ?? "UN")}>
            <SelectTrigger className="w-full rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-code">Código interno</Label>
          <Input
            id="product-code"
            value={values.internalCode}
            onChange={(e) => updateField("internalCode", e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="product-cost">Preço de custo</Label>
          <Input
            id="product-cost"
            inputMode="numeric"
            placeholder="Opcional"
            value={values.costPriceInput}
            onChange={(e) => {
              const formatted = formatMoneyMaskInput(e.target.value);
              updateField("costPriceInput", formatted);
              updateField("costPrice", parseMoneyMaskInput(formatted));
            }}
          />
          {errors.costPrice ? <p className="text-xs text-destructive">{errors.costPrice}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="product-sale">Preço de venda *</Label>
          <Input
            id="product-sale"
            inputMode="numeric"
            value={values.salePriceInput}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              updateField("salePriceInput", formatted);
              updateField("salePrice", parseCurrencyInput(formatted));
            }}
          />
          {errors.salePrice ? <p className="text-xs text-destructive">{errors.salePrice}</p> : null}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="product-notes">Observações</Label>
        <Textarea
          id="product-notes"
          rows={3}
          value={values.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Informações adicionais sobre o produto"
        />
      </div>

      <Button
        onClick={() => {
          if (!validate()) return;
          onSubmit({
            name: values.name,
            description: values.description,
            brand: values.brand,
            category: values.category,
            unit: values.unit,
            internalCode: values.internalCode,
            costPrice: values.costPrice,
            salePrice: values.salePrice,
            notes: values.notes,
          });
        }}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
