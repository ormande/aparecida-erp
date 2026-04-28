"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";

import type { VehicleFormValues } from "@/components/vehicles/vehicle-form";
import type { CadastroPessoaFormValues } from "@/components/people/cadastro-pessoa-form";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import { useEmployees } from "@/hooks/use-employees";
import { useServices } from "@/hooks/use-services";
import { useUnits } from "@/hooks/use-units";
import { useVehicles } from "@/hooks/use-vehicles";
import { VEICULOS_ATIVO } from "@/lib/config";
import { currency, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { getPersonDocument, getPersonName } from "@/lib/person-helpers";

export type ServiceDraft = {
  id: string;
  serviceId: string;
  description: string;
  quantity: string;
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
    quantity: "1",
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
  const [customOsNumber, setCustomOsNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [isCheckingCustomOsNumber, setIsCheckingCustomOsNumber] = useState(false);
  const [isCustomOsNumberDuplicate, setIsCustomOsNumberDuplicate] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
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
    if (units.length >= 1 && !selectedUnitId) {
      setSelectedUnitId(units[0].id);
    }
  }, [units, selectedUnitId]);

  useEffect(() => {
    if (!sameEmployeeForAll || !globalEmployeeId) {
      return;
    }
    setServices((current) =>
      current.map((item) => ({
        ...item,
        executedByUserId: globalEmployeeId,
        commissionRate: globalEmployeeId === "__casa__" ? 0 : item.commissionRate,
      })),
    );
  }, [sameEmployeeForAll, globalEmployeeId]);

  useEffect(() => {
    if (paymentTerm !== "A_PRAZO" || paymentMethod === "Mensal") {
      return;
    }
    setPaymentMethod("Mensal");
  }, [paymentMethod, paymentTerm]);

  useEffect(() => {
    if (isStandalone) {
      setIsCheckingCustomOsNumber(false);
      setIsCustomOsNumberDuplicate(false);
      return;
    }

    const numeric = Number(customOsNumber);
    if (!customOsNumber || !Number.isInteger(numeric) || numeric < 1 || numeric > 99999) {
      setIsCheckingCustomOsNumber(false);
      setIsCustomOsNumberDuplicate(false);
      return;
    }

    const controller = new AbortController();
    setIsCheckingCustomOsNumber(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/service-orders/check-number?number=${numeric}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            return { exists: false };
          }
          return response.json() as Promise<{ exists?: boolean }>;
        })
        .then((data) => {
          setIsCustomOsNumberDuplicate(Boolean(data.exists));
        })
        .catch(() => {
          setIsCustomOsNumberDuplicate(false);
        })
        .finally(() => {
          setIsCheckingCustomOsNumber(false);
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
      setIsCheckingCustomOsNumber(false);
    };
  }, [customOsNumber, isStandalone]);

  const employeeOptions = useMemo(
    () =>
      [
        { value: "__casa__", label: "🏠 Casa (sem comissão)" },
        ...employees
          .filter((emp) => emp.situacao === "Ativo")
          .map((emp) => ({
            value: emp.id,
            label: emp.nomeCompleto,
          })),
      ],
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
  const laborTotal = services.reduce(
    (sum, service) => sum + (Number(service.quantity) || 0) * Number(service.laborPrice || 0),
    0,
  );
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
        draft.commissionRate = globalEmployeeId === "__casa__" ? 0 : draft.commissionRate;
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

  async function handleCreateCustomer(values: CadastroPessoaFormValues) {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      toast.error((data as { message?: string; error?: string }).message ?? (data as { error?: string }).error ?? "Não foi possível cadastrar o cliente.");
      return;
    }

    const createdId = (data as { customer?: { id?: string } }).customer?.id;
    if (createdId) {
      setClientId(createdId);
      setVehicleId("");
    }

    setCustomerModalOpen(false);
    toast.success("Cliente cadastrado com sucesso!");
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
    setCustomOsNumber("");
    setDueDate("");
    setNotes("");
    setServices([]);
    setProducts([]);
    setSameEmployeeForAll(false);
    setGlobalEmployeeId("");
    setOpenedAtPreset("today");
    setOpenedAtCustom("");
    setCustomerModalOpen(false);
    setVehicleModalOpen(false);
  }

  function resetFormForContinue() {
    setIsStandalone(false);
    setCustomerNameSnapshot("");
    setClientId("");
    setVehicleId("");
    setMileage("");
    setCustomOsNumber("");
    setNotes("");
    setServices([]);
    setProducts([]);
    setSameEmployeeForAll(false);
    setGlobalEmployeeId("");
    setCustomerModalOpen(false);
    setVehicleModalOpen(false);
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

    if (!isStandalone && (!customOsNumber || Number(customOsNumber) < 1 || Number(customOsNumber) > 99999)) {
      toast.error("Informe um número de OS válido.");
      return;
    }
    if (!isStandalone && isCustomOsNumberDuplicate) {
      toast.error("Este número de OS já existe. Informe outro número.");
      return;
    }

    const normalizedServices = services
      .map((service) => ({
        serviceId: service.serviceId || undefined,
        description: service.description.trim(),
        quantity: Math.max(1, Math.floor(Number(service.quantity) || 1)),
        laborPrice: Number(service.laborPrice || 0),
        executedByUserId:
          service.executedByUserId?.trim() && service.executedByUserId !== "__casa__"
            ? service.executedByUserId
            : null,
        commissionRate: service.executedByUserId === "__casa__" ? 0 : (service.commissionRate ?? 12),
      }))
      .filter((service) => service.description.length > 0);

    const normalizedProducts = products
      .filter((p) => p.description.trim().length > 0 && Number(p.quantity) > 0)
      .map((p) => ({
        productId: p.productId || null,
        description: p.description,
        unit: p.unit,
        quantity: Number(p.quantity),
        unitPrice: p.unitPrice,
      }));

    if (!normalizedServices.length && !normalizedProducts.length) {
      toast.error("Adicione pelo menos um produto ou serviço na OS.");
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
        vehicleId: VEICULOS_ATIVO ? vehicleId || undefined : undefined,
        mileage: VEICULOS_ATIVO && mileage ? Number(mileage) : undefined,
        paymentMethod,
        paymentTerm,
        customOsNumber: isStandalone ? undefined : Number(customOsNumber),
        dueDate: paymentTerm === "A_PRAZO" ? dueDate : null,
        notes,
        openedAt: resolvedOpenedAt,
        services: normalizedServices,
        products: normalizedProducts,
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

    if (!isStandalone && (!customOsNumber || Number(customOsNumber) < 1 || Number(customOsNumber) > 99999)) {
      toast.error("Informe um número de OS válido.");
      return;
    }
    if (!isStandalone && isCustomOsNumberDuplicate) {
      toast.error("Este número de OS já existe. Informe outro número.");
      return;
    }

    const normalizedServices = services
      .map((service) => ({
        serviceId: service.serviceId || undefined,
        description: service.description.trim(),
        quantity: Math.max(1, Math.floor(Number(service.quantity) || 1)),
        laborPrice: Number(service.laborPrice || 0),
        executedByUserId:
          service.executedByUserId?.trim() && service.executedByUserId !== "__casa__"
            ? service.executedByUserId
            : null,
        commissionRate: service.executedByUserId === "__casa__" ? 0 : (service.commissionRate ?? 12),
      }))
      .filter((service) => service.description.length > 0);

    const normalizedProducts = products
      .filter((p) => p.description.trim().length > 0 && Number(p.quantity) > 0)
      .map((p) => ({
        productId: p.productId || null,
        description: p.description,
        unit: p.unit,
        quantity: Number(p.quantity),
        unitPrice: p.unitPrice,
      }));

    if (!normalizedServices.length && !normalizedProducts.length) {
      toast.error("Adicione pelo menos um produto ou serviço na OS.");
      return;
    }

    const response = await fetch("/api/service-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: selectedUnitId,
        customerId: isStandalone ? null : clientId,
        customerNameSnapshot: isStandalone ? customerNameSnapshot : "",
        vehicleId: VEICULOS_ATIVO ? vehicleId || undefined : undefined,
        mileage: VEICULOS_ATIVO && mileage ? Number(mileage) : undefined,
        paymentMethod,
        paymentTerm,
        customOsNumber: isStandalone ? undefined : Number(customOsNumber),
        dueDate: paymentTerm === "A_PRAZO" ? dueDate : null,
        notes,
        openedAt: resolvedOpenedAt,
        services: normalizedServices,
        products: normalizedProducts,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível abrir a OS.");
      return;
    }

    toast.success("OS criada! Formulário pronto para nova OS.");
    resetFormForContinue();
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
    customOsNumber,
    setCustomOsNumber,
    isCheckingCustomOsNumber,
    isCustomOsNumberDuplicate,
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
    customerModalOpen,
    setCustomerModalOpen,
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
    handleCreateCustomer,
    handleSubmit,
    handleSubmitAndContinue,
    resetForm,
    resetFormForContinue,
    openedAtPreset,
    setOpenedAtPreset,
    openedAtCustom,
    setOpenedAtCustom,
    resolvedOpenedAt,
  };
}

export type NovaOsController = ReturnType<typeof useNovaOs>;
