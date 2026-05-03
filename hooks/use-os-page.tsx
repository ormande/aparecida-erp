"use client";

import { Eye, FileDown, Pencil, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import type { OsBillConfirmPayload } from "@/components/service-orders/os-bill-confirm-dialog";
import type { OsInstallmentPlanFieldsHandle } from "@/components/service-orders/os-installment-plan-fields";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { useServiceOrders, type ServiceOrderRow, type ServiceOrdersResponse } from "@/hooks/use-service-orders";
import { useServices } from "@/hooks/use-services";
import { useUnits } from "@/hooks/use-units";
import { parsePlannedInstallmentSelectionKey, plannedInstallmentSelectionKey } from "@/lib/closure-selection-keys";
import { extractOsManualSequence, serviceOrderFriendlyNumberLabel } from "@/lib/service-order-reference";
import { currency, date, formatCurrencyInput } from "@/lib/formatters";
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
  status: OrderStatus;
  paymentStatus: "PENDENTE" | "PAGO_PARCIAL" | "PAGO";
  isBilled: boolean;
  total: number;
  openedAt: string;
  dueDate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod: string;
  notes: string;
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
  billingInstallmentPlan?: Array<{ dueDate: string; amount: number }> | null;
  parcelGroupId?: string | null;
  parcelIndex?: number | null;
  parcelCount?: number | null;
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

export type ClosureSelectableOrder = {
  id: string;
  number: string;
  /** Número amigável na UI (ex.: “… — 2ª parcela”); `number` permanece o valor do banco. */
  displayLabel: string;
  openedAt: string;
  total: number;
  paymentStatus: "PENDENTE" | "PAGO_PARCIAL" | "PAGO";
  selectionOptions: Array<{
    key: string;
    dueDate: string;
    amount: number;
    label: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  disabled?: boolean;
  disabledReason?: string;
};

/** Linha da tabela de OS (uma entrada por parcela quando aplicável). */
export type ServiceOrderListDisplayRow = {
  order: ServiceOrderRow;
  rowKey: string;
  displayNumber: string;
  displayTotal: number;
  receivableLineStatus?: "PAGO" | "PENDENTE" | "VENCIDO";
};

function expandServiceOrdersForListTable(orders: ServiceOrderRow[]): ServiceOrderListDisplayRow[] {
  const out: ServiceOrderListDisplayRow[] = [];
  for (const order of orders) {
    const recv = order.receivableLines ?? [];
    const plan = order.billingInstallmentPlanRows;
    const friendly = serviceOrderFriendlyNumberLabel(order);
    const slices: ServiceOrderListDisplayRow[] = [];

    if (recv.length > 1) {
      for (let i = 0; i < recv.length; i++) {
        const line = recv[i];
        const n = line.installmentNumber ?? i + 1;
        slices.push({
          order,
          rowKey: `${order.id}-rcv-${line.id}`,
          displayNumber: `${friendly} - ${n}ª parcela`,
          displayTotal: line.amount,
          receivableLineStatus: line.status,
        });
      }
    } else if (recv.length === 1) {
      slices.push({
        order,
        rowKey: `${order.id}-rcv-${recv[0].id}`,
        displayNumber: friendly,
        displayTotal: recv[0].amount,
        receivableLineStatus: recv[0].status,
      });
    }

    if (slices.length === 0 && !order.isBilled && plan && plan.length >= 2) {
      for (let idx = 0; idx < plan.length; idx++) {
        const part = plan[idx];
        const ord = part.displayParcelNumber ?? idx + 1;
        slices.push({
          order,
          rowKey: `${order.id}-plan-${idx}-${ord}`,
          displayNumber: `${friendly} - ${ord}ª parcela`,
          displayTotal: part.amount,
        });
      }
    }

    if (slices.length > 0) {
      out.push(...slices);
    } else {
      out.push({
        order,
        rowKey: order.id,
        displayNumber: friendly,
        displayTotal: order.total,
      });
    }
  }
  return out;
}

export type OsEditableData = {
  unitId: string;
  clientId: string;
  customerNameSnapshot: string;
  customOsNumber: string;
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

export type OsEditableProductLine = {
  id: string;
  productId: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  unitPriceInput: string;
};

type UseOsPageOptions = {
  fixedBillingFilter?: "ABERTAS" | "FATURADAS" | "PAGAS";
};

const STATUS_FILTER_OPTIONS = [
  { value: "Aberta", label: "Aberta" },
  { value: "Em andamento", label: "Em andamento" },
  { value: "Aguardando peça", label: "Aguardando peça" },
  { value: "Concluída", label: "Concluída" },
  { value: "Cancelada", label: "Cancelada" },
] as const;

const BILLING_FILTER_OPTIONS = [
  { value: "ABERTAS", label: "OS abertas" },
  { value: "FATURADAS", label: "OS faturadas" },
  { value: "PAGAS", label: "OS pagas" },
] as const;

async function fetchAllServiceOrderPages(query: Record<string, string | undefined>): Promise<ServiceOrderRow[]> {
  const acc: ServiceOrderRow[] = [];
  let pageNum = 1;
  const limit = 100;
  while (true) {
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("limit", String(limit));
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    const response = await fetch(`/api/service-orders?${params.toString()}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    const data = (await response.json()) as ServiceOrdersResponse & { message?: string };
    if (!response.ok) {
      throw new Error(data.message ?? "Falha ao carregar ordens de serviço.");
    }
    const chunk = data.data ?? [];
    acc.push(...chunk);
    // Não depender só de totalPages do servidor: seguir enquanto vier página cheia.
    if (chunk.length < limit) break;
    pageNum += 1;
  }
  return acc;
}

function applyOrderClientFilters(
  order: ServiceOrderRow,
  opts: {
    serviceFilter: string;
    billingFilter: string;
    datePreset: "all" | "today" | "yesterday" | "custom";
    customFrom: string;
    customTo: string;
  },
): boolean {
  if (order.number.startsWith("FEC-")) return false;
  const { serviceFilter, billingFilter, datePreset, customFrom, customTo } = opts;
  if (serviceFilter && !order.servicesLabel.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
  if (billingFilter === "ABERTAS") {
    if (order.isBilled) return false;
    if (order.paymentStatus === "PAGO") return false;
  }
  if (billingFilter === "FATURADAS") {
    if (order.paymentStatus === "PAGO") return false;
    const hasPendingReceivable = (order.receivableLines ?? []).some(
      (l) => l.status === "PENDENTE" || l.status === "VENCIDO",
    );
    if (!order.isBilled && !hasPendingReceivable) return false;
    return true;
  }
  if (billingFilter === "PAGAS" && order.paymentStatus !== "PAGO") return false;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
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
}

export function useOsPage(options: UseOsPageOptions = {}) {
  const { fixedBillingFilter } = options;
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId");
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
  const [billingFilter, setBillingFilter] = useState(fixedBillingFilter ?? "");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [closureRow, setClosureRow] = useState<ClosureRow | null>(null);
  const [selectedClosureOrderIds, setSelectedClosureOrderIds] = useState<string[]>([]);
  const [closureDialogOrders, setClosureDialogOrders] = useState<ClosureSelectableOrder[]>([]);
  const [closureDialogLoading, setClosureDialogLoading] = useState(false);
  const [fullOrdersForGroup, setFullOrdersForGroup] = useState<ServiceOrderRow[] | null>(null);
  const [groupOrdersLoading, setGroupOrdersLoading] = useState(false);
  const [closurePaymentTerm, setClosurePaymentTerm] = useState<"A_VISTA" | "A_PRAZO">("A_PRAZO");
  const [closureDueDate, setClosureDueDate] = useState("");
  const [editInstallmentResetKey, setEditInstallmentResetKey] = useState(0);
  const editInstallmentPlanRef = useRef<OsInstallmentPlanFieldsHandle>(null);
  const [editOrder, setEditOrder] = useState<OrderDetails | null>(null);
  const [viewOrder, setViewOrder] = useState<OrderDetails | null>(null);
  const [settleOrder, setSettleOrder] = useState<{ id: string; number: string } | null>(null);
  const [billOrder, setBillOrder] = useState<{
    id: string;
    number: string;
    openedAt: string;
    dueDate: string;
    paymentMethod: string;
    paymentTerm: "A_VISTA" | "A_PRAZO";
    totalInput: string;
    hasInstallmentPlan: boolean;
  } | null>(null);
  const [statusOrder, setStatusOrder] = useState<{ id: string; number: string; status: string } | null>(null);
  const [editableData, setEditableData] = useState<OsEditableData>({
    unitId: "",
    clientId: "",
    customerNameSnapshot: "",
    customOsNumber: "",
    dueDate: "",
    paymentTerm: "A_VISTA",
    paymentMethod: "",
    notes: "",
  });
  const [editableServices, setEditableServices] = useState<OsEditableServiceLine[]>([]);
  const [editableProducts, setEditableProducts] = useState<OsEditableProductLine[]>([]);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [statusLoadingByOrderId, setStatusLoadingByOrderId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (unitId) setSelectedUnitId((current) => current || unitId);
  }, [unitId]);

  useEffect(() => {
    if (fixedBillingFilter) {
      setBillingFilter(fixedBillingFilter);
    }
  }, [fixedBillingFilter]);

  useEffect(() => {
    if (fixedBillingFilter !== "ABERTAS") {
      setGroupByCustomer(false);
    }
  }, [fixedBillingFilter]);

  useEffect(() => {
    setPage(1);
  }, [customerFilter, selectedUnitId, statusFilter]);

  const { orders, meta, hydrated, setOrders, refresh: refreshOrders } = useServiceOrders({
    page,
    limit: 10,
    search,
    status: statusFilter || undefined,
    unitId: selectedUnitId || undefined,
    customerId: customerFilter || undefined,
    excludeFechamentos: fixedBillingFilter ? true : undefined,
    billingScope: fixedBillingFilter,
  });

  useEffect(() => {
    if (!groupByCustomer) {
      setFullOrdersForGroup(null);
      setGroupOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setFullOrdersForGroup(null);
    setGroupOrdersLoading(true);
    void (async () => {
      try {
        // Sempre busca todas as páginas da API (não usa `page` da visão individual).
        const query: Record<string, string | undefined> = {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          unitId: selectedUnitId || undefined,
          customerId: customerFilter || undefined,
          excludeFechamentos: "true",
          billingScope: fixedBillingFilter,
        };
        const all = await fetchAllServiceOrderPages(query);
        if (!cancelled) setFullOrdersForGroup(all);
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar as OS para agrupamento.");
          setFullOrdersForGroup([]);
        }
      } finally {
        if (!cancelled) setGroupOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setGroupOrdersLoading(false);
    };
  }, [groupByCustomer, search, statusFilter, selectedUnitId, customerFilter, fixedBillingFilter]);

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

  const filteredOrders = useMemo(() => {
    const filterOpts = {
      serviceFilter,
      billingFilter: fixedBillingFilter ?? billingFilter,
      datePreset,
      customFrom,
      customTo,
    };
    if (groupByCustomer) {
      if (fullOrdersForGroup === null) {
        return [];
      }
      return fullOrdersForGroup.filter((order) => applyOrderClientFilters(order, filterOpts));
    }
    return orders.filter((order) => applyOrderClientFilters(order, filterOpts));
  }, [
    billingFilter,
    fixedBillingFilter,
    customFrom,
    customTo,
    datePreset,
    fullOrdersForGroup,
    groupByCustomer,
    orders,
    serviceFilter,
  ]);

  const listDisplayRows = useMemo(() => {
    const scope = fixedBillingFilter ?? billingFilter;
    let rows = expandServiceOrdersForListTable(filteredOrders);
    if (!groupByCustomer && scope === "FATURADAS") {
      rows = rows.filter((r) => r.receivableLineStatus != null);
    }
    if (!groupByCustomer && scope === "ABERTAS") {
      rows = rows.filter((r) => !r.order.isBilled && r.order.paymentStatus !== "PAGO");
    }
    return rows;
  }, [filteredOrders, billingFilter, fixedBillingFilter, groupByCustomer]);

  const groupedOrders = useMemo(() => {
    const grouped = new Map<string, ClosureRow>();
    for (const order of filteredOrders) {
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

  const toggleClosureOrderSelection = useCallback((key: string) => {
    const row = closureDialogOrders.find((item) => item.selectionOptions.some((opt) => opt.key === key));
    const option = row?.selectionOptions.find((opt) => opt.key === key);
    if (!option || option.disabled) return;
    setSelectedClosureOrderIds((current) =>
      current.includes(key) ? current.filter((id) => id !== key) : [...current, key],
    );
  }, [closureDialogOrders]);

  const openClosureDialog = useCallback(
    async (row: ClosureRow) => {
      if (!row.customerId) {
        toast.error("Selecione um cliente válido.");
        return;
      }
      setClosureRow(row);
      setClosureDialogOrders([]);
      setSelectedClosureOrderIds([]);
      setClosureDialogLoading(true);
      try {
        const query: Record<string, string | undefined> = {
          customerId: row.customerId,
          openedMonth: row.month,
          excludeFechamentos: "true",
        };
        if (row.unitScope) {
          query.unitId = row.unitScope;
        }
        const all = await fetchAllServiceOrderPages(query);
        const filterOpts = {
          serviceFilter,
          billingFilter: "",
          datePreset,
          customFrom,
          customTo,
        };
        const filtered = all.filter((order) => applyOrderClientFilters(order, filterOpts));
        /** OS já faturadas só entram se houver parcela de recebível em aberto (senão o faturamento da FEC conflita). */
        const eligibleForClosure = filtered.filter((order) => {
          if (!order.isBilled) return true;
          return (order.receivableLines ?? []).some(
            (line) =>
              (line.status === "PENDENTE" || line.status === "VENCIDO") && !line.isLockedByAnyClosure,
          );
        });
        const mapped = eligibleForClosure.map((order) => {
          const receivableOptions = (order.receivableLines ?? [])
            .filter((line) => line.status !== "PAGO")
            .map((line) => ({
              key: `receivable:${line.id}`,
              dueDate: line.dueDate,
              amount: line.amount,
              label:
                line.installmentNumber && line.installmentCount
                  ? `Parcela ${line.installmentNumber}/${line.installmentCount} — ${currency(line.amount)}`
                  : `Parcela — ${currency(line.amount)}`,
              disabled: Boolean(line.isLockedByAnyClosure),
              disabledReason: line.isLockedByAnyClosure
                ? "Esta parcela já foi vinculada a outro fechamento."
                : undefined,
            }));
          const planRows = order.billingInstallmentPlanRows;
          const plannedOptions =
            !order.isBilled && planRows && planRows.length >= 2
              ? planRows.map((row, idx) => ({
                  key: plannedInstallmentSelectionKey(order.id, idx),
                  dueDate: row.dueDate,
                  amount: row.amount,
                  label: `Parcela ${idx + 1}/${planRows.length} — ${currency(row.amount)}`,
                  disabled: Boolean(order.isLockedByAnyClosure),
                  disabledReason: order.isLockedByAnyClosure
                    ? "Esta OS já foi vinculada a outro fechamento."
                    : undefined,
                }))
              : [];
          const fallbackOption = {
            key: `order:${order.id}`,
            dueDate: order.dueDate ?? order.openedAt,
            amount: order.total,
            label: "OS integral",
            disabled: Boolean(order.isLockedByAnyClosure) || Boolean(order.isBilled),
            disabledReason: order.isLockedByAnyClosure
              ? "Esta OS já foi vinculada a outro fechamento."
              : order.isBilled
                ? "OS faturada sem parcelas elegíveis para fechamento."
                : undefined,
          };
          const selectionOptions =
            receivableOptions.length > 0 ? receivableOptions : plannedOptions.length > 0 ? plannedOptions : [fallbackOption];
          return {
            id: order.id,
            number: order.number,
            displayLabel: serviceOrderFriendlyNumberLabel(order),
            openedAt: order.openedAt,
            total: order.total,
            paymentStatus: order.paymentStatus,
            selectionOptions,
            disabled: selectionOptions.every((item) => item.disabled),
            disabledReason: selectionOptions.every((item) => item.disabled)
              ? "Não há itens elegíveis para esta OS."
              : undefined,
          };
        });
        setClosureDialogOrders(mapped);
        setSelectedClosureOrderIds(
          mapped.flatMap((order) => order.selectionOptions.filter((item) => !item.disabled).map((item) => item.key)),
        );
      } catch {
        toast.error("Não foi possível carregar as OS para fechamento.");
        setClosureDialogOrders([]);
      } finally {
        setClosureDialogLoading(false);
      }
    },
    [billingFilter, customFrom, customTo, datePreset, serviceFilter],
  );

  const groupedOrdersSearchKeys = useMemo<Array<(row: ClosureRow) => string>>(
    () => [(row) => row.customerName, (row) => row.month],
    [],
  );
  const filteredOrdersSearchKeys = useMemo<Array<(row: ServiceOrderListDisplayRow) => string>>(
    () => [
      (row) => row.displayNumber,
      (row) => row.order.number,
      (row) => serviceOrderFriendlyNumberLabel(row.order),
      (row) => row.order.clientName,
      (row) => row.order.servicesLabel,
      (row) => row.order.executedByName ?? "",
    ],
    [],
  );

  const fetchOrder = useCallback(async (id: string) => {
    const response = await fetch(`/api/service-orders/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? "Não foi possível carregar a OS.");
    }
    return data.order as OrderDetails;
  }, []);

  const openEditDialog = useCallback(async (id: string) => {
    let order: OrderDetails;
    try {
      order = await fetchOrder(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível carregar a OS.");
      return;
    }
    setEditOrder(order);
    setEditInstallmentResetKey((k) => k + 1);
    setEditableData({
      unitId: order.unitId,
      clientId: order.clientId ?? "",
      customerNameSnapshot: order.customerNameSnapshot ?? order.clientName,
      customOsNumber: (extractOsManualSequence(order.number) ?? "").padStart(5, "0"),
      dueDate: order.dueDate ?? "",
      paymentTerm: order.paymentTerm ?? "A_VISTA",
      paymentMethod: order.paymentMethod ?? "",
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
    setEditableProducts(
      (order.products ?? []).map((product) => ({
        id: product.id,
        productId: product.productId ?? "",
        description: product.description,
        unit: product.unit,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        unitPriceInput: formatCurrencyInput(String(Math.round(product.unitPrice * 100))),
      })),
    );
  }, [fetchOrder]);

  const handleSaveEdit = useCallback(async (): Promise<void> => {
    if (!editOrder) return;

    if (!editableData.unitId) {
      toast.error("Selecione a unidade.");
      return;
    }

    const customNumber = Number(editableData.customOsNumber);
    if (!editableData.customOsNumber || customNumber < 1 || customNumber > 99999) {
      toast.error("Número da OS inválido. Use um valor entre 1 e 99999.");
      return;
    }

    if (!editOrder.isStandalone && !editableData.clientId) {
      toast.error("Selecione o cliente para continuar.");
      return;
    }

    if (!editableServices.length && !editableProducts.length) {
      toast.error("Adicione ao menos um serviço ou produto.");
      return;
    }

    const hasInvalidService = editableServices.some(
      (service) =>
        service.description.trim().length === 0 ||
        Number(service.quantity) < 1 ||
        Number.isNaN(Number(service.laborPrice)) ||
        Number(service.laborPrice) < 0,
    );
    if (hasInvalidService) {
      toast.error("Preencha corretamente os serviços (descrição, quantidade e valor).");
      return;
    }

    const hasInvalidProduct = editableProducts.some(
      (product) =>
        product.description.trim().length === 0 ||
        product.unit.trim().length === 0 ||
        Number(product.quantity) <= 0 ||
        Number.isNaN(Number(product.unitPrice)) ||
        Number(product.unitPrice) < 0,
    );
    if (hasInvalidProduct) {
      toast.error("Preencha corretamente os produtos (descrição, unidade, quantidade e valor).");
      return;
    }

    if (!editOrder.isBilled) {
      if (!editInstallmentPlanRef.current?.validate()) {
        return;
      }
    }

    const response = await fetch(`/api/service-orders/${editOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "edit",
        unitId: editableData.unitId,
        customerId: editOrder.isStandalone ? null : editableData.clientId,
        customerNameSnapshot: editOrder.isStandalone ? editableData.customerNameSnapshot : "",
        customOsNumber: customNumber,
        dueDate: editableData.paymentTerm === "A_PRAZO" ? editableData.dueDate : null,
        paymentTerm: editableData.paymentTerm,
        paymentMethod: editableData.paymentMethod,
        notes: editableData.notes,
        ...(!editOrder.isBilled
          ? { installments: editInstallmentPlanRef.current?.getForEditSave() ?? [] }
          : {}),
        services: editableServices.map((service) => ({
          serviceId: service.serviceId || null,
          description: service.description,
          quantity: service.quantity ?? 1,
          laborPrice: service.laborPrice,
          executedByUserId:
            service.executedByUserId?.trim() && service.executedByUserId !== "__casa__"
              ? service.executedByUserId
              : null,
          commissionRate: service.executedByUserId === "__casa__" ? 0 : undefined,
        })),
        products: editableProducts
          .filter((product) => product.description.trim().length > 0 && Number(product.quantity) > 0)
          .map((product) => ({
            productId: product.productId || null,
            description: product.description,
            unit: product.unit,
            quantity: product.quantity,
            unitPrice: product.unitPrice,
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
  }, [editOrder, editableData, editableProducts, editableServices, setOrders]);

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
    async (
      id: string,
      mode: "settle" | "reopen" | "bill" | "unbill",
      options?: { paymentMethod?: string } | OsBillConfirmPayload,
    ): Promise<void> => {
      if (statusLoadingByOrderId[id]) {
        return;
      }
      setStatusLoadingByOrderId((current) => ({ ...current, [id]: true }));
      try {
        const url =
          mode === "bill"
            ? `/api/service-orders/${id}/bill`
            : mode === "unbill"
              ? `/api/service-orders/${id}/bill`
              : mode === "reopen"
                ? `/api/service-orders/${id}/reopen`
                : `/api/service-orders/${id}/settle`;
        const method = mode === "unbill" ? "DELETE" : "POST";
        const body =
          mode === "settle"
            ? JSON.stringify({
                discountAmount: 0,
                partialAmount: 0,
                ...(options && "paymentMethod" in options && options.paymentMethod
                  ? { paymentMethod: options.paymentMethod }
                  : {}),
              })
            : mode === "bill" && options && "dueDate" in options
              ? JSON.stringify({
                  dueDate: options.dueDate,
                  paymentMethod: options.paymentMethod,
                  paymentTerm: options.paymentTerm,
                })
              : undefined;
        const response = await fetch(url, {
          method,
          ...(body
            ? {
                headers: { "Content-Type": "application/json" },
                body,
              }
            : {}),
        });
        const data = await response.json();
        if (!response.ok) {
          const errText =
            typeof data?.message === "string"
              ? data.message
              : typeof data?.error === "string"
                ? data.error
                : typeof data?.details === "string"
                  ? data.details
                  : null;
          toast.error(errText ?? "Nao foi possivel alterar o status da OS.");
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
                  isBilled: data.order.isBilled,
                  ...(mode === "bill"
                    ? {
                        dueDate: data.order.dueDate ?? item.dueDate,
                        paymentMethod: data.order.paymentMethod ?? item.paymentMethod,
                        paymentTerm: data.order.paymentTerm ?? item.paymentTerm,
                      }
                    : {}),
                }
              : item,
          ),
        );
        void refreshOrders();
        const successMessage =
          mode === "settle"
            ? "OS baixada com sucesso!"
            : mode === "bill"
              ? "OS faturada com sucesso!"
              : mode === "unbill"
                ? "Faturamento da OS cancelado com sucesso!"
                : "OS reaberta com sucesso!";
        void toast.success(successMessage);
        if (mode === "bill") {
          setBillOrder(null);
        }
      } catch {
        toast.error("Nao foi possivel alterar o status da OS.");
      } finally {
        setStatusLoadingByOrderId((current) => ({ ...current, [id]: false }));
      }
    },
    [refreshOrders, setOrders, statusLoadingByOrderId],
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
    if (selectedClosureOrderIds.length <= 1) {
      toast.error("Selecione ao menos duas OS/parcela para gerar o fechamento.");
      return;
    }
    const sourceSelections = selectedClosureOrderIds
      .map((key) => {
        if (key.startsWith("receivable:")) {
          const receivableId = key.replace("receivable:", "");
          const owner = closureDialogOrders.find((order) => order.selectionOptions.some((item) => item.key === key));
          return { orderId: owner?.id ?? "", receivableId, plannedInstallmentIndex: null as number | null };
        }
        const planned = parsePlannedInstallmentSelectionKey(key);
        if (planned) {
          return {
            orderId: planned.orderId,
            receivableId: null,
            plannedInstallmentIndex: planned.index,
          };
        }
        return { orderId: key.replace("order:", ""), receivableId: null, plannedInstallmentIndex: null as number | null };
      })
      .filter((item) => item.orderId);
    const response = await fetch("/api/service-orders/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: closureRow.customerId,
        unitId: closureRow.unitScope,
        month: closureRow.month,
        sourceOrderIds: [],
        sourceSelections,
        paymentTerm: closurePaymentTerm,
        dueDate: closurePaymentTerm === "A_PRAZO" ? closureDueDate : null,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message ?? "Nao foi possivel gerar o fechamento.");
      return;
    }
    void refreshOrders();
    setClosureRow(null);
    setSelectedClosureOrderIds([]);
    void toast.success("OS de fechamento gerada com sucesso!");
  }, [
    closureDialogOrders,
    closureDueDate,
    closurePaymentTerm,
    closureRow,
    refreshOrders,
    selectedClosureOrderIds,
  ]);

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

  const closureEligibilityByRow = useMemo(() => {
    const byRow = new Map<string, number>();
    for (const order of filteredOrders) {
      const month = order.openedAt.slice(0, 7);
      const key = `${order.clientId ?? order.clientName}-${month}`;
      const receivableEligible = (order.receivableLines ?? []).filter(
        (line) => line.status !== "PAGO" && !line.isLockedByAnyClosure,
      ).length;
      const plan = order.billingInstallmentPlanRows;
      const plannedEligible =
        !order.isBilled && !order.isLockedByAnyClosure && plan && plan.length >= 2 ? plan.length : 0;
      const orderEligible =
        !order.isBilled && !order.isLockedByAnyClosure && (!plan || plan.length < 2) ? 1 : 0;
      const eligibleCount =
        receivableEligible > 0 ? receivableEligible : plannedEligible > 0 ? plannedEligible : orderEligible;
      if (eligibleCount <= 0) continue;
      byRow.set(key, (byRow.get(key) ?? 0) + eligibleCount);
    }
    return byRow;
  }, [filteredOrders]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openClosureDialog(row)}
            disabled={!row.customerId || (closureEligibilityByRow.get(row.id) ?? 0) <= 1}
            title={
              !row.customerId
                ? "Selecione um cliente válido."
                : (closureEligibilityByRow.get(row.id) ?? 0) <= 1
                  ? "Não há OS elegíveis suficientes: as OS deste período já foram vinculadas a fechamento."
                  : undefined
            }
          >
            Gerar fechamento
          </Button>
        ),
      },
    ],
    [closureEligibilityByRow, openClosureDialog],
  );

  const filteredTableColumns = useMemo(
    () => [
      {
        key: "number",
        header: "Numero OS",
        render: (row: ServiceOrderListDisplayRow) => <span className="font-medium">{row.displayNumber}</span>,
      },
      { key: "unit", header: "Unidade", render: (row: ServiceOrderListDisplayRow) => row.order.unitName ?? "Geral" },
      { key: "client", header: "Cliente", render: (row: ServiceOrderListDisplayRow) => row.order.clientName },
      {
        key: "employee",
        header: "Funcionário",
        render: (row: ServiceOrderListDisplayRow) => row.order.executedByName ?? "-",
      },
      {
        key: "status",
        header: "Status",
        render: (row: ServiceOrderListDisplayRow) =>
          row.order.number.startsWith("FEC-") ? (
            <StatusBadge status={row.order.status} />
          ) : (
            <button
              type="button"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() =>
                setStatusOrder({ id: row.order.id, number: row.displayNumber, status: row.order.status })
              }
            >
              <StatusBadge status={row.order.status} />
            </button>
          ),
      },
      {
        key: "paymentStatus",
        header: "Pagamento",
        render: (row: ServiceOrderListDisplayRow) => {
          const label = row.receivableLineStatus
            ? row.receivableLineStatus === "PAGO"
              ? "Pago"
              : row.receivableLineStatus === "VENCIDO"
                ? "Vencido"
                : "Pendente"
            : row.order.paymentStatus === "PAGO"
              ? "Pago"
              : row.order.paymentStatus === "PAGO_PARCIAL"
                ? "Pago parcialmente"
                : "Pendente";
          return <StatusBadge status={label} />;
        },
      },
      {
        key: "total",
        header: "Valor total",
        render: (row: ServiceOrderListDisplayRow) => currency(row.displayTotal),
      },
      {
        key: "actions",
        header: "Ações",
        render: (row: ServiceOrderListDisplayRow) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setViewOrder(await fetchOrder(row.order.id));
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Não foi possível carregar a OS.");
                }
              }}
            >
              <Eye className="mr-1 h-4 w-4" />
              Ver
            </Button>
            <Button variant="outline" size="sm" onClick={() => void openEditDialog(row.order.id)}>
              <Pencil className="mr-1 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                Boolean(statusLoadingByOrderId[row.order.id]) ||
                (!row.order.isBilled && Boolean(row.order.isLockedByOpenClosure)) ||
                (row.order.isBilled &&
                  row.order.paymentStatus !== "PAGO" &&
                  Boolean(row.order.isLockedByOpenClosure))
              }
              onClick={() =>
                row.order.paymentStatus === "PAGO"
                  ? void handleStatusChange(row.order.id, "reopen")
                  : row.order.isBilled
                    ? setSettleOrder({ id: row.order.id, number: row.displayNumber })
                    : setBillOrder({
                        id: row.order.id,
                        number: row.displayNumber,
                        openedAt: row.order.openedAt,
                        dueDate: row.order.dueDate ?? "",
                        paymentMethod: row.order.paymentMethod ?? "",
                        paymentTerm: row.order.paymentTerm === "A_PRAZO" ? "A_PRAZO" : "A_VISTA",
                        totalInput: formatCurrencyInput(String(Math.round(row.order.total * 100))),
                        hasInstallmentPlan: row.order.hasInstallmentPlan ?? false,
                      })
              }
              title={
                !row.order.isBilled && row.order.isLockedByOpenClosure
                  ? "Fature a OS de fechamento vinculada antes de faturar esta OS."
                  : row.order.isBilled && row.order.paymentStatus !== "PAGO" && row.order.isLockedByOpenClosure
                    ? "Baixe o fechamento vinculado antes de baixar esta OS."
                    : undefined
              }
            >
              {row.order.paymentStatus === "PAGO" ? "Reabrir" : row.order.isBilled ? "Baixar" : "Faturar"}
            </Button>
            {row.order.isBilled && row.order.paymentStatus !== "PAGO" ? (
              <Button
                variant="outline"
                size="sm"
                disabled={
                  Boolean(statusLoadingByOrderId[row.order.id]) || Boolean(row.order.isLockedByOpenClosure)
                }
                onClick={() => void handleStatusChange(row.order.id, "unbill")}
                title={
                  row.order.isLockedByOpenClosure
                    ? "Exclua ou baixe o fechamento vinculado antes de cancelar o faturamento."
                    : undefined
                }
              >
                Cancelar faturamento
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingPdfId === row.order.id}
              onClick={() => void handleOsPdfDownload(row.order.id, row.order.number)}
            >
              <FileDown className="mr-1 h-4 w-4" />
              {downloadingPdfId === row.order.id ? "..." : "PDF"}
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
                void executeDelete(row.order.id);
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
    setBillingFilter(fixedBillingFilter ?? "");
    setDatePreset("all");
    setCustomFrom("");
    setCustomTo("");
    setGroupByCustomer(false);
  }, [fixedBillingFilter]);

  return {
    user,
    queryClientId,
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
    billingFilter,
    setBillingFilter,
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
    closureDialogOrders,
    closureDialogLoading,
    groupOrdersLoading,
    selectedClosureOrderIds,
    setSelectedClosureOrderIds,
    toggleClosureOrderSelection,
    closurePaymentTerm,
    setClosurePaymentTerm,
    closureDueDate,
    setClosureDueDate,
    editInstallmentPlanRef,
    editInstallmentResetKey,
    editOrder,
    setEditOrder,
    viewOrder,
    setViewOrder,
    settleOrder,
    setSettleOrder,
    statusOrder,
    setStatusOrder,
    billOrder,
    setBillOrder,
    statusLoadingByOrderId,
    editableData,
    setEditableData,
    editableServices,
    setEditableServices,
    editableProducts,
    setEditableProducts,
    orders,
    meta,
    hydrated,
    customerOptions,
    serviceOptions,
    unitOptions,
    filteredOrders,
    listDisplayRows,
    groupedOrders,
    groupedOrdersSearchKeys,
    filteredOrdersSearchKeys,
    groupedTableColumns,
    filteredTableColumns,
    statusFilterOptions: STATUS_FILTER_OPTIONS,
    billingFilterOptions: BILLING_FILTER_OPTIONS,
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
