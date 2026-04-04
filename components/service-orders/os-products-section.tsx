"use client";

import { Plus, Trash2 } from "lucide-react";

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

type OsProductsSectionProps = {
  products: ProductDraft[];
  onProductChange: (id: string, patch: Partial<ProductDraft>) => void;
  removeProduct: (id: string) => void;
  addProduct: () => void;
};

export function OsProductsSection({ products, onProductChange, removeProduct, addProduct }: OsProductsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl">Produtos</h2>
          <p className="text-sm text-muted-foreground">Selecione do catálogo ou descreva manualmente.</p>
        </div>
        <Button variant="outline" onClick={addProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar produto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
          Nenhum produto adicionado. Clique em &quot;Adicionar produto&quot; para começar.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((draft, index) => {
            const lineTotal = (Number(draft.quantity) || 0) * draft.unitPrice;
            return (
              <div
                key={draft.id}
                className="rounded-2xl border bg-muted/20 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Produto {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
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
                      <Select
                        value={draft.unit}
                        onValueChange={(value) => onProductChange(draft.id, { unit: value ?? "UN" })}
                      >
                        <SelectTrigger className="w-full rounded-2xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
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
                      <div className="flex h-9 items-center rounded-2xl bg-muted px-3 text-sm font-medium">
                        {currency(lineTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
