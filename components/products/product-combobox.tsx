"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

type ProductOption = {
  id: string;
  name: string;
  unit: string;
  salePrice: number;
};

type ProductApiRow = {
  id: string;
  name: string;
  unit: string;
  salePrice: number | string;
};

type ProductComboboxProps = {
  value: string;
  onChange: (product: ProductOption) => void;
  placeholder?: string;
};

export function ProductCombobox({ value, onChange, placeholder = "Selecione um produto" }: ProductComboboxProps) {
  const [products, setProducts] = useState<ProductOption[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/products?isActive=true")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const items = ((data.products ?? []) as ProductApiRow[]).map((p) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          salePrice: Number(p.salePrice),
        }));
        setProducts(items);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const options = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name })),
    [products],
  );

  return (
    <SearchableSelect
      value={value}
      onChange={(selectedId) => {
        const product = products.find((p) => p.id === selectedId);
        if (product) onChange(product);
      }}
      placeholder={placeholder}
      options={options}
    />
  );
}
