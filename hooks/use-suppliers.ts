"use client";

import { useEffect, useMemo, useState } from "react";

import { suppliers as initialSuppliers, type Supplier } from "@/lib/mock-data";

const SUPPLIERS_STORAGE_KEY = "aparecida-erp-suppliers";

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SUPPLIERS_STORAGE_KEY);
      if (raw) {
        setSuppliers(JSON.parse(raw) as Supplier[]);
      }
    } catch {
      setSuppliers(initialSuppliers);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(SUPPLIERS_STORAGE_KEY, JSON.stringify(suppliers));
  }, [hydrated, suppliers]);

  const api = useMemo(
    () => ({
      suppliers,
      hydrated,
      addSupplier: (supplier: Supplier) => setSuppliers((current) => [...current, supplier]),
      updateSupplier: (supplier: Supplier) =>
        setSuppliers((current) => current.map((item) => (item.id === supplier.id ? supplier : item))),
    }),
    [hydrated, suppliers],
  );

  return api;
}
