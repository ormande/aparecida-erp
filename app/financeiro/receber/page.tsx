"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCustomers } from "@/hooks/use-customers";
import { useReceivables } from "@/hooks/use-receivables";
import { useUnits } from "@/hooks/use-units";
import { currency, date } from "@/lib/formatters";

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
};

export default function FinanceiroReceberPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [unitId, setUnitId] = useState("general");
  const [installments, setInstallments] = useState("1");
  const [editingReceivableId, setEditingReceivableId] = useState<string | null>(null);
  const [orderPreview, setOrderPreview] = useState<OrderPreview | null>(null);

  const { units } = useUnits();
  const { customers } = useCustomers();
  const { receivables, hydrated, setReceivables } = useReceivables({
    status: statusFilter,
    period: periodFilter,
    unitId: unitFilter,
  });

  const customerOptions = customers.map((customer) => ({
    value: customer.id,
    label: customer.tipo === "pf" ? customer.nomeCompleto ?? "-" : customer.nomeFantasia ?? "-",
  }));
  const unitOptions = [
    { value: "general", label: "Geral" },
    ...units.map((unit) => ({ value: unit.id, label: unit.name })),
  ];

  const totalPendente = receivables.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + item.value, 0);
  const totalVencido = receivables.filter((item) => item.status === "Vencido").reduce((sum, item) => sum + item.value, 0);
  const totalRecebidoMes = receivables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);

  const data = useMemo(
    () =>
      receivables.map((item) => ({
        ...item,
        originLabel: item.originType === "SERVICE_ORDER" ? "OS" : "Avulso",
        installmentLabel:
          item.installmentNumber && item.installmentCount
            ? `${item.installmentNumber}/${item.installmentCount}`
            : "-",
      })),
    [receivables],
  );

  const editingReceivable = data.find((item) => item.id === editingReceivableId) ?? null;

  async function handleCreateReceivable() {
    const response = await fetch("/api/receivables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        customerId,
        amount: Number(amount),
        dueDate,
        unitId: unitId === "general" ? null : unitId,
        installments: Number(installments),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível criar o recebível.");
      return;
    }

    setReceivables((current) => [...current, ...(data.receivables ?? [])]);
    setOpen(false);
    setDescription("");
    setCustomerId("");
    setAmount("");
    setDueDate("");
    setUnitId("general");
    setInstallments("1");
    toast.success("Recebível cadastrado com sucesso!");
  }

  async function handleUpdateReceivable() {
    if (!editingReceivable) {
      return;
    }

    const response = await fetch(`/api/receivables/${editingReceivable.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "edit",
        description,
        customerId,
        amount: Number(amount),
        dueDate,
        unitId: unitId === "general" ? null : unitId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível atualizar o recebível.");
      return;
    }

    setReceivables((current) => current.map((item) => (item.id === editingReceivable.id ? data.receivable : item)));
    setEditingReceivableId(null);
    setOpen(false);
    toast.success("Recebível atualizado com sucesso!");
  }

  async function handleStatusChange(id: string, mode: "settle" | "reopen") {
    const response = await fetch(`/api/receivables/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível alterar o status.");
      return;
    }

    setReceivables((current) => current.map((item) => (item.id === id ? data.receivable : item)));
    toast.success(mode === "settle" ? "Recebível baixado com sucesso!" : "Recebível reaberto com sucesso!");
  }

  async function openOrderPreview(orderId: string) {
    const response = await fetch(`/api/service-orders/${orderId}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível carregar a OS.");
      return;
    }

    setOrderPreview(data.order);
  }

  function openCreateDialog() {
    setEditingReceivableId(null);
    setDescription("");
    setCustomerId("");
    setAmount("");
    setDueDate("");
    setUnitId("general");
    setInstallments("1");
    setOpen(true);
  }

  function openEditDialog(id: string) {
    const target = data.find((item) => item.id === id);
    if (!target || target.originType === "SERVICE_ORDER") {
      return;
    }

    setEditingReceivableId(id);
    setDescription(target.description);
    setCustomerId(target.clientId);
    setAmount(String(target.value));
    setDueDate(target.dueDate);
    setUnitId(target.unitId ?? "general");
    setInstallments(String(target.installmentCount ?? 1));
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contas a Receber"
        subtitle="Recebimentos podem vir automaticamente das OS ou entrar manualmente como lançamentos avulsos."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/ordens-de-servico/nova" className="inline-flex">
              <Button variant="outline">Adicionar OS</Button>
            </Link>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo recebível
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingReceivable ? "Editar recebível" : "Novo recebível avulso"}</DialogTitle>
                  <DialogDescription>
                    {editingReceivable
                      ? "Atualize os dados do lançamento manual."
                      : "Use este lançamento quando a entrada não vier diretamente de uma OS."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Cliente</Label>
                    <SearchableSelect
                      value={customerId}
                      onChange={setCustomerId}
                      placeholder="Selecione o cliente"
                      options={customerOptions}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Valor</Label>
                      <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="dueDate">Vencimento</Label>
                      <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Unidade</Label>
                      <SearchableSelect value={unitId} onChange={setUnitId} placeholder="Selecione a unidade" options={unitOptions} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="installments">Parcelas</Label>
                      <Input
                        id="installments"
                        type="number"
                        min="1"
                        max="24"
                        value={installments}
                        onChange={(e) => setInstallments(e.target.value)}
                        disabled={Boolean(editingReceivable)}
                      />
                    </div>
                  </div>
                  <Button onClick={editingReceivable ? handleUpdateReceivable : handleCreateReceivable}>
                    {editingReceivable ? "Salvar alterações" : "Salvar recebível"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={unitFilter === "" ? "default" : "outline"} onClick={() => setUnitFilter("")}>
          Geral
        </Button>
        {units.map((unit) => (
          <Button
            key={unit.id}
            size="sm"
            variant={unitFilter === unit.id ? "default" : "outline"}
            onClick={() => setUnitFilter(unit.id)}
          >
            {unit.name}
          </Button>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="surface-card border-none">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total pendente</p>
            <p className="mt-3 text-3xl font-semibold">{currency(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card className="surface-card border-none">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total vencido</p>
            <p className="mt-3 text-3xl font-semibold">{currency(totalVencido)}</p>
          </CardContent>
        </Card>
        <Card className="surface-card border-none">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total recebido no mês</p>
            <p className="mt-3 text-3xl font-semibold">{currency(totalRecebidoMes)}</p>
          </CardContent>
        </Card>
      </section>

      <div className="surface-card space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="Filtrar por status" />
          <Input value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} placeholder="Filtrar por período (AAAA-MM)" />
          <SearchableSelect value={unitFilter} onChange={setUnitFilter} placeholder="Filtrar por unidade" options={unitOptions} />
        </div>
        <DataTable
          data={data}
          isLoading={!hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por descrição ou cliente"
          searchKeys={[(row) => row.description, (row) => row.clientName]}
          emptyTitle="Nenhuma conta a receber encontrada"
          emptyDescription="As OS novas geram recebíveis automaticamente, e você também pode lançar entradas avulsas."
          columns={[
            { key: "description", header: "Descrição", render: (row) => <span className="font-medium">{row.description}</span> },
            { key: "client", header: "Cliente", render: (row) => row.clientName },
            { key: "unit", header: "Unidade", render: (row) => row.unitName },
            { key: "origin", header: "Origem", render: (row) => row.originLabel },
            { key: "installment", header: "Parcela", render: (row) => row.installmentLabel },
            { key: "value", header: "Valor", render: (row) => currency(row.value) },
            { key: "dueDate", header: "Vencimento", render: (row) => date(row.dueDate) },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex gap-2">
                  {row.originType === "MANUAL" ? (
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(row.id)}>
                      Editar
                    </Button>
                  ) : row.serviceOrderId ? (
                    <Button variant="outline" size="sm" onClick={() => openOrderPreview(row.serviceOrderId!)}>
                      Ver OS
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(row.id, row.status === "Pago" ? "reopen" : "settle")}
                  >
                    {row.status === "Pago" ? "Reabrir" : "Baixar"}
                  </Button>
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
            <DialogDescription>Visualização da OS vinculada a este recebível.</DialogDescription>
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
                  <p className="font-medium">Total da OS</p>
                  <p className="text-sm text-muted-foreground">{orderPreview.paymentMethod || "Sem forma informada"}</p>
                </div>
                <p className="text-xl font-semibold">{currency(orderPreview.total)}</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => openOrderPreview(orderPreview.id)}>Atualizar</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
