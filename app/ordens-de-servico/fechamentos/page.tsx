"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
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
};

export default function FechamentosPage() {
  const { unitId } = useCurrentUnit();
  const { units } = useUnits();
  const { customers } = useCustomers();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [orderPreview, setOrderPreview] = useState<OrderPreview | null>(null);
  const [settleOrder, setSettleOrder] = useState<OrderPreview | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
  }, [customFrom, customTo, datePreset, maxValue, minValue, orders, statusFilter]);

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
      body: JSON.stringify({ mode, discountAmount: mode === "settle" ? parseCurrencyInput(discountInput) : 0 }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível alterar o status.");
    setOrders((current) => current.map((item) => (item.id === id ? { ...item, status: data.order.status, receivableStatus: data.order.receivableStatus } : item)));
    setSettleOrder(null);
    setDiscountInput("");
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

  async function openSettleDialog(orderId: string) {
    const response = await fetch(`/api/service-orders/${orderId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "NÃ£o foi possÃ­vel carregar o fechamento.");
    setDiscountInput("");
    setSettleOrder(data.order);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="OS de Fechamento"
        subtitle="Fechamentos mensais gerados a partir das ordens de serviço do cliente."
        actions={
          <Button variant="outline" onClick={() => { setCustomerFilter(""); setStatusFilter(""); setMinValue(""); setMaxValue(""); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); }}>
            Excluir filtros
          </Button>
        }
      />

      <div className="surface-card space-y-5 p-6">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={selectedUnitId === "" ? "default" : "outline"} onClick={() => setSelectedUnitId("")}>Geral</Button>
          {units.map((unit) => <Button key={unit.id} size="sm" variant={selectedUnitId === unit.id ? "default" : "outline"} onClick={() => setSelectedUnitId(unit.id)}>{unit.name}</Button>)}
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <SearchableSelect value={customerFilter} onChange={setCustomerFilter} placeholder="Filtrar por cliente" options={customerOptions} />
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} placeholder="Filtrar por status" options={[{ value: "Aberta", label: "Aberta" }, { value: "Concluída", label: "Concluída" }, { value: "Cancelada", label: "Cancelada" }]} />
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
              <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
              <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
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
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "total", header: "Valor total", render: (row) => currency(row.total) },
            { key: "date", header: "Data", render: (row) => date(row.openedAt) },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openOrderPreview(row.id)}>
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => row.receivableStatus === "PAGO" ? handleStatusChange(row.id, "reopen") : openSettleDialog(row.id)}>
                    {row.receivableStatus === "PAGO" ? "Reabrir" : "Baixar"}
                  </Button>
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
      <Dialog open={Boolean(settleOrder)} onOpenChange={(open) => !open && setSettleOrder(null)}>
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
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Valor devido</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-900 dark:text-amber-100">
                    {currency(Math.max((settleOrder.receivableAmount ?? 0) - parseCurrencyInput(discountInput), 0))}
                  </p>
                </div>
                <div className="rounded-2xl border border-sky-300 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
                  <p className="text-sm font-medium text-sky-800 dark:text-sky-200">Valor total gasto</p>
                  <p className="mt-2 text-3xl font-semibold text-sky-900 dark:text-sky-100">{currency(settleOrder.total)}</p>
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
              <div className="grid gap-2">
                <label className="text-sm font-medium">Desconto</label>
                <Input value={discountInput} onChange={(event) => setDiscountInput(formatCurrencyInput(event.target.value))} placeholder="R$ 0,00" />
              </div>
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
