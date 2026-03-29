"use client";

import { useEffect, useMemo, useState } from "react";

import { employees as initialEmployees, type Employee } from "@/lib/mock-data";

const EMPLOYEES_STORAGE_KEY = "aparecida-erp-employees";

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EMPLOYEES_STORAGE_KEY);
      if (raw) {
        setEmployees(JSON.parse(raw) as Employee[]);
      }
    } catch {
      setEmployees(initialEmployees);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
  }, [employees, hydrated]);

  return useMemo(
    () => ({
      employees,
      hydrated,
      addEmployee: (employee: Employee) => setEmployees((current) => [...current, employee]),
      updateEmployee: (employee: Employee) =>
        setEmployees((current) => current.map((item) => (item.id === employee.id ? employee : item))),
    }),
    [employees, hydrated],
  );
}
