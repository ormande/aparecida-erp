"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { currency, date, payables } from "@/lib/mock-data";

export default function FinanceiroPagarPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  const data = useMemo(
    () =>
      payables
        .filter((item) => (statusFilter ? item.status === statusFilter : true))
        .filter((item) => (periodFilter ? item.dueDate.includes(periodFilter) : true)),
    [periodFilter, statusFilter],
  );

  const totalPendente = payables.filter((item) => item.status === "Pendente").reduce((sum, item) => sum + item.value, 0);
  const totalVencido = payables.filter((item) => item.status === "Vencido").reduce((sum, item) => sum + item.value, 0);
  const totalPagoMes = payables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contas a Pagar"
        subtitle="Acompanhe despesas da operação e compromissos financeiros da borracharia."
        actions={
          <Button
            className="rounded-full"
            onClick={() => toast.success("Fluxo mockado: despesa criada com sucesso.")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo lançamento
          </Button>
        }
      />

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
            <p className="text-sm text-muted-foreground">Total pago no mês</p>
            <p className="mt-3 text-3xl font-semibold">{currency(totalPagoMes)}</p>
          </CardContent>
        </Card>
      </section>

      <div className="surface-card space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <Input value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} placeholder="Filtrar por status" />
          <Input value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} placeholder="Filtrar por período (AAAA-MM)" />
        </div>
        <DataTable
          data={data}
          pageSize={10}
          searchPlaceholder="Buscar por descrição ou categoria"
          searchKeys={[(row) => row.description, (row) => row.category]}
          columns={[
            { key: "description", header: "Descrição", render: (row) => <span className="font-medium">{row.description}</span> },
            { key: "category", header: "Categoria", render: (row) => row.category },
            { key: "value", header: "Valor", render: (row) => currency(row.value) },
            { key: "dueDate", header: "Vencimento", render: (row) => date(row.dueDate) },
            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
            { key: "actions", header: "Ações", render: () => <Button variant="outline" size="sm">Ver</Button> },
          ]}
        />
      </div>
    </div>
  );
}
