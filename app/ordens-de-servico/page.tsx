"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, FilePlus2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useCustomers } from "@/hooks/use-customers";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { useServices } from "@/hooks/use-services";
import { useUnits } from "@/hooks/use-units";
import { useVehicles } from "@/hooks/use-vehicles";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";

type OrderStatus = "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Cancelada";
type ReceivableStatus = "PAGO" | "PENDENTE" | "VENCIDO" | null;

type OrderDetails = {
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
  total: number;
  openedAt: string;
  dueDate: string;
  paymentTerm: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod: string;
  notes: string;
  mileage: number | null;
  isStandalone: boolean;
  services: Array<{ id: string; serviceId?: string | null; description: string; laborPrice: number }>;
  receivableStatus: ReceivableStatus;
  receivableAmount?: number;
};

type ClosureRow = {
  id: string;
  customerId: string | null;
  customerName: string;
  month: string;
  totalSpent: number;
  outstandingAmount: number;
  count: number;
  unitScope: string | null;
};

export default function OrdensDeServicoPage() {
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId");
  const vehicleId = searchParams.get("vehicleId");
  const { unitId, currentUnit, isLoading: unitLoading } = useCurrentUnit();
  const { units } = useUnits();
  const { customers } = useCustomers();
  const { services } = useServices();

  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [customerFilter, setCustomerFilter] = useState(queryClientId ?? "");
  const [statusFilter, setStatusFilter] = useState("");
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
  const [editableData, setEditableData] = useState({ unitId: "", clientId: "", customerNameSnapshot: "", vehicleId: "", mileage: "", dueDate: "", paymentTerm: "A_VISTA" as "A_VISTA" | "A_PRAZO", paymentMethod: "", notes: "" });
  const [editableServices, setEditableServices] = useState<Array<{ id: string; serviceId: string; description: string; laborPrice: number; laborPriceInput: string }>>([]);

  useEffect(() => {
    if (unitId) setSelectedUnitId((current) => current || unitId);
  }, [unitId]);

  const { orders, hydrated, setOrders } = useServiceOrders({ unitId: selectedUnitId || undefined, customerId: customerFilter || undefined, vehicleId: vehicleId || undefined });
  const { vehicles } = useVehicles(editableData.clientId || undefined);

  const customerOptions = customers.map((customer) => ({ value: customer.id, label: customer.tipo === "pf" ? customer.nomeCompleto ?? "-" : customer.nomeFantasia ?? "-" }));
  const serviceOptions = services.map((service) => ({ value: service.name, label: service.name }));
  const unitOptions = units.map((unit) => ({ value: unit.id, label: unit.name }));
  const vehicleOptions = vehicles.map((vehicle) => ({ value: vehicle.id, label: `${vehicle.plate} • ${vehicle.brand} ${vehicle.model}` }));

  const filteredOrders = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    return orders.filter((order) => {
      if (order.number.startsWith("FEC-")) return false;
      if (statusFilter && order.status !== statusFilter) return false;
      if (serviceFilter && !order.servicesLabel.toLowerCase().includes(serviceFilter.toLowerCase())) return false;
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
  }, [customFrom, customTo, datePreset, maxValue, minValue, orders, serviceFilter, statusFilter]);

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
        grouped.set(key, { id: key, customerId: order.clientId, customerName: order.clientName, month, totalSpent: order.total, outstandingAmount: outstanding, count: 1, unitScope: selectedUnitId || null });
      }
    }
    return Array.from(grouped.values());
  }, [filteredOrders, selectedUnitId]);

  async function fetchOrder(id: string) {
    const response = await fetch(`/api/service-orders/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar a OS.");
    return data.order as OrderDetails;
  }

  async function openEditDialog(id: string) {
    const order = await fetchOrder(id);
    setEditOrder(order);
    setEditableData({ unitId: order.unitId, clientId: order.clientId ?? "", customerNameSnapshot: order.customerNameSnapshot ?? order.clientName, vehicleId: order.vehicleId ?? "", mileage: order.mileage ? String(order.mileage) : "", dueDate: order.dueDate ?? "", paymentTerm: order.paymentTerm ?? "A_VISTA", paymentMethod: order.paymentMethod ?? "", notes: order.notes ?? "" });
    setEditableServices(order.services.map((service) => ({ id: service.id, serviceId: service.serviceId ?? "", description: service.description, laborPrice: service.laborPrice, laborPriceInput: formatCurrencyInput(String(Math.round(service.laborPrice * 100))) })));
  }

  async function handleSaveEdit() {
    if (!editOrder) return;
    const response = await fetch(`/api/service-orders/${editOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "edit",
        unitId: editableData.unitId,
        customerId: editOrder.isStandalone ? null : editableData.clientId,
        customerNameSnapshot: editOrder.isStandalone ? editableData.customerNameSnapshot : "",
        vehicleId: editOrder.isStandalone ? null : editableData.vehicleId || null,
        mileage: editableData.mileage ? Number(editableData.mileage) : null,
        dueDate: editableData.paymentTerm === "A_PRAZO" ? editableData.dueDate : null,
        paymentTerm: editableData.paymentTerm,
        paymentMethod: editableData.paymentMethod,
        notes: editableData.notes,
        services: editableServices.map((service) => ({ serviceId: service.serviceId || null, description: service.description, laborPrice: service.laborPrice })),
      }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível salvar a OS.");
    setOrders((current) => current.map((item) => (item.id === editOrder.id ? { ...item, clientId: data.order.clientId, clientName: data.order.clientName, unitId: data.order.unitId, unitName: data.order.unitName, plate: data.order.plate, servicesLabel: data.order.services.map((service: { description: string }) => service.description).join(", "), total: data.order.total, dueDate: data.order.dueDate, paymentTerm: data.order.paymentTerm } : item)));
    setEditOrder(null);
    toast.success("OS atualizada com sucesso!");
  }

  async function handleStatusChange(id: string, mode: "settle" | "reopen") {
    const response = await fetch(`/api/service-orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível alterar o status da OS.");
    setOrders((current) => current.map((item) => (item.id === id ? { ...item, status: data.order.status, receivableStatus: data.order.receivableStatus } : item)));
    toast.success(mode === "settle" ? "OS baixada com sucesso!" : "OS reaberta com sucesso!");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja realmente excluir esta OS?")) return;
    const response = await fetch(`/api/service-orders/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível excluir a OS.");
    setOrders((current) => current.filter((item) => item.id !== id));
    toast.success("OS excluída com sucesso!");
  }

  async function handleCreateClosure() {
    if (!closureRow?.customerId) return toast.error("Selecione um cliente válido.");
    const response = await fetch("/api/service-orders/closures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: closureRow.customerId, unitId: closureRow.unitScope, month: closureRow.month, paymentTerm: closurePaymentTerm, dueDate: closurePaymentTerm === "A_PRAZO" ? closureDueDate : null }),
    });
    const data = await response.json();
    if (!response.ok) return toast.error(data.message ?? "Não foi possível gerar o fechamento.");
    setOrders((current) => [data.order, ...current]);
    setClosureRow(null);
    toast.success("OS de fechamento gerada com sucesso!");
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ordens de Serviço"
        subtitle={selectedUnitId && currentUnit ? `Acompanhe as OS da unidade ${currentUnit.name}.` : "Acompanhe as OS de todas as unidades."}
        actions={<div className="flex flex-wrap gap-3"><Link href="/ordens-de-servico/fechamentos"><Button variant="outline">OS de fechamento</Button></Link><Button variant={groupByCustomer ? "default" : "outline"} onClick={() => setGroupByCustomer((current) => !current)}>{groupByCustomer ? "Visão individual" : "Unificar por cliente/mês"}</Button><Button variant="outline" onClick={() => { setCustomerFilter(""); setStatusFilter(""); setServiceFilter(""); setMinValue(""); setMaxValue(""); setDatePreset("all"); setCustomFrom(""); setCustomTo(""); setGroupByCustomer(false); }}>Excluir filtros</Button><Link href="/ordens-de-servico/nova?standalone=1"><Button variant="outline"><FilePlus2 className="mr-2 h-4 w-4" />OS avulsa</Button></Link><Link href={queryClientId ? `/ordens-de-servico/nova?clientId=${queryClientId}` : "/ordens-de-servico/nova"}><Button><Plus className="mr-2 h-4 w-4" />Nova OS</Button></Link></div>}
      />

      <div className="surface-card space-y-5 p-6">
        <div className="flex flex-wrap gap-2"><Button size="sm" variant={selectedUnitId === "" ? "default" : "outline"} onClick={() => setSelectedUnitId("")}>Geral</Button>{units.map((unit) => <Button key={unit.id} size="sm" variant={selectedUnitId === unit.id ? "default" : "outline"} onClick={() => setSelectedUnitId(unit.id)}>{unit.name}</Button>)}</div>
        <div className="grid gap-3 lg:grid-cols-4">
          <SearchableSelect value={customerFilter} onChange={setCustomerFilter} placeholder="Filtrar por cliente" options={customerOptions} />
          <SearchableSelect value={statusFilter} onChange={setStatusFilter} placeholder="Filtrar por status" options={[{ value: "Aberta", label: "Aberta" }, { value: "Em andamento", label: "Em andamento" }, { value: "Aguardando peça", label: "Aguardando peça" }, { value: "Concluída", label: "Concluída" }, { value: "Cancelada", label: "Cancelada" }]} />
          <SearchableSelect value={serviceFilter} onChange={setServiceFilter} placeholder="Filtrar por serviço" options={serviceOptions} />
          <div className="grid grid-cols-2 gap-3"><Input value={minValue} onChange={(event) => setMinValue(formatCurrencyInput(event.target.value))} placeholder="Valor mínimo" /><Input value={maxValue} onChange={(event) => setMaxValue(formatCurrencyInput(event.target.value))} placeholder="Valor máximo" /></div>
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

        {groupByCustomer ? (
          <DataTable data={groupedOrders} pageSize={10} isLoading={unitLoading || !hydrated} searchPlaceholder="Buscar por cliente" searchKeys={[(row) => row.customerName, (row) => row.month]} columns={[{ key: "customer", header: "Cliente", render: (row) => row.customerName }, { key: "month", header: "Mês", render: (row) => row.month }, { key: "count", header: "OS", render: (row) => row.count }, { key: "total", header: "Valor total gasto", render: (row) => currency(row.totalSpent) }, { key: "outstanding", header: "Saldo em aberto", render: (row) => currency(row.outstandingAmount) }, { key: "actions", header: "Ações", render: (row) => <Button variant="outline" size="sm" onClick={() => setClosureRow(row)} disabled={!row.customerId}>Gerar fechamento</Button> }]} />
        ) : (
          <DataTable data={filteredOrders} pageSize={10} isLoading={unitLoading || !hydrated} searchPlaceholder="Buscar por número, cliente ou placa" searchKeys={[(row) => row.number, (row) => row.clientName, (row) => row.plate, (row) => row.servicesLabel]} columns={[{ key: "number", header: "Número OS", render: (row) => <span className="font-medium">{row.number}</span> }, { key: "unit", header: "Unidade", render: (row) => row.unitName ?? "Geral" }, { key: "client", header: "Cliente", render: (row) => row.clientName }, { key: "plate", header: "Placa", render: (row) => row.plate }, { key: "services", header: "Serviços", render: (row) => row.servicesLabel || "-" }, { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> }, { key: "total", header: "Valor total", render: (row) => currency(row.total) }, { key: "date", header: "Abertura", render: (row) => date(row.openedAt) }, { key: "dueDate", header: "Vencimento", render: (row) => (row.paymentTerm === "A_PRAZO" && row.dueDate ? date(row.dueDate) : "À vista") }, { key: "actions", header: "Ações", render: (row) => <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={async () => setViewOrder(await fetchOrder(row.id))}><Eye className="mr-1 h-4 w-4" />Ver</Button><Button variant="outline" size="sm" onClick={() => openEditDialog(row.id)}><Pencil className="mr-1 h-4 w-4" />Editar</Button><Button variant="outline" size="sm" onClick={() => row.receivableStatus === "PAGO" ? handleStatusChange(row.id, "reopen") : setSettleOrder({ id: row.id, number: row.number })}>{row.receivableStatus === "PAGO" ? "Reabrir" : "Baixar"}</Button><Button variant="outline" size="sm" onClick={() => handleDelete(row.id)}><Trash2 className="mr-1 h-4 w-4" />Excluir</Button></div> }]} />
        )}
      </div>

      <Dialog open={Boolean(viewOrder)} onOpenChange={(open) => !open && setViewOrder(null)}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>{viewOrder?.number}</DialogTitle><DialogDescription>Visualização da OS preenchida.</DialogDescription></DialogHeader>{viewOrder ? <div className="grid gap-4"><div className="grid gap-4 md:grid-cols-2"><div><span className="text-sm text-muted-foreground">Unidade</span><p>{viewOrder.unitName ?? "-"}</p></div><div><span className="text-sm text-muted-foreground">Cliente</span><p>{viewOrder.clientName}</p></div><div><span className="text-sm text-muted-foreground">Veículo</span><p>{viewOrder.vehicleLabel}</p></div><div><span className="text-sm text-muted-foreground">Pagamento</span><p>{viewOrder.paymentTerm === "A_PRAZO" ? "A prazo" : "À vista"}</p></div></div><div className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">Serviços</p><div className="mt-3 space-y-2">{viewOrder.services.map((service) => <div key={service.id} className="flex items-center justify-between text-sm"><span>{service.description}</span><span>{currency(service.laborPrice)}</span></div>)}</div></div><div className="rounded-2xl border bg-muted/20 p-4"><p className="font-medium">Observações</p><p className="mt-2 text-sm text-muted-foreground">{viewOrder.notes || "Sem observações."}</p></div></div> : null}</DialogContent></Dialog>

      <Dialog open={Boolean(editOrder)} onOpenChange={(open) => !open && setEditOrder(null)}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{editOrder?.number}</DialogTitle><DialogDescription>Edite a OS sem sair da listagem.</DialogDescription></DialogHeader>{editOrder ? <div className="grid gap-4"><div className="grid gap-2"><Label>Unidade</Label><SearchableSelect value={editableData.unitId} onChange={(value) => setEditableData((current) => ({ ...current, unitId: value }))} options={unitOptions} placeholder="Selecione a unidade" /></div><div className="grid gap-4 md:grid-cols-2"><div className="grid gap-2"><Label>Cliente</Label><SearchableSelect value={editableData.clientId} onChange={(value) => setEditableData((current) => ({ ...current, clientId: value, vehicleId: "" }))} options={customerOptions} placeholder="Selecione o cliente" /></div><div className="grid gap-2"><Label>Veículo</Label><SearchableSelect value={editableData.vehicleId} onChange={(value) => setEditableData((current) => ({ ...current, vehicleId: value }))} options={vehicleOptions} placeholder="Selecione o veículo" /></div></div><div className="grid gap-4 md:grid-cols-3"><div className="grid gap-2"><Label>Quilometragem</Label><Input value={editableData.mileage} onChange={(event) => setEditableData((current) => ({ ...current, mileage: event.target.value }))} /></div><div className="grid gap-2"><Label>Forma de pagamento</Label><Input value={editableData.paymentMethod} onChange={(event) => setEditableData((current) => ({ ...current, paymentMethod: event.target.value }))} /></div><div className="grid gap-2"><Label>Vencimento</Label><Input type="date" disabled={editableData.paymentTerm !== "A_PRAZO"} value={editableData.dueDate} onChange={(event) => setEditableData((current) => ({ ...current, dueDate: event.target.value }))} /></div></div><div className="flex gap-2"><Button variant={editableData.paymentTerm === "A_VISTA" ? "default" : "outline"} onClick={() => setEditableData((current) => ({ ...current, paymentTerm: "A_VISTA", dueDate: "" }))}>À vista</Button><Button variant={editableData.paymentTerm === "A_PRAZO" ? "default" : "outline"} onClick={() => setEditableData((current) => ({ ...current, paymentTerm: "A_PRAZO" }))}>A prazo</Button></div><div className="space-y-3">{editableServices.map((service) => <div key={service.id} className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_180px]"><div className="grid gap-2"><Label>Descrição</Label><Input value={service.description} onChange={(event) => setEditableServices((current) => current.map((item) => item.id === service.id ? { ...item, description: event.target.value } : item))} /></div><div className="grid gap-2"><Label>Valor</Label><Input value={service.laborPriceInput} onChange={(event) => setEditableServices((current) => current.map((item) => item.id === service.id ? { ...item, laborPriceInput: formatCurrencyInput(event.target.value), laborPrice: parseCurrencyInput(formatCurrencyInput(event.target.value)) } : item))} /></div></div>)}</div><div className="grid gap-2"><Label>Observações</Label><Textarea rows={5} value={editableData.notes} onChange={(event) => setEditableData((current) => ({ ...current, notes: event.target.value }))} /></div><div className="flex justify-end"><Button onClick={handleSaveEdit}>Salvar alterações</Button></div></div> : null}</DialogContent></Dialog>
      <Dialog open={Boolean(settleOrder)} onOpenChange={(open) => !open && setSettleOrder(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Confirmar baixa da OS</DialogTitle><DialogDescription>{settleOrder ? `Deseja confirmar a baixa da ${settleOrder.number}?` : "Confirme a baixa da ordem de serviço."}</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSettleOrder(null)}>Cancelar</Button><Button onClick={async () => { if (!settleOrder) return; await handleStatusChange(settleOrder.id, "settle"); setSettleOrder(null); }}>Confirmar baixa</Button></div></DialogContent></Dialog>

      <Dialog open={Boolean(closureRow)} onOpenChange={(open) => !open && setClosureRow(null)}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Gerar OS de fechamento</DialogTitle><DialogDescription>O valor total mostrará tudo o que o cliente consumiu. O contas a receber levará somente o saldo ainda em aberto.</DialogDescription></DialogHeader>{closureRow ? <div className="grid gap-4"><div className="rounded-2xl border bg-muted/20 p-4 text-sm"><p><strong>Cliente:</strong> {closureRow.customerName}</p><p><strong>Mês:</strong> {closureRow.month}</p><p><strong>Total consumido:</strong> {currency(closureRow.totalSpent)}</p><p><strong>Saldo em aberto:</strong> {currency(closureRow.outstandingAmount)}</p></div><div className="flex gap-2"><Button variant={closurePaymentTerm === "A_VISTA" ? "default" : "outline"} onClick={() => setClosurePaymentTerm("A_VISTA")}>À vista</Button><Button variant={closurePaymentTerm === "A_PRAZO" ? "default" : "outline"} onClick={() => setClosurePaymentTerm("A_PRAZO")}>A prazo</Button></div><div className="grid gap-2"><Label>Vencimento</Label><Input type="date" disabled={closurePaymentTerm !== "A_PRAZO"} value={closureDueDate} onChange={(event) => setClosureDueDate(event.target.value)} /></div><div className="flex justify-end"><Button onClick={handleCreateClosure}>Gerar fechamento</Button></div></div> : null}</DialogContent></Dialog>
    </div>
  );
}
