"use client";

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
import { usePayables } from "@/hooks/use-payables";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useUnits } from "@/hooks/use-units";
import { currency, date } from "@/lib/formatters";

const categoryOptions = [
  { value: "Aluguel", label: "Aluguel" },
  { value: "Fornecedores", label: "Fornecedores" },
  { value: "Água/Luz", label: "Água/Luz" },
  { value: "Funcionários", label: "Funcionários" },
  { value: "Outros", label: "Outros" },
];

export default function FinanceiroPagarPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Outros");
  const [supplierId, setSupplierId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [unitId, setUnitId] = useState("general");
  const [installments, setInstallments] = useState("1");
  const [editingPayableId, setEditingPayableId] = useState<string | null>(null);

  const { units } = useUnits();
  const { suppliers } = useSuppliers();
  const { payables, hydrated, setPayables } = usePayables({
    status: statusFilter,
    period: periodFilter,
    unitId: unitFilter,
  });

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier.id,
    label: supplier.tipo === "pf" ? supplier.nomeCompleto ?? "-" : supplier.nomeFantasia ?? "-",
  }));
  const unitOptions = [
    { value: "general", label: "Geral" },
    ...units.map((unit) => ({ value: unit.id, label: unit.name })),
  ];

  const totalPendente = payables.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + item.value, 0);
  const totalVencido = payables.filter((item) => item.status === "Vencido").reduce((sum, item) => sum + item.value, 0);
  const totalPagoMes = payables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);

  const data = useMemo(
    () =>
      payables.map((item) => ({
        ...item,
        installmentLabel:
          item.installmentNumber && item.installmentCount
            ? `${item.installmentNumber}/${item.installmentCount}`
            : "-",
      })),
    [payables],
  );

  const editingPayable = data.find((item) => item.id === editingPayableId) ?? null;

  async function handleCreatePayable() {
    const response = await fetch("/api/payables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        category,
        supplierId: supplierId || null,
        amount: Number(amount),
        dueDate,
        unitId: unitId === "general" ? null : unitId,
        installments: Number(installments),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível criar a conta a pagar.");
      return;
    }

    setPayables((current) => [...current, ...(data.payables ?? [])]);
    setOpen(false);
    setDescription("");
    setCategory("Outros");
    setSupplierId("");
    setAmount("");
    setDueDate("");
    setUnitId("general");
    setInstallments("1");
    toast.success("Conta a pagar cadastrada com sucesso!");
  }

  async function handleUpdatePayable() {
    if (!editingPayable) {
      return;
    }

    const response = await fetch(`/api/payables/${editingPayable.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "edit",
        description,
        category,
        supplierId: supplierId || null,
        amount: Number(amount),
        dueDate,
        unitId: unitId === "general" ? null : unitId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      toast.error(data.message ?? "Não foi possível atualizar a conta a pagar.");
      return;
    }

    setPayables((current) => current.map((item) => (item.id === editingPayable.id ? data.payable : item)));
    setEditingPayableId(null);
    setOpen(false);
    toast.success("Conta a pagar atualizada com sucesso!");
  }

  async function handleStatusChange(id: string, mode: "settle" | "reopen") {
    const response = await fetch(`/api/payables/${id}`, {
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

    setPayables((current) => current.map((item) => (item.id === id ? data.payable : item)));
    toast.success(mode === "settle" ? "Conta baixada com sucesso!" : "Conta reaberta com sucesso!");
  }

  function openCreateDialog() {
    setEditingPayableId(null);
    setDescription("");
    setCategory("Outros");
    setSupplierId("");
    setAmount("");
    setDueDate("");
    setUnitId("general");
    setInstallments("1");
    setOpen(true);
  }

  function openEditDialog(id: string) {
    const target = data.find((item) => item.id === id);
    if (!target) {
      return;
    }

    setEditingPayableId(id);
    setDescription(target.description);
    setCategory(target.category);
    setSupplierId(target.supplierId ?? "");
    setAmount(String(target.value));
    setDueDate(target.dueDate);
    setUnitId(target.unitId ?? "general");
    setInstallments(String(target.installmentCount ?? 1));
    setOpen(true);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contas a Pagar"
        subtitle="Separe despesas por unidade quando precisar, ou lance como Geral quando a despesa for compartilhada."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-full" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova conta a pagar
                </Button>
              }
            />
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>{editingPayable ? "Editar conta a pagar" : "Nova conta a pagar"}</DialogTitle>
                  <DialogDescription>
                    {editingPayable
                      ? "Atualize os dados do lançamento."
                      : "Você pode vincular a uma unidade específica ou deixar o lançamento como Geral."}
                  </DialogDescription>
                </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="description">Descricao</Label>
                  <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <SearchableSelect value={category} onChange={setCategory} placeholder="Selecione a categoria" options={categoryOptions} />
                </div>
                <div className="grid gap-2">
                  <Label>Fornecedor</Label>
                  <SearchableSelect
                    value={supplierId}
                    onChange={setSupplierId}
                    placeholder="Selecione o fornecedor (opcional)"
                    options={supplierOptions}
                  />
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
                      disabled={Boolean(editingPayable)}
                    />
                  </div>
                </div>
                <Button onClick={editingPayable ? handleUpdatePayable : handleCreatePayable}>
                  {editingPayable ? "Salvar alteracoes" : "Salvar conta a pagar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
            <p className="text-sm text-muted-foreground">Total pago no mes</p>
            <p className="mt-3 text-3xl font-semibold">{currency(totalPagoMes)}</p>
          </CardContent>
        </Card>
      </section>

      <div className="surface-card space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="Filtrar por status" />
          <Input value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} placeholder="Filtrar por periodo (AAAA-MM)" />
          <SearchableSelect value={unitFilter} onChange={setUnitFilter} placeholder="Filtrar por unidade" options={unitOptions} />
        </div>
        <DataTable
          data={data}
          isLoading={!hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por descricao, fornecedor ou categoria"
          searchKeys={[(row) => row.description, (row) => row.supplierName, (row) => row.category]}
          emptyTitle="Nenhuma conta a pagar encontrada"
          emptyDescription="Lance despesas por unidade ou no geral conforme a necessidade da operação."
          columns={[
            { key: "description", header: "Descricao", render: (row) => <span className="font-medium">{row.description}</span> },
            { key: "supplier", header: "Fornecedor", render: (row) => row.supplierName },
            { key: "category", header: "Categoria", render: (row) => row.category },
            { key: "unit", header: "Unidade", render: (row) => row.unitName },
            { key: "installment", header: "Parcela", render: (row) => row.installmentLabel },
            { key: "value", header: "Valor", render: (row) => currency(row.value) },
            { key: "dueDate", header: "Vencimento", render: (row) => date(row.dueDate) },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(row.id)}>
                    Editar
                  </Button>
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
    </div>
  );
}
