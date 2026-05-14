"use client";

import { FileDown } from "lucide-react";
import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OsBillConfirmDialog, type OsBillConfirmPayload } from "@/components/service-orders/os-bill-confirm-dialog";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import {
  expandServiceOrdersForListTable,
  type OrderDetails,
  type ServiceOrderListDisplayRow,
} from "@/hooks/use-os-page";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { useUnits } from "@/hooks/use-units";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { getPersonName } from "@/lib/person-helpers";
import {
  aggregateFecLineContributionsByOrderNumber,
  cleanFecItemDescriptionForDisplay,
} from "@/lib/service-order-reference";

function formatPreviewOrderNumber(value: string) {
  const match = /^(OS-\d{4}-\d{5})-P(\d+)$/i.exec(value.trim());
  if (!match) {
    return value;
  }

  return `${match[1]} - ${Number(match[2])}ª parcela`;
}

function formatClosurePreviewOrderLabels(numbers: string[]) {
  const normalized = numbers.map((value) => value.trim());
  const parcelBases = new Set(
    normalized
      .map((value) => /^(OS-\d{4}-\d{5})-P(\d+)$/i.exec(value)?.[1] ?? null)
      .filter((value): value is string => Boolean(value)),
  );

  const labels = new Map<string, string>();
  for (const number of normalized) {
    const parcelMatch = /^(OS-\d{4}-\d{5})-P(\d+)$/i.exec(number);
    if (parcelMatch) {
      labels.set(number, `${parcelMatch[1]} - ${Number(parcelMatch[2])}ª parcela`);
      continue;
    }

    if (parcelBases.has(number)) {
      labels.set(number, `${number} - 1ª parcela`);
      continue;
    }

    labels.set(number, number);
  }

  return labels;
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "Pix", label: "PIX" },
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
  { value: "Boleto", label: "Boleto" },
] as const;

export default function FechamentosPage() {
  const { unitId } = useCurrentUnit();
  const { units } = useUnits();
  const { customers } = useCustomers({ limit: 200 });
  const { user } = useAuth();
  const { download: downloadPdf } = usePdfDownload();
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [orderPreview, setOrderPreview] = useState<OrderDetails | null>(null);
  /** Alvo da baixa: pode ser o FEC inteiro (receivableId=null) ou uma parcela (receivableId setado).
   *  Quando há receivableId, a baixa vai pela rota /api/receivables/[id] (uma parcela por vez).
   *  Caso contrário, baixa o FEC inteiro via /api/service-orders/[id]/settle (suporta desconto). */
  const [settleTarget, setSettleTarget] = useState<{
    order: OrderDetails;
    receivableId?: string | null;
    /** Saldo em aberto da parcela (ou do FEC inteiro). */
    outstandingAmount: number;
    /** Total original da parcela quando há partial anterior. */
    originalAmount?: number;
    /** Quanto já foi pago naquela parcela. */
    paidAmount?: number;
    isPartiallyPaid?: boolean;
    /** Rótulo da linha (ex.: "FEC-2026-00001 - 2ª parcela"). */
    label?: string;
  } | null>(null);
  const [billFecOrder, setBillFecOrder] = useState<
    | (OsBillConfirmPayload & { id: string; number: string; openedAt: string; totalInput: string })
    | null
  >(null);
  const [fecBillLoading, setFecBillLoading] = useState(false);

  const fecBillConfirmInitial = useMemo(
    () =>
      billFecOrder
        ? {
            openedAt: billFecOrder.openedAt,
            dueDate: billFecOrder.dueDate,
            paymentMethod: billFecOrder.paymentMethod,
            paymentTerm: billFecOrder.paymentTerm,
            totalInput: billFecOrder.totalInput,
          }
        : null,
    [billFecOrder],
  );

  const [discountInput, setDiscountInput] = useState("");
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [settlePaymentMethod, setSettlePaymentMethod] = useState("Pix");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [tableSearch, setTableSearch] = useState("");

  useEffect(() => {
    if (unitId) setSelectedUnitId((current) => current || unitId);
  }, [unitId]);

  const openedBounds = useMemo(() => {
    const isoLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    const today = new Date();
    if (datePreset === "today") {
      const d = isoLocal(today);
      return { openedFrom: d, openedTo: d };
    }
    if (datePreset === "yesterday") {
      const yday = new Date(today);
      yday.setDate(yday.getDate() - 1);
      const d = isoLocal(yday);
      return { openedFrom: d, openedTo: d };
    }
    if (datePreset === "custom") {
      return { openedFrom: customFrom || undefined, openedTo: customTo || undefined };
    }
    return { openedFrom: undefined as string | undefined, openedTo: undefined as string | undefined };
  }, [customFrom, customTo, datePreset]);

  const minTotalNum = minValue.trim() ? parseCurrencyInput(minValue) : undefined;
  const maxTotalNum = maxValue.trim() ? parseCurrencyInput(maxValue) : undefined;

  useEffect(() => {
    setPage(1);
  }, [
    customerFilter,
    statusFilter,
    paymentFilter,
    minValue,
    maxValue,
    datePreset,
    customFrom,
    customTo,
    selectedUnitId,
  ]);

  const { orders, meta, hydrated, setOrders } = useServiceOrders({
    page,
    limit: 10,
    unitId: selectedUnitId || undefined,
    customerId: customerFilter || undefined,
    numberPrefix: "FEC-",
    search: tableSearch.trim() || undefined,
    status: statusFilter || undefined,
    paymentStatus: paymentFilter || undefined,
    minTotal: minTotalNum !== undefined && !Number.isNaN(minTotalNum) ? minTotalNum : undefined,
    maxTotal: maxTotalNum !== undefined && !Number.isNaN(maxTotalNum) ? maxTotalNum : undefined,
    openedFrom: openedBounds.openedFrom,
    openedTo: openedBounds.openedTo,
  });

  /** Linhas exibidas: expande cada FEC em N linhas quando tem múltiplas parcelas. */
  const displayRows = useMemo(() => expandServiceOrdersForListTable(orders), [orders]);

  const searchKeys = useMemo<Array<(row: ServiceOrderListDisplayRow) => string>>(
    () => [(row) => row.order.number, (row) => row.order.clientName, (row) => row.displayNumber],
    [],
  );

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: getPersonName(customer, "-"),
  }));

  const previewOrderLines = useMemo(() => {
    if (!orderPreview) {
      return [];
    }

    const entries = Array.from(
      aggregateFecLineContributionsByOrderNumber(
        orderPreview.services.map((service) => ({
          description: service.description,
          lineTotal: service.lineTotal ?? (service.quantity ?? 1) * service.laborPrice,
          referencedOrderNumber: service.referencedOrderNumber,
        })),
      ).entries(),
    );
    const labels = formatClosurePreviewOrderLabels(entries.map(([number]) => number));

    return entries.map(([number, amount]) => ({
      number,
      label: labels.get(number) ?? formatPreviewOrderNumber(number),
      amount,
    }));
  }, [orderPreview]);

  async function handleStatusChange(
    id: string,
    mode: "settle" | "reopen" | "bill",
    billPayload?: OsBillConfirmPayload,
  ) {
    const url =
      mode === "bill"
        ? `/api/service-orders/${id}/bill`
        : mode === "reopen"
          ? `/api/service-orders/${id}/reopen`
          : `/api/service-orders/${id}/settle`;
    const method = "POST";
    const body =
      mode === "settle"
        ? JSON.stringify({
            discountAmount: !isPartial ? parseCurrencyInput(discountInput) : 0,
            partialAmount: isPartial ? parseCurrencyInput(partialAmountInput) : 0,
            paymentMethod: settlePaymentMethod,
          })
        : mode === "bill"
          ? JSON.stringify(billPayload ?? {})
          : undefined;
    if (mode === "bill") {
      setFecBillLoading(true);
    }
    try {
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
      if (!response.ok) return toast.error(data.message ?? "Não foi possível alterar o status.");
      setOrders((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: data.order.status,
                receivableStatus: data.order.receivableStatus,
                paymentStatus: data.order.paymentStatus,
                receivableAmount: data.order.receivableAmount,
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
    setSettleTarget(null);
    setBillFecOrder(null);
    setDiscountInput("");
    setIsPartial(false);
    setPartialAmountInput("");
    setSettlePaymentMethod("Pix");
      toast.success(
        mode === "settle"
          ? "Fechamento baixado com sucesso!"
          : mode === "bill"
            ? "Fechamento faturado com sucesso!"
            : "Fechamento reaberto com sucesso!",
      );
    } finally {
      if (mode === "bill") {
        setFecBillLoading(false);
      }
    }
  }

  async function handleReceivableStatusChange(
    receivableId: string,
    mode: "settle" | "reopen",
    options?: { partialAmount?: number; paymentMethod?: string },
  ) {
    const response = await fetch(`/api/receivables/${receivableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        partialAmount: mode === "settle" ? options?.partialAmount ?? 0 : 0,
        ...(mode === "settle" && options?.paymentMethod ? { paymentMethod: options.paymentMethod } : {}),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.message ?? data.error ?? "Não foi possível alterar o recebível.");
      return;
    }
    // Recarrega a OS (FEC) afetada para refrescar o paymentStatus consolidado.
    if (settleTarget?.order.id) {
      const fresh = await fetch(`/api/service-orders/${settleTarget.order.id}`, { cache: "no-store" });
      const freshData = await fresh.json();
      if (fresh.ok && freshData.order) {
        setOrders((current) =>
          current.map((item) =>
            item.id === settleTarget.order.id
              ? {
                  ...item,
                  status: freshData.order.status,
                  paymentStatus: freshData.order.paymentStatus,
                  receivableStatus: freshData.order.receivableStatus,
                  receivableAmount: freshData.order.receivableAmount,
                  receivableLines: freshData.order.receivableLines ?? item.receivableLines,
                  isBilled: freshData.order.isBilled,
                }
              : item,
          ),
        );
      }
    }
    setSettleTarget(null);
    setIsPartial(false);
    setPartialAmountInput("");
    setSettlePaymentMethod("Pix");
    toast.success(mode === "settle" ? "Parcela baixada com sucesso!" : "Parcela reaberta com sucesso!");
  }

  async function executeDelete(id: string) {
    const response = await fetch(`/api/service-orders/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível excluir o fechamento.");
    setOrders((current) => current.filter((item) => item.id !== id));
    toast.success("Fechamento excluído com sucesso!");
  }

  async function openOrderPreview(orderId: string) {
    const response = await fetch(`/api/service-orders/${orderId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível carregar o fechamento.");
    setOrderPreview(data.order);
  }

  const handleFecPdfDownload = useCallback(
    async (orderId: string, orderNumber: string) => {
      setDownloadingPdfId(orderId);
      try {
        const [orderRes, companyRes] = await Promise.all([
          fetch(`/api/service-orders/${orderId}`, { cache: "no-store" }).then((r) => r.json() as Promise<{ order?: OrderDetails }>),
          fetch("/api/company/public").then((r) => r.json() as Promise<{ company?: { name?: string } }>),
        ]);
        const order = orderRes.order;
        if (!order) {
          toast.error("Não foi possível carregar o fechamento.");
          return;
        }
        const companyName = companyRes.company?.name ?? "";
        const { FechamentoPdf } = await import("@/components/pdf/fechamento-pdf");
        await downloadPdf(
          createElement(FechamentoPdf, {
            order,
            companyName,
            unitName: order.unitName ?? "",
          }),
          `Fechamento-${orderNumber}`,
        );
      } catch {
        toast.error("Não foi possível gerar o PDF.");
      } finally {
        setDownloadingPdfId(null);
      }
    },
    [downloadPdf],
  );

  async function openSettleDialog(
    orderId: string,
    options?: {
      receivableId?: string | null;
      outstandingAmount?: number;
      originalAmount?: number;
      paidAmount?: number;
      isPartiallyPaid?: boolean;
      label?: string;
    },
  ) {
    const response = await fetch(`/api/service-orders/${orderId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível carregar o fechamento.");
    setDiscountInput("");
    setIsPartial(false);
    setPartialAmountInput("");
    setSettlePaymentMethod("Pix");
    setSettleTarget({
      order: data.order,
      receivableId: options?.receivableId ?? null,
      outstandingAmount: options?.outstandingAmount ?? (data.order.receivableAmount ?? 0),
      originalAmount: options?.originalAmount,
      paidAmount: options?.paidAmount,
      isPartiallyPaid: options?.isPartiallyPaid,
      label: options?.label,
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="OS de Fechamento"
        subtitle="Fechamentos mensais gerados a partir das ordens de serviço do cliente."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setCustomerFilter("");
              setStatusFilter("");
              setPaymentFilter("");
              setMinValue("");
              setMaxValue("");
              setDatePreset("all");
              setCustomFrom("");
              setCustomTo("");
              setTableSearch("");
              setPage(1);
            }}
          >
            Excluir filtros
          </Button>
        }
      />

      <div className="surface-card space-y-5 overflow-x-auto p-6 [&_td:last-child>div]:flex-nowrap [&_td:last-child]:whitespace-nowrap">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={selectedUnitId === "" ? "default" : "outline"} onClick={() => setSelectedUnitId("")}>Geral</Button>
          {units.map((unit) => <Button key={unit.id} size="sm" variant={selectedUnitId === unit.id ? "default" : "outline"} onClick={() => setSelectedUnitId(unit.id)}>{unit.name}</Button>)}
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <SearchableSelect value={customerFilter} onChange={setCustomerFilter} placeholder="Filtrar por cliente" options={customerOptions} />
          <SearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filtrar por status"
            options={[
              { value: "Aberta", label: "Aberta" },
              { value: "Em andamento", label: "Em andamento" },
              { value: "Concluída", label: "Concluída" },
              { value: "Cancelada", label: "Cancelada" },
            ]}
          />
          <SearchableSelect
            value={paymentFilter}
            onChange={setPaymentFilter}
            placeholder="Filtrar por pagamento"
            options={[
              { value: "PENDENTE", label: "Pendente" },
              { value: "PAGO_PARCIAL", label: "Pago parcialmente" },
              { value: "PAGO", label: "Pago" },
            ]}
          />
          <Input value={minValue} onChange={(event) => setMinValue(formatCurrencyInput(event.target.value))} placeholder="Valor mínimo" />
          <Input value={maxValue} onChange={(event) => setMaxValue(formatCurrencyInput(event.target.value))} placeholder="Valor máximo" />
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={datePreset === "all" ? "default" : "outline"} onClick={() => setDatePreset("all")}>Todo período</Button>
            <Button size="sm" variant={datePreset === "today" ? "default" : "outline"} onClick={() => setDatePreset("today")}>Hoje</Button>
            <Button size="sm" variant={datePreset === "yesterday" ? "default" : "outline"} onClick={() => setDatePreset("yesterday")}>Ontem</Button>
            <Button size="sm" variant={datePreset === "custom" ? "default" : "outline"} onClick={() => setDatePreset("custom")}>Personalizado</Button>
          </div>
          {datePreset === "custom" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <DatePicker value={customFrom} onChange={setCustomFrom} />
              <DatePicker value={customTo} onChange={setCustomTo} />
            </div>
          ) : null}
        </div>

        <DataTable
          data={displayRows}
          pageSize={10}
          isLoading={!hydrated}
          searchPlaceholder="Buscar por número ou cliente"
          searchKeys={searchKeys}
          searchValue={tableSearch}
          onSearchChange={(value) => {
            setTableSearch(value);
            setPage(1);
          }}
          getRowKey={(row) => row.rowKey}
          manualPagination={{
            page: meta?.page ?? page,
            totalPages: meta?.totalPages ?? 1,
            onPageChange: setPage,
          }}
          totalItems={meta?.total}
          emptyTitle="Nenhum fechamento encontrado"
          emptyDescription="Gere um fechamento mensal a partir da página de ordens de serviço."
          columns={[
            {
              key: "number",
              header: "Número",
              render: (row: ServiceOrderListDisplayRow) => <span className="font-medium">{row.displayNumber}</span>,
            },
            { key: "unit", header: "Unidade", render: (row: ServiceOrderListDisplayRow) => row.order.unitName ?? "Geral" },
            { key: "client", header: "Cliente", render: (row: ServiceOrderListDisplayRow) => row.order.clientName },
            {
              key: "paymentStatus",
              header: "Pagamento",
              render: (row: ServiceOrderListDisplayRow) => {
                // Quando a linha representa uma parcela específica, o status mostrado
                // é o da PARCELA, não do FEC inteiro. Assim, parcelas pendentes não
                // aparecem como "Pago parcialmente" só porque outra parcela foi paga.
                let label: string;
                if (row.receivableLineStatus != null || row.isPartiallyPaid) {
                  if (row.isPartiallyPaid) label = "Pago parcialmente";
                  else if (row.receivableLineStatus === "PAGO") label = "Pago";
                  else if (row.receivableLineStatus === "VENCIDO") label = "Vencido";
                  else label = "Pendente";
                } else if (row.order.paymentStatus === "PAGO_PARCIAL") label = "Pago parcialmente";
                else if (row.order.paymentStatus === "PAGO") label = "Pago";
                else label = "Pendente";
                return <StatusBadge status={label} />;
              },
            },
            {
              key: "total",
              header: "Valor total",
              render: (row: ServiceOrderListDisplayRow) => currency(row.order.total),
            },
            {
              key: "receivableAmount",
              header: "Valor devido",
              render: (row: ServiceOrderListDisplayRow) => {
                // Para linhas de parcela: usar displayTotal (saldo da parcela).
                // Para linhas únicas (FEC sem parcelas): usar receivableAmount do FEC.
                const rowFullyPaid = row.receivableLineId
                  ? row.receivableLineStatus === "PAGO" && !row.isPartiallyPaid
                  : row.order.paymentStatus === "PAGO";
                if (rowFullyPaid) return <span className="text-muted-foreground">-</span>;
                const amount = row.receivableLineId ? row.displayTotal : row.order.receivableAmount ?? 0;
                return currency(amount);
              },
            },
            {
              key: "date",
              header: "Data",
              render: (row: ServiceOrderListDisplayRow) => date(row.order.openedAt),
            },
            {
              key: "actions",
              header: "Ações",
              render: (row: ServiceOrderListDisplayRow) => {
                const fec = row.order;
                const rowFullyPaid = row.receivableLineId
                  ? row.receivableLineStatus === "PAGO" && !row.isPartiallyPaid
                  : fec.paymentStatus === "PAGO";

                return (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openOrderPreview(fec.id)}>
                      Ver
                    </Button>
                    {!fec.isBilled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setBillFecOrder({
                            id: fec.id,
                            number: fec.number,
                            openedAt: fec.openedAt,
                            dueDate: fec.dueDate ?? "",
                            paymentMethod: fec.paymentMethod ?? "",
                            paymentTerm: fec.paymentTerm === "A_PRAZO" ? "A_PRAZO" : "A_VISTA",
                            totalInput: formatCurrencyInput(String(Math.round(fec.total * 100))),
                          })
                        }
                      >
                        Faturar
                      </Button>
                    ) : rowFullyPaid ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          row.receivableLineId
                            ? void handleReceivableStatusChange(row.receivableLineId, "reopen")
                            : void handleStatusChange(fec.id, "reopen")
                        }
                      >
                        Reabrir
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void openSettleDialog(fec.id, {
                            receivableId: row.receivableLineId ?? null,
                            outstandingAmount: row.receivableLineId
                              ? row.displayTotal
                              : fec.receivableAmount ?? 0,
                            originalAmount: row.originalAmount,
                            paidAmount: row.paidAmount,
                            isPartiallyPaid: row.isPartiallyPaid,
                            label: row.displayNumber,
                          })
                        }
                      >
                        Baixar
                      </Button>
                    )}
                    {user?.accessLevel === "PROPRIETARIO" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingPdfId === fec.id}
                        onClick={() => void handleFecPdfDownload(fec.id, fec.number)}
                      >
                        <FileDown className="mr-1 h-4 w-4" />
                        {downloadingPdfId === fec.id ? "..." : "PDF"}
                      </Button>
                    ) : null}
                    <ConfirmModal
                      trigger={
                        <Button variant="outline" size="sm">
                          Excluir
                        </Button>
                      }
                      title="Excluir fechamento"
                      description="Deseja realmente excluir este fechamento?"
                      onConfirm={() => {
                        void executeDelete(fec.id);
                      }}
                      confirmLabel="Excluir"
                    />
                  </div>
                );
              },
            },
          ]}
        />
      </div>

      <OsBillConfirmDialog
        open={Boolean(billFecOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setBillFecOrder(null);
          }
        }}
        title="Faturar OS de fechamento"
        description={
          billFecOrder
            ? `Isso vai faturar ${billFecOrder.number} e todas as OS de origem ainda não faturadas. Confira ou altere vencimento e forma de pagamento; o fechamento e as OS filhas serão atualizados.`
            : ""
        }
        initial={fecBillConfirmInitial}
        confirmLabel="Faturar fechamento"
        cancelLabel="Cancelar"
        isLoading={fecBillLoading}
        paymentMethodOptions={[...PAYMENT_METHOD_OPTIONS]}
        onConfirm={(payload) => {
          if (billFecOrder) {
            void handleStatusChange(billFecOrder.id, "bill", payload);
          }
        }}
      />

      <Dialog open={Boolean(orderPreview)} onOpenChange={(open) => !open && setOrderPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{orderPreview?.number}</DialogTitle>
            <DialogDescription>Visualização do fechamento mensal.</DialogDescription>
          </DialogHeader>
          {orderPreview ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><span className="text-sm text-muted-foreground">Cliente</span><p>{orderPreview.clientName}</p></div>
                <div><span className="text-sm text-muted-foreground">Abertura</span><p>{date(orderPreview.openedAt)}</p></div>
                <div><span className="text-sm text-muted-foreground">Vencimento</span><p>{orderPreview.paymentTerm === "A_PRAZO" && orderPreview.dueDate ? date(orderPreview.dueDate) : "À vista"}</p></div>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="font-medium">Serviços</p>
                <div className="mt-3 space-y-2">
                  {previewOrderLines.map((sourceOrder) => (
                    <div key={sourceOrder.number} className="flex items-center justify-between text-sm">
                      <span>{sourceOrder.label}</span>
                      <span>{currency(sourceOrder.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
                <div>
                  <p className="font-medium">Total do fechamento</p>
                  <p className="text-sm text-muted-foreground">{orderPreview.paymentMethod || "Sem forma informada"}</p>
                </div>
                <p className="text-xl font-semibold">{currency(orderPreview.total)}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(settleTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setSettleTarget(null);
            setDiscountInput("");
            setIsPartial(false);
            setPartialAmountInput("");
            setSettlePaymentMethod("Pix");
          }
        }}
      >
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-3xl"
          bodyClassName="flex min-h-0 flex-1 flex-col gap-0 p-0"
        >
          {settleTarget ? (() => {
            const target = settleTarget;
            const isLineSettle = Boolean(target.receivableId);
            const outstanding = target.outstandingAmount;
            const partial = parseCurrencyInput(partialAmountInput);
            const discount = parseCurrencyInput(discountInput);
            const remaining = isPartial
              ? Math.max(outstanding - partial, 0)
              : Math.max(outstanding - discount, 0);
            const dialogTitle = target.label ?? target.order.number;
            const dialogDescription = isLineSettle
              ? "Confirme a baixa desta parcela (a OS de fechamento só ficará paga quando todas as parcelas estiverem quitadas)."
              : "Confirme a baixa do fechamento e aplique desconto, se necessário.";

            // Tabela unificada de itens com descrições limpas (remove `[RCV:...]`,
            // `[PLAN:...]` e o prefixo `[Produto]`). A OS de origem citada
            // entre parênteses é extraída em coluna dedicada.
            const items = target.order.services.map((service) => {
              const cleaned = cleanFecItemDescriptionForDisplay(service.description);
              const qty = service.quantity ?? 1;
              const total =
                typeof service.lineTotal === "number" && Number.isFinite(service.lineTotal)
                  ? service.lineTotal
                  : qty * service.laborPrice;
              return {
                key: `svc-${service.id}`,
                name: cleaned.name,
                type: cleaned.type === "produto" ? "Produto" : "Serviço",
                quantity: qty,
                total,
                sourceOrderNumber: cleaned.sourceOrderNumber,
              };
            });

            const onConfirm = () => {
              if (isPartial) {
                if (partial <= 0) {
                  toast.error("Informe um valor parcial válido.");
                  return;
                }
                if (partial >= outstanding) {
                  toast.error("O valor parcial deve ser menor que o valor devido.");
                  return;
                }
              }
              if (isLineSettle && target.receivableId) {
                void handleReceivableStatusChange(target.receivableId, "settle", {
                  partialAmount: isPartial ? partial : 0,
                  paymentMethod: settlePaymentMethod,
                });
              } else {
                void handleStatusChange(target.order.id, "settle");
              }
            };

            return (
              <>
                <DialogHeader className="shrink-0 px-6 pt-6">
                  <DialogTitle>{dialogTitle}</DialogTitle>
                  <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>

                <div className="shrink-0 px-6 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Cliente</span>
                      <p>{target.order.clientName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Vencimento</span>
                      <p>
                        {target.order.paymentTerm === "A_PRAZO" && target.order.dueDate
                          ? date(target.order.dueDate)
                          : "À vista"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 px-6 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {isPartial ? "Saldo restante" : "Valor devido"}
                      </p>
                      <p className="mt-2 text-3xl font-semibold">{currency(remaining)}</p>
                      {target.isPartiallyPaid && (target.paidAmount ?? 0) > 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Já recebido: <span className="font-medium">{currency(target.paidAmount ?? 0)}</span>
                          {target.originalAmount != null
                            ? ` de ${currency(target.originalAmount)} (valor original da parcela)`
                            : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border bg-muted/20 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        {isLineSettle ? "Valor total do fechamento" : "Valor total gasto"}
                      </p>
                      <p className="mt-2 text-3xl font-semibold">{currency(target.order.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col px-6">
                  <p className="mb-2 text-sm font-medium">Itens</p>
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-muted/10">
                    {items.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum item lançado.</p>
                    ) : (
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted/40 backdrop-blur">
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="w-[100px]">Tipo</TableHead>
                            <TableHead className="w-[90px] text-right">Qtd.</TableHead>
                            <TableHead className="w-[120px] text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.key}>
                              <TableCell className="whitespace-normal">
                                <div className="leading-tight">
                                  <span>{item.name}</span>
                                  {item.sourceOrderNumber ? (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      ({item.sourceOrderNumber})
                                    </span>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">{item.type}</span>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                              <TableCell className="text-right tabular-nums">{currency(item.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t bg-muted/30 px-6 py-4">
                  <div className="grid gap-3">
                    {/* Desconto só aparece ao baixar o FEC inteiro (sem receivableId). Por linha
                        de parcela não há fluxo de desconto direto — usar baixa parcial. */}
                    {!isLineSettle && !isPartial ? (
                      <div className="grid gap-2">
                        <Label>Desconto</Label>
                        <Input
                          value={discountInput}
                          onChange={(event) => setDiscountInput(formatCurrencyInput(event.target.value))}
                          placeholder="R$ 0,00"
                        />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isPartial}
                        onCheckedChange={(checked) => {
                          setIsPartial(Boolean(checked));
                          setPartialAmountInput("");
                        }}
                      />
                      <Label className="font-medium">Registrar pagamento parcial</Label>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {isPartial ? (
                        <div className="grid gap-2">
                          <Label>Valor pago agora</Label>
                          <Input
                            value={partialAmountInput}
                            onChange={(e) => setPartialAmountInput(formatCurrencyInput(e.target.value))}
                            placeholder="R$ 0,00"
                          />
                          <p className="text-xs text-muted-foreground">
                            O saldo restante será lançado como pendência no contas a receber.
                          </p>
                        </div>
                      ) : (
                        <div />
                      )}
                      <div className="grid gap-2">
                        <Label>Forma de pagamento</Label>
                        <SearchableSelect
                          value={settlePaymentMethod}
                          onChange={setSettlePaymentMethod}
                          placeholder="Selecione a forma de pagamento"
                          options={[...PAYMENT_METHOD_OPTIONS]}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setSettleTarget(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={onConfirm}>Confirmar baixa</Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })() : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
