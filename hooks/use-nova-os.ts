"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import type { VehicleFormValues } from "@/components/vehicles/vehicle-form";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import { useEmployees } from "@/hooks/use-employees";
import { useServices } from "@/hooks/use-services";
import { useUnits } from "@/hooks/use-units";
import { useVehicles } from "@/hooks/use-vehicles";
import { currency, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { getPersonDocument, getPersonName } from "@/lib/person-helpers";

export type ServiceDraft = {
  id: string;
  serviceId: string;
  description: string;
  laborPrice: number;
  laborPriceInput: string;
  executedByUserId: string;
};

export function createDraft(index: number): ServiceDraft {
  return {
    id: `service-${index}`,
    serviceId: "",
    description: "",
    laborPrice: 0,
    laborPriceInput: formatCurrencyInput("0"),
    executedByUserId: "",
  };
}

export function useNovaOs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { unitId, currentUnit, isLoading: unitLoading } = useCurrentUnit();
  const { units } = useUnits();
  const { customers, hydrated: customersHydrated } = useCustomers();
  const { services: catalogServices, hydrated: servicesHydrated } = useServices();
  const { employees, hydrated: employeesHydrated } = useEmployees();
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [isStandalone, setIsStandalone] = useState(false);
  const [customerNameSnapshot, setCustomerNameSnapshot] = useState("");
  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [mileage, setMileage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentTerm, setPaymentTerm] = useState<"A_VISTA" | "A_PRAZO">("A_VISTA");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([createDraft(1)]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [sameEmployeeForAll, setSameEmployeeForAll] = useState(false);
  const [globalEmployeeId, setGlobalEmployeeId] = useState("");
  const { vehicles, hydrated: vehiclesHydrated, setVehicles } = useVehicles(clientId || undefined);

  useEffect(() => {
    const incomingClientId = searchParams.get("clientId");
    const standalone = searchParams.get("standalone");
    if (unitId) {
      setSelectedUnitId(unitId);
    }
    if (standalone === "1") {
      setIsStandalone(true);
    }
    if (incomingClientId) {
      setClientId(incomingClientId);
      setIsStandalone(false);
    }
  }, [searchParams, unitId]);

  useEffect(() => {
    if (!sameEmployeeForAll || !globalEmployeeId) {
      return;
    }
    setServices((current) => current.map((item) => ({ ...item, executedByUserId: globalEmployeeId })));
  }, [sameEmployeeForAll, globalEmployeeId]);

  const employeeOptions = useMemo(
    () =>
      employees
        .filter((emp) => emp.situacao === "Ativo")
        .map((emp) => ({
          value: emp.id,
          label: emp.nomeCompleto,
        })),
    [employees],
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        value: vehicle.id,
        label: `${vehicle.plate} • ${vehicle.brand} ${vehicle.model}`,
      })),
    [vehicles],
  );

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: [
          customer ? getPersonName(customer) : "Sem cliente",
          customer ? getPersonDocument(customer) : "",
        ]
          .filter(Boolean)
          .join(" • "),
      })),
    [customers],
  );

  const serviceOptions = useMemo(
    () =>
      catalogServices
        .filter((service) => service.isActive)
        .map((service) => ({
          value: service.id,
          label: `${service.name} • ${currency(service.basePrice)}`,
        })),
    [catalogServices],
  );

  const selectedClient = customers.find((client) => client.id === clientId);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);
  const total = services.reduce((sum, service) => sum + Number(service.laborPrice || 0), 0);
  const isLoading = unitLoading || !customersHydrated || !servicesHydrated || !vehiclesHydrated || !employeesHydrated;
  const unitOptions = units.map((unit) => ({ value: unit.id, label: unit.name }));

  const summaryUnitName =
    units.find((unit) => unit.id === selectedUnitId)?.name ?? currentUnit?.name ?? "Nenhuma unidade selecionada";
  const summaryClientName = isStandalone
    ? customerNameSnapshot || "Não informado"
    : selectedClient
      ? getPersonName(selectedClient)
      : "Não selecionado";
  const summaryVehiclePlate = selectedVehicle?.plate ?? "Não vinculado";

  function onServiceChange(id: string, patch: Partial<ServiceDraft>) {
    setServices((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeService(id: string) {
    setServices((current) => current.filter((item) => item.id !== id));
  }

  function addService() {
    setServices((current) => {
      const draft = createDraft(current.length + 1);
      if (sameEmployeeForAll && globalEmployeeId) {
        draft.executedByUserId = globalEmployeeId;
      }
      return [...current, draft];
    });
  }

  function enterStandaloneMode() {
    setIsStandalone(true);
    setClientId("");
    setVehicleId("");
  }

  async function handleCreateVehicle(values: VehicleFormValues) {
    const response = await fetch("/api/vehicles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível cadastrar o veículo.");
      return;
    }

    setVehicles((current) => [...current, data.vehicle]);
    setVehicleId(data.vehicle.id);
    setVehicleModalOpen(false);
    toast.success("Veículo cadastrado com sucesso!");
  }

  async function handleSubmit() {
    if (!selectedUnitId) {
      toast.error("Selecione uma unidade válida antes de abrir a OS.");
      return;
    }

    if (!isStandalone && !clientId) {
      toast.error("Selecione o cliente para abrir a OS.");
      return;
    }

    if (isStandalone && !customerNameSnapshot.trim()) {
      toast.error("Informe o nome do cliente avulso.");
      return;
    }

    if (paymentTerm === "A_PRAZO" && !dueDate) {
      toast.error("Informe a data de vencimento.");
      return;
    }

    const normalizedServices = services
      .map((service) => ({
        serviceId: service.serviceId || undefined,
        description: service.description.trim(),
        laborPrice: Number(service.laborPrice || 0),
        executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
      }))
      .filter((service) => service.description.length > 0);

    if (!normalizedServices.length) {
      toast.error("Adicione pelo menos um serviço na OS.");
      return;
    }

    const response = await fetch("/api/service-orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unitId: selectedUnitId,
        customerId: isStandalone ? null : clientId,
        customerNameSnapshot: isStandalone ? customerNameSnapshot : "",
        vehicleId: vehicleId || undefined,
        mileage: mileage ? Number(mileage) : undefined,
        paymentMethod,
        paymentTerm,
        dueDate: paymentTerm === "A_PRAZO" ? dueDate : null,
        notes,
        services: normalizedServices,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível abrir a OS.");
      return;
    }

    toast.success("OS criada com sucesso!");
    router.push("/ordens-de-servico");
  }

  return {
    customers,
    customersHydrated,
    catalogServices,
    servicesHydrated,
    vehiclesHydrated,
    employees,
    employeesHydrated,
    employeeOptions,
    selectedUnitId,
    setSelectedUnitId,
    isStandalone,
    setIsStandalone,
    enterStandaloneMode,
    customerNameSnapshot,
    setCustomerNameSnapshot,
    clientId,
    setClientId,
    vehicleId,
    setVehicleId,
    mileage,
    setMileage,
    paymentMethod,
    setPaymentMethod,
    paymentTerm,
    setPaymentTerm,
    dueDate,
    setDueDate,
    notes,
    setNotes,
    services,
    vehicleModalOpen,
    setVehicleModalOpen,
    vehicleOptions,
    customerOptions,
    serviceOptions,
    unitOptions,
    total,
    isLoading,
    summaryUnitName,
    summaryClientName,
    summaryVehiclePlate,
    sameEmployeeForAll,
    setSameEmployeeForAll,
    globalEmployeeId,
    setGlobalEmployeeId,
    onServiceChange,
    removeService,
    addService,
    handleCreateVehicle,
    handleSubmit,
  };
}

export type NovaOsController = ReturnType<typeof useNovaOs>;
