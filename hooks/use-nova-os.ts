"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";

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
  commissionRate: number;
};

export type ProductDraft = {
  id: string;
  productId: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: number;
  unitPriceInput: string;
};

export function createProductDraft(index: number): ProductDraft {
  return {
    id: `product-${index}`,
    productId: "",
    description: "",
    unit: "UN",
    quantity: "1",
    unitPrice: 0,
    unitPriceInput: formatCurrencyInput("0"),
  };
}

export function createDraft(index: number): ServiceDraft {
  return {
    id: `service-${index}`,
    serviceId: "",
    description: "",
    laborPrice: 0,
    laborPriceInput: formatCurrencyInput("0"),
    executedByUserId: "",
    commissionRate: 12,
  };
}

export function useNovaOs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUnit, isLoading: unitLoading } = useCurrentUnit();
  const { units } = useUnits();
  const { customers, hydrated: customersHydrated } = useCustomers({ limit: 200 });
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
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [sameEmployeeForAll, setSameEmployeeForAll] = useState(false);
  const [globalEmployeeId, setGlobalEmployeeId] = useState("");
  const [openedAtPreset, setOpenedAtPreset] = useState<"today" | "yesterday" | "other">("today");
  const [openedAtCustom, setOpenedAtCustom] = useState("");
  const { vehicles, hydrated: vehiclesHydrated, setVehicles } = useVehicles(clientId || undefined);

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  const resolvedOpenedAt =
    openedAtPreset === "today"
      ? todayStr()
      : openedAtPreset === "yesterday"
        ? yesterdayStr()
        : openedAtCustom;

  const urlClientId = searchParams.get("clientId");
  const urlStandalone = searchParams.get("standalone");

  useEffect(() => {
    if (urlStandalone === "1") {
      setIsStandalone(true);
    }
    if (urlClientId) {
      setClientId(urlClientId);
      setIsStandalone(false);
    }
  }, [urlClientId, urlStandalone]);

  useEffect(() => {
    if (units.length === 1 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

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
  const laborTotal = services.reduce((sum, service) => sum + Number(service.laborPrice || 0), 0);
  const productsTotal = products.reduce((sum, p) => sum + (Number(p.quantity) || 0) * p.unitPrice, 0);
  const total = laborTotal + productsTotal;
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

  function onProductChange(id: string, patch: Partial<ProductDraft>) {
    setProducts((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeProduct(id: string) {
    setProducts((current) => current.filter((item) => item.id !== id));
  }

  function addProduct() {
    setProducts((current) => [...current, createProductDraft(current.length + 1)]);
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
    void mutate((key: string) => typeof key === "string" && key.startsWith("/api/customers"), undefined, {
      revalidate: true,
    });
  }

  function resetForm() {
    setIsStandalone(false);
    setCustomerNameSnapshot("");
    setClientId("");
    setVehicleId("");
    setMileage("");
    setPaymentMethod("Pix");
    setPaymentTerm("A_VISTA");
    setDueDate("");
    setNotes("");
    setServices([createDraft(1)]);
    setProducts([]);
    setSameEmployeeForAll(false);
    setGlobalEmployeeId("");
    setOpenedAtPreset("today");
    setOpenedAtCustom("");
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

    if (openedAtPreset === "other" && !/^\d{4}-\d{2}-\d{2}$/.test(openedAtCustom)) {
      toast.error("Informe uma data de lançamento válida.");
      return;
    }

    const normalizedServices = services
      .map((service) => ({
        serviceId: service.serviceId || undefined,
        description: service.description.trim(),
        laborPrice: Number(service.laborPrice || 0),
        executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
        commissionRate: service.commissionRate ?? 12,
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
        openedAt: resolvedOpenedAt,
        services: normalizedServices,
        products: products
          .filter((p) => p.description.trim().length > 0 && Number(p.quantity) > 0)
          .map((p) => ({
            productId: p.productId || null,
            description: p.description,
            unit: p.unit,
            quantity: Number(p.quantity),
            unitPrice: p.unitPrice,
          })),
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

  async function handleSubmitAndContinue() {
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

    if (openedAtPreset === "other" && !/^\d{4}-\d{2}-\d{2}$/.test(openedAtCustom)) {
      toast.error("Informe uma data de lançamento válida.");
      return;
    }

    const normalizedServices = services
      .map((service) => ({
        serviceId: service.serviceId || undefined,
        description: service.description.trim(),
        laborPrice: Number(service.laborPrice || 0),
        executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
        commissionRate: service.commissionRate ?? 12,
      }))
      .filter((service) => service.description.length > 0);

    if (!normalizedServices.length) {
      toast.error("Adicione pelo menos um serviço na OS.");
      return;
    }

    const response = await fetch("/api/service-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        openedAt: resolvedOpenedAt,
        services: normalizedServices,
        products: products
          .filter((p) => p.description.trim().length > 0 && Number(p.quantity) > 0)
          .map((p) => ({
            productId: p.productId || null,
            description: p.description,
            unit: p.unit,
            quantity: Number(p.quantity),
            unitPrice: p.unitPrice,
          })),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível abrir a OS.");
      return;
    }

    toast.success("OS criada! Formulário pronto para nova OS.");
    resetForm();
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
    products,
    onProductChange,
    removeProduct,
    addProduct,
    laborTotal,
    productsTotal,
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
    handleSubmitAndContinue,
    resetForm,
    openedAtPreset,
    setOpenedAtPreset,
    openedAtCustom,
    setOpenedAtCustom,
    resolvedOpenedAt,
  };
}

export type NovaOsController = ReturnType<typeof useNovaOs>;
