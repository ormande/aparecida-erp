"use client";

import { Eye, FileDown, Pencil, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { useServices } from "@/hooks/use-services";
import { useUnits } from "@/hooks/use-units";
import { useVehicles } from "@/hooks/use-vehicles";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { getPersonName } from "@/lib/person-helpers";

export type OrderStatus = "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Cancelada";
export type ReceivableStatus = "PAGO" | "PENDENTE" | "VENCIDO" | null;

export type OrderDetails = {
  id: string;
  number: string;
  clientId: string | null;
  clientName: string;
  customerNameSnapshot?: string | null;
  unitId: string;
  unitName?: string;
  vehicleId: string | null;
  vehicleLabel: string;
  status: OrderStatus;
  paymentStatus: "PENDENTE" | "PAGO_PARCIAL" | "PAGO";
  total: number;
  openedAt: string;
  dueDate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod: string;
  notes: string;
  mileage: number | null;
  isStandalone: boolean;
  laborSubtotal?: number;
  productsSubtotal?: number;
  services: Array<{
    id: string;
    serviceId?: string | null;
    description: string;
    quantity?: number;
    laborPrice: number;
    executedByUserId?: string | null;
    executedByName?: string | null;
  }>;
  products?: Array<{
    id: string;
    productId?: string | null;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sortOrder: number;
  }>;
  receivableStatus: ReceivableStatus;
  receivableAmount?: number;
};

export type ClosureRow = {
  id: string;
  customerId: string | null;
  customerName: string;
  month: string;
  totalSpent: number;
  outstandingAmount: number;
  count: number;
  unitScope: string | null;
};

export type OsEditableData = {
  unitId: string;
  clientId: string;
  customerNameSnapshot: string;
  customOsNumber: string;
  vehicleId: string;
  mileage: string;
  dueDate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  paymentMethod: string;
  notes: string;
};

export type OsEditableServiceLine = {
  id: string;
  serviceId: string;
  description: string;
  quantity: number;
  laborPrice: number;
  laborPriceInput: string;
  executedByUserId: string;
};

const STATUS_FILTER_OPTIONS = [
  { value: "Aberta", label: "Aberta" },
  { value: "Em andamento", label: "Em andamento" },
  { value: "Aguardando peça", label: "Aguardando peça" },
  { value: "Concluída", label: "Concluída" },
  { value: "Cancelada", label: "Cancelada" },
] as const;

export function useOsPage() {
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId");
  const vehicleId = searchParams.get("vehicleId");
  const { unitId, currentUnit, isLoading: unitLoading } = useCurrentUnit();
  const { units } = useUnits();
  const { customers } = useCustomers({ limit: 200 });
  const { services } = useServices();
  const { user } = useAuth();
  const { download: downloadPdf } = usePdfDownload();

  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [customerFilter, setCustomerFilter] = useState(queryClientId ?? "");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [serviceFilter, setServiceFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [closureRow, setClosureRow] = useState<ClosureRow | null>(null);
  const [closurePaymentTerm, setClosurePaymentTerm] = useState<"A_VISTA" | "A_PRAZO">("A_PRAZO");
  const [closureDueDate, setClosureDueDate] = useState("");
  const [editOrder, setEditOrder] = useState<OrderDetails | null>(null);
  const [viewOrder, setViewOrder] = useState<OrderDetails | null>(null);
  const [settleOrder, setSettleOrder] = useState<{ id: string; number: string } | null>(null);
  const [statusOrder, setStatusOrder] = useState<{ id: string; number: string; status: string } | null>(null);
  const [editableData, setEditableData] = useState<OsEditableData>({
    unitId: "",
    clientId: "",
    customerNameSnapshot: "",
    customOsNumber: "",
    vehicleId: "",
    mileage: "",
    dueDate: "",
    paymentTerm: "A_VISTA",
    paymentMethod: "",
    notes: "",
  });
  const [editableServices, setEditableServices] = useState<OsEditableServiceLine[]>([]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  useEffect(() => {
    if (unitId) setSelectedUnitId((current) => current || unitId);
  }, [unitId]);

  useEffect(() => {
    setPage(1);
  }, [customerFilter, selectedUnitId, statusFilter, vehicleId]);

  const { orders, meta, hydrated, setOrders } = useServiceOrders({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
    unitId: selectedUnitId || undefined,
    customerId: customerFilter || undefined,
    vehicleId: vehicleId || undefined,
  });
  const { vehicles } = useVehicles(editableData.clientId || undefined);

  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.id,
        label: getPersonName(customer, "-"),
      })),
    [customers],
  );
  const serviceOptions = useMemo(() => services.map((service) => ({ value: service.name, label: service.name })), [services]);
  const unitOptions = useMemo(() => units.map((unit) => ({ value: unit.id, label: unit.name })), [units]);
  const vehicleOptions = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        value: vehicle.id,
        label: `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`,
      })),
    [vehicles],
  );

  const filteredOrders = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return orders.filter((order) => {
      if (order.number.startsWith("FEC-")) return false;
      if (serviceFilter && !order.servicesLabel.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
      const min = parseCurrencyInput(minValue);
      if (min > 0 && order.total < min) return false;
      const max = parseCurrencyInput(maxValue);
      if (max > 0 && order.total > max) return false;
      if (datePreset === "today") {
        const openedAt = new Date(`${order.openedAt}T00:00:00`);
        if (openedAt.toDateString() !== today.toDateString()) return false;
      }
      if (datePreset === "yesterday") {
        const openedAt = new Date(`${order.openedAt}T00:00:00`);
        if (openedAt.toDateString() !== yesterday.toDateString()) return false;
      }
      if (datePreset === "custom") {
        if (customFrom && order.openedAt < customFrom) return false;
        if (customTo && order.openedAt > customTo) return false;
      }
      return true;
    });
  }, [customFrom, customTo, datePreset, maxValue, minValue, orders, serviceFilter]);

  const groupedOrders = useMemo(() => {
    const grouped = new Map<string, ClosureRow>();
    for (const order of filteredOrders.filter((item) => !item.number.startsWith("FEC-"))) {
      const month = order.openedAt.slice(0, 7);
      const key = `${order.clientId ?? order.clientName}-${month}`;
      const current = grouped.get(key);
      const outstanding = order.receivableStatus === "PAGO" ? 0 : order.total;
      if (current) {
        current.totalSpent += order.total;
        current.outstandingAmount += outstanding;
        current.count += 1;
      } else {
        grouped.set(key, {
          id: key,
          customerId: order.clientId,
          customerName: order.clientName,
          month,
          totalSpent: order.total,
          outstandingAmount: outstanding,
          count: 1,
          unitScope: selectedUnitId || null,
        });
      }
    }
    return Array.from(grouped.values());
  }, [filteredOrders, selectedUnitId]);

  const groupedOrdersSearchKeys = useMemo<Array<(row: ClosureRow) => string>>(
    () => [(row) => row.customerName, (row) => row.month],
    [],
  );
  const filteredOrdersSearchKeys = useMemo<Array<(row: (typeof filteredOrders)[number]) => string>>(
    () => [
      (row) => row.number,
      (row) => row.clientName,
      (row) => row.plate,
      (row) => row.servicesLabel,
      (row) => row.executedByName ?? "",
    ],
    [],
  );

  const fetchOrder = useCallback(async (id: string) => {
    const response = await fetch(`/api/service-orders/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "Nao foi possivel carregar a OS.");
    return data.order as OrderDetails;
  }, []);

  const openEditDialog = useCallback(async (id: string) => {
    const order = await fetchOrder(id);
    setEditOrder(order);
    setEditableData({
      unitId: order.unitId,
      clientId: order.clientId ?? "",
      customerNameSnapshot: order.customerNameSnapshot ?? order.clientName,
      customOsNumber: String(Number(order.number.split("-").at(-1) ?? "0") || ""),
      vehicleId: order.vehicleId ?? "",
      mileage: order.mileage ? String(order.mileage) : "",
      dueDate: order.dueDate ?? "",
      paymentTerm: order.paymentTerm ?? "A_VISTA",
      paymentMethod: (order.paymentTerm ?? "A_VISTA") === "A_PRAZO" ? "Mensal" : (order.paymentMethod ?? ""),
      notes: order.notes ?? "",
    });
    setEditableServices(
      order.services.map((service) => ({
        id: service.id,
        serviceId: service.serviceId ?? "",
        description: service.description,
        quantity: service.quantity ?? 1,
        laborPrice: service.laborPrice,
        laborPriceInput: formatCurrencyInput(String(Math.round(service.laborPrice * 100))),
        executedByUserId: service.executedByUserId ?? "",
      })),
    );
  }, [fetchOrder]);

  const handleSaveEdit = useCallback(async (): Promise<void> => {
    if (!editOrder) return;
    if (
      !editableData.customOsNumber ||
      Number(editableData.customOsNumber) < 1 ||
      Number(editableData.customOsNumber) > 99999
    ) {
      toast.error("Informe um número de OS válido.");
      return;
    }
    const response = await fetch(`/api/service-orders/${editOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "edit",
        unitId: editableData.unitId,
        customerId: editOrder.isStandalone ? null : editableData.clientId,
        customerNameSnapshot: editOrder.isStandalone ? editableData.customerNameSnapshot : "",
        customOsNumber: Number(editableData.customOsNumber),
        vehicleId: editOrder.isStandalone ? null : editableData.vehicleId || null,
        mileage: editableData.mileage ? Number(editableData.mileage) : null,
        dueDate: editableData.paymentTerm === "A_PRAZO" ? editableData.dueDate : null,
        paymentTerm: editableData.paymentTerm,
        paymentMethod: editableData.paymentMethod,
        notes: editableData.notes,
        services: editableServices.map((service) => ({
          serviceId: service.serviceId || null,
          description: service.description,
          quantity: service.quantity ?? 1,
          laborPrice: service.laborPrice,
          executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
        })),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message ?? "Nao foi possivel salvar a OS.");
      return;
    }
    setOrders((current) => {
      let executedByName: string | null = null;
      for (const s of data.order.services as Array<{
        executedByUserId?: string | null;
        executedByName?: string | null;
      }>) {
        if (s.executedByUserId && s.executedByName) {
          executedByName = s.executedByName;
          break;
        }
      }
      return current.map((item) =>
        item.id === editOrder.id
          ? {
              ...item,
              number: data.order.number,
              clientId: data.order.clientId,
              clientName: data.order.clientName,
              unitId: data.order.unitId,
              unitName: data.order.unitName,
              plate: data.order.plate,
              servicesLabel: data.order.services.map((service: { description: string }) => service.description).join(", "),
              executedByName: executedByName ?? item.executedByName ?? null,
              total: data.order.total,
              dueDate: data.order.dueDate,
              paymentTerm: data.order.paymentTerm,
              paymentStatus: data.order.paymentStatus,
            }
          : item,
      );
    });
    setEditOrder(null);
    void toast.success("OS atualizada com sucesso!");
  }, [editOrder, editableData, editableServices, setOrders]);

  const handleStatusUpdate = useCallback(
    async (id: string, newStatus: string): Promise<void> => {
      const response = await fetch(`/api/service-orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.message ?? "Nao foi possivel alterar o status da OS.";
        toast.error(message);
        throw new Error(message);
      }
      setOrders((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: data.order.status as OrderStatus, paymentStatus: data.order.paymentStatus }
            : item,
        ),
      );
      setStatusOrder(null);
      void toast.success("Status atualizado com sucesso!");
    },
    [setOrders],
  );

  const handleStatusChange = useCallback(
    async (id: string, mode: "settle" | "reopen"): Promise<void> => {
      const response = await fetch(`/api/service-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message ?? "Nao foi possivel alterar o status da OS.");
        return;
      }
      setOrders((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: data.order.status,
                receivableStatus: data.order.receivableStatus,
                paymentStatus: data.order.paymentStatus,
              }
            : item,
        ),
      );
      void toast.success(mode === "settle" ? "OS baixada com sucesso!" : "OS reaberta com sucesso!");
    },
    [setOrders],
  );

  const executeDelete = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/service-orders/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message ?? "Nao foi possivel excluir a OS.");
        return;
      }
      setOrders((current) => current.filter((item) => item.id !== id));
      void toast.success("OS excluida com sucesso!");
    },
    [setOrders],
  );

  const handleCreateClosure = useCallback(async (): Promise<void> => {
    if (!closureRow?.customerId) {
      toast.error("Selecione um cliente valido.");
      return;
    }
    const response = await fetch("/api/service-orders/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: closureRow.customerId,
        unitId: closureRow.unitScope,
        month: closureRow.month,
        paymentTerm: closurePaymentTerm,
        dueDate: closurePaymentTerm === "A_PRAZO" ? closureDueDate : null,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message ?? "Nao foi possivel gerar o fechamento.");
      return;
    }
    setOrders((current) => [data.order, ...current]);
    setClosureRow(null);
    void toast.success("OS de fechamento gerada com sucesso!");
  }, [closureDueDate, closurePaymentTerm, closureRow, setOrders]);

  const handleOsPdfDownload = useCallback(
    async (orderId: string, orderNumber: string) => {
      setDownloadingPdfId(orderId);
      try {
        const [order, companyRes] = await Promise.all([
          fetchOrder(orderId),
          fetch("/api/company/public").then((r) => r.json() as Promise<{ company?: { name?: string } }>),
        ]);
        const companyName = companyRes.company?.name ?? "";
        const { OsPdf } = await import("@/components/pdf/os-pdf");
        const { createElement } = await import("react");
        const filename = orderNumber.startsWith("OS-") ? orderNumber : `OS-${orderNumber}`;
        await downloadPdf(
          createElement(OsPdf, { order, companyName, unitName: order.unitName ?? "" }),
          filename,
        );
      } catch {
        toast.error("Não foi possível gerar o PDF.");
      } finally {
        setDownloadingPdfId(null);
      }
    },
    [fetchOrder, downloadPdf],
  );

  const groupedTableColumns = useMemo(
    () => [
      { key: "customer", header: "Cliente", render: (row: ClosureRow) => row.customerName },
      { key: "month", header: "Mes", render: (row: ClosureRow) => row.month },
      { key: "count", header: "OS", render: (row: ClosureRow) => row.count },
      { key: "total", header: "Valor total gasto", render: (row: ClosureRow) => currency(row.totalSpent) },
      { key: "outstanding", header: "Saldo em aberto", render: (row: ClosureRow) => currency(row.outstandingAmount) },
      {
        key: "actions",
        header: "Ações",
        render: (row: ClosureRow) => (
          <Button variant="outline" size="sm" onClick={() => setClosureRow(row)} disabled={!row.customerId}>
            Gerar fechamento
          </Button>
        ),
      },
    ],
    [],
  );

  const filteredTableColumns = useMemo(
    () => [
      { key: "number", header: "Numero OS", render: (row: (typeof filteredOrders)[number]) => <span className="font-medium">{row.number}</span> },
      { key: "unit", header: "Unidade", render: (row: (typeof filteredOrders)[number]) => row.unitName ?? "Geral" },
      { key: "client", header: "Cliente", render: (row: (typeof filteredOrders)[number]) => row.clientName },
      {
        key: "employee",
        header: "Funcionário",
        render: (row: (typeof filteredOrders)[number]) => row.executedByName ?? "-",
      },
      {
        key: "status",
        header: "Status",
        render: (row: (typeof filteredOrders)[number]) =>
          row.number.startsWith("FEC-") ? (
            <StatusBadge status={row.status} />
          ) : (
            <button
              type="button"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => setStatusOrder({ id: row.id, number: row.number, status: row.status })}
            >
              <StatusBadge status={row.status} />
            </button>
          ),
      },
      {
        key: "paymentStatus",
        header: "Pagamento",
        render: (row: (typeof filteredOrders)[number]) => {
          const label =
            row.paymentStatus === "PAGO"
              ? "Pago"
              : row.paymentStatus === "PAGO_PARCIAL"
                ? "Pago parcialmente"
                : "Pendente";
          return <StatusBadge status={label} />;
        },
      },
      { key: "total", header: "Valor total", render: (row: (typeof filteredOrders)[number]) => currency(row.total) },
      {
        key: "actions",
        header: "Ações",
        render: (row: (typeof filteredOrders)[number]) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={async () => setViewOrder(await fetchOrder(row.id))}>
              <Eye className="mr-1 h-4 w-4" />
              Ver
            </Button>
            <Button variant="outline" size="sm" onClick={() => void openEditDialog(row.id)}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                row.paymentStatus === "PAGO"
                  ? void handleStatusChange(row.id, "reopen")
                  : setSettleOrder({ id: row.id, number: row.number })
              }
            >
              {row.paymentStatus === "PAGO" ? "Reabrir" : "Baixar"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingPdfId === row.id}
              onClick={() => void handleOsPdfDownload(row.id, row.number)}
            >
              <FileDown className="mr-1 h-4 w-4" />
              {downloadingPdfId === row.id ? "..." : "PDF"}
            </Button>
            <ConfirmModal
              trigger={
                <Button variant="outline" size="sm">
                  <Trash2 className="mr-1 h-4 w-4" />
                  Excluir
                </Button>
              }
              title="Excluir ordem de serviço"
              description="Deseja realmente excluir esta OS?"
              onConfirm={() => {
                void executeDelete(row.id);
              }}
              confirmLabel="Excluir"
            />
          </div>
        ),
      },
    ],
    [downloadingPdfId, executeDelete, fetchOrder, handleOsPdfDownload, handleStatusChange, openEditDialog, setStatusOrder],
  );

  const clearFilters = useCallback(() => {
    setCustomerFilter("");
    setStatusFilter("");
    setSearch("");
    setPage(1);
    setServiceFilter("");
    setMinValue("");
    setMaxValue("");
    setDatePreset("all");
    setCustomFrom("");
    setCustomTo("");
    setGroupByCustomer(false);
  }, []);

  return {
    user,
    queryClientId,
    vehicleId,
    currentUnit,
    unitLoading,
    units,
    selectedUnitId,
    setSelectedUnitId,
    customerFilter,
    setCustomerFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    page,
    setPage,
    serviceFilter,
    setServiceFilter,
    minValue,
    setMinValue,
    maxValue,
    setMaxValue,
    datePreset,
    setDatePreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    groupByCustomer,
    setGroupByCustomer,
    closureRow,
    setClosureRow,
    closurePaymentTerm,
    setClosurePaymentTerm,
    closureDueDate,
    setClosureDueDate,
    editOrder,
    setEditOrder,
    viewOrder,
    setViewOrder,
    settleOrder,
    setSettleOrder,
    statusOrder,
    setStatusOrder,
    editableData,
    setEditableData,
    editableServices,
    setEditableServices,
    orders,
    meta,
    hydrated,
    customerOptions,
    serviceOptions,
    unitOptions,
    vehicleOptions,
    filteredOrders,
    groupedOrders,
    groupedOrdersSearchKeys,
    filteredOrdersSearchKeys,
    groupedTableColumns,
    filteredTableColumns,
    statusFilterOptions: STATUS_FILTER_OPTIONS,
    fetchOrder,
    openEditDialog,
    handleSaveEdit,
    handleStatusChange,
    handleStatusUpdate,
    executeDelete,
    handleCreateClosure,
    clearFilters,
  };
}
