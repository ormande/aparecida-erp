"use client";

import { FileDown } from "lucide-react";
import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { useUnits } from "@/hooks/use-units";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { getPersonName } from "@/lib/person-helpers";

type OrderPreview = {
  id: string;
  number: string;
  clientName: string;
  vehicleLabel: string;
  openedAt: string;
  dueDate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod: string;
  notes: string;
  services: Array<{ id: string; description: string; laborPrice: number }>;
  total: number;
  receivableAmount?: number;
  paymentStatus?: "PENDENTE" | "PAGO_PARCIAL" | "PAGO";
};

export default function FechamentosPage() {
  const { unitId } = useCurrentUnit();
  const { units } = useUnits();
  const { customers } = useCustomers();
  const { user } = useAuth();
  const { download: downloadPdf } = usePdfDownload();
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [orderPreview, setOrderPreview] = useState<OrderPreview | null>(null);
  const [settleOrder, setSettleOrder] = useState<OrderPreview | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [isPartial, setIsPartial] = useState(false);
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    if (unitId) setSelectedUnitId((current) => current || unitId);
  }, [unitId]);

  const { orders, hydrated, setOrders } = useServiceOrders({
    unitId: selectedUnitId || undefined,
    customerId: customerFilter || undefined,
  });

  const rows = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return orders
      .filter((order) => order.number.startsWith("FEC-"))
      .filter((order) => {
        if (paymentFilter && order.paymentStatus !== paymentFilter) return false;
        if (statusFilter && order.status !== statusFilter) return false;
        if (minValue && order.total < parseCurrencyInput(minValue)) return false;
        if (maxValue && order.total > parseCurrencyInput(maxValue)) return false;
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
  }, [customFrom, customTo, datePreset, maxValue, minValue, orders, paymentFilter, statusFilter]);

  const searchKeys = useMemo<Array<(row: (typeof rows)[number]) => string>>(
    () => [(row) => row.number, (row) => row.clientName],
    [],
  );

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: getPersonName(customer, "-"),
  }));

  async function handleStatusChange(id: string, mode: "settle" | "reopen") {
    const response = await fetch(`/api/service-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        discountAmount: mode === "settle" && !isPartial ? parseCurrencyInput(discountInput) : 0,
        partialAmount: mode === "settle" && isPartial ? parseCurrencyInput(partialAmountInput) : 0,
      }),
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
            }
          : item,
      ),
    );
    setSettleOrder(null);
    setDiscountInput("");
    setIsPartial(false);
    setPartialAmountInput("");
    toast.success(mode === "settle" ? "Fechamento baixado com sucesso!" : "Fechamento reaberto com sucesso!");
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
          fetch(`/api/service-orders/${orderId}`, { cache: "no-store" }).then((r) => r.json() as Promise<{ order?: OrderPreview }>),
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
            order: {
              ...order,
              clientId: null,
              vehicleId: null,
              unitId: "",
              status: "Aberta" as const,
              paymentStatus: order.paymentStatus ?? "PENDENTE",
              mileage: null,
              isStandalone: false,
              receivableStatus: null,
            },
            companyName,
            unitName: "",
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

  async function openSettleDialog(orderId: string) {
    const response = await fetch(`/api/service-orders/${orderId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível carregar o fechamento.");
    setDiscountInput("");
    setIsPartial(false);
    setPartialAmountInput("");
    setSettleOrder(data.order);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="OS de Fechamento"
        subtitle="Fechamentos mensais gerados a partir das ordens de serviço do cliente."
        actions={
          <Button variant="outline" onClick={() => { setCustomerFilter(""); setStatusFilter(""); setPaymentFilter(""); setMinValue(""); setMaxValue(""); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); }}>
            Excluir filtros
          </Button>
        }
      />

      <div className="surface-card space-y-5 p-6">
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
          data={rows}
          pageSize={10}
          isLoading={!hydrated}
          searchPlaceholder="Buscar por número ou cliente"
          searchKeys={searchKeys}
          emptyTitle="Nenhum fechamento encontrado"
          emptyDescription="Gere um fechamento mensal a partir da página de ordens de serviço."
          columns={[
            { key: "number", header: "Número", render: (row) => <span className="font-medium">{row.number}</span> },
            { key: "unit", header: "Unidade", render: (row) => row.unitName ?? "Geral" },
            { key: "client", header: "Cliente", render: (row) => row.clientName },
            {
              key: "paymentStatus",
              header: "Pagamento",
              render: (row) => {
                const label =
                  row.paymentStatus === "PAGO"
                    ? "Pago"
                    : row.paymentStatus === "PAGO_PARCIAL"
                      ? "Pago parcialmente"
                      : "Pendente";
                return <StatusBadge status={label} />;
              },
            },
            { key: "total", header: "Valor total", render: (row) => currency(row.total) },
            {
              key: "receivableAmount",
              header: "Valor devido",
              render: (row) =>
                row.paymentStatus === "PAGO" ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  currency(row.receivableAmount ?? 0)
                ),
            },
            { key: "date", header: "Data", render: (row) => date(row.openedAt) },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openOrderPreview(row.id)}>
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      row.paymentStatus === "PAGO"
                        ? handleStatusChange(row.id, "reopen")
                        : openSettleDialog(row.id)
                    }
                  >
                    {row.paymentStatus === "PAGO" ? "Reabrir" : "Baixar"}
                  </Button>
                  {user?.accessLevel === "PROPRIETARIO" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingPdfId === row.id}
                      onClick={() => void handleFecPdfDownload(row.id, row.number)}
                    >
                      <FileDown className="mr-1 h-4 w-4" />
                      {downloadingPdfId === row.id ? "..." : "PDF"}
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
                      void executeDelete(row.id);
                    }}
                    confirmLabel="Excluir"
                  />
                </div>
              ),
            },
          ]}
        />
      </div>

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
                <div><span className="text-sm text-muted-foreground">Veículo</span><p>{orderPreview.vehicleLabel}</p></div>
                <div><span className="text-sm text-muted-foreground">Abertura</span><p>{date(orderPreview.openedAt)}</p></div>
                <div><span className="text-sm text-muted-foreground">Vencimento</span><p>{orderPreview.paymentTerm === "A_PRAZO" && orderPreview.dueDate ? date(orderPreview.dueDate) : "À vista"}</p></div>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="font-medium">Serviços</p>
                <div className="mt-3 space-y-2">
                  {orderPreview.services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between text-sm">
                      <span>{service.description}</span>
                      <span>{currency(service.laborPrice)}</span>
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
        open={Boolean(settleOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSettleOrder(null);
            setDiscountInput("");
            setIsPartial(false);
            setPartialAmountInput("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{settleOrder?.number}</DialogTitle>
            <DialogDescription>Confirme a baixa do fechamento e aplique desconto, se necessário.</DialogDescription>
          </DialogHeader>
          {settleOrder ? (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><span className="text-sm text-muted-foreground">Cliente</span><p>{settleOrder.clientName}</p></div>
                <div><span className="text-sm text-muted-foreground">Vencimento</span><p>{settleOrder.paymentTerm === "A_PRAZO" && settleOrder.dueDate ? date(settleOrder.dueDate) : "À vista"}</p></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {isPartial ? "Saldo restante" : "Valor devido"}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {currency(
                      isPartial
                        ? Math.max((settleOrder.receivableAmount ?? 0) - parseCurrencyInput(partialAmountInput), 0)
                        : Math.max((settleOrder.receivableAmount ?? 0) - parseCurrencyInput(discountInput), 0),
                    )}
                  </p>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium text-muted-foreground">Valor total gasto</p>
                  <p className="mt-2 text-3xl font-semibold">{currency(settleOrder.total)}</p>
                </div>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="font-medium">Serviços</p>
                <div className="mt-3 space-y-2">
                  {settleOrder.services.map((service) => (
                    <div key={service.id} className="flex items-center justify-between text-sm">
                      <span>{service.description}</span>
                      <span>{currency(service.laborPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {!isPartial ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Desconto</label>
                  <Input value={discountInput} onChange={(event) => setDiscountInput(formatCurrencyInput(event.target.value))} placeholder="R$ 0,00" />
                </div>
              ) : null}
              <div className="border-t" />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isPartial}
                  onCheckedChange={(checked) => {
                    setIsPartial(Boolean(checked));
                    setPartialAmountInput("");
                  }}
                />
                <label className="text-sm font-medium">Registrar pagamento parcial</label>
              </div>
              {isPartial ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Valor pago agora</label>
                  <Input
                    value={partialAmountInput}
                    onChange={(e) => setPartialAmountInput(formatCurrencyInput(e.target.value))}
                    placeholder="R$ 0,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    O saldo restante será lançado automaticamente como pendência no contas a receber.
                  </p>
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSettleOrder(null)}>Cancelar</Button>
                <Button onClick={() => handleStatusChange(settleOrder.id, "settle")}>Confirmar baixa</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
