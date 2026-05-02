"use client";

import { Trash2 } from "lucide-react";

import { ProductCombobox } from "@/components/products/product-combobox";
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
import type { ProductDraft } from "@/hooks/use-nova-os";
import { currency, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

const UNIT_OPTIONS = ["UN", "PAR", "KIT", "L", "ML", "KG", "G", "CX"] as const;

export function OsProductLine({
  draft,
  index,
  onProductChange,
  removeProduct,
}: {
  draft: ProductDraft;
  index: number;
  onProductChange: (id: string, patch: Partial<ProductDraft>) => void;
  removeProduct: (id: string) => void;
}) {
  const lineTotal = (Number(draft.quantity) || 0) * draft.unitPrice;
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Produto {index + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          type="button"
          onClick={() => removeProduct(draft.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Produto do catálogo</Label>
          <ProductCombobox
            value={draft.productId}
            onChange={(product) => {
              onProductChange(draft.id, {
                productId: product.id,
                description: product.name,
                unit: product.unit,
                unitPrice: product.salePrice,
                unitPriceInput: formatCurrencyInput(String(Math.round(product.salePrice * 100))),
              });
            }}
          />
        </div>

        <div className="grid gap-2">
          <Label>Descrição</Label>
          <Input
            value={draft.description}
            onChange={(e) => onProductChange(draft.id, { description: e.target.value })}
            placeholder="Descrição do produto"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-2">
            <Label>Unidade</Label>
            <Select value={draft.unit} onValueChange={(value) => onProductChange(draft.id, { unit: value ?? "UN" })}>
              <SelectTrigger className="w-full rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Quantidade</Label>
            <Input
              inputMode="decimal"
              value={draft.quantity}
              onChange={(e) => onProductChange(draft.id, { quantity: e.target.value })}
              placeholder="1"
            />
          </div>

          <div className="grid gap-2">
            <Label>Valor unitário</Label>
            <Input
              inputMode="numeric"
              value={draft.unitPriceInput}
              onChange={(e) => {
                const formatted = formatCurrencyInput(e.target.value);
                onProductChange(draft.id, {
                  unitPriceInput: formatted,
                  unitPrice: parseCurrencyInput(formatted),
                });
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label>Total</Label>
            <div className="flex h-9 items-center rounded-2xl bg-muted px-3 text-sm font-medium">{currency(lineTotal)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bloco de linhas de produto na nova OS (nome estável para o bundle / Fast Refresh). */
export function OsProductsSection({
  products,
  onProductChange,
  removeProduct,
}: {
  products: ProductDraft[];
  onProductChange: (id: string, patch: Partial<ProductDraft>) => void;
  removeProduct: (id: string) => void;
}) {
  return (
    <>
      {products.map((draft, index) => (
        <OsProductLine
          key={draft.id}
          draft={draft}
          index={index}
          onProductChange={onProductChange}
          removeProduct={removeProduct}
        />
      ))}
    </>
  );
}
