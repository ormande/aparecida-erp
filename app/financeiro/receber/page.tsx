"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { OrderPreviewDialog } from "@/components/financeiro/order-preview-dialog";
import { ReceivableFormDialog } from "@/components/financeiro/receivable-form-dialog";
import { ReceivablesSummaryCards } from "@/components/financeiro/receivables-summary-cards";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useReceivablesPage } from "@/hooks/use-receivables-page";

export default function FinanceiroReceberPage() {
  const p = useReceivablesPage();
  const formProps = {
    editingReceivable: p.editingReceivable,
    customerOptions: p.customerOptions,
    unitOptions: p.unitOptions,
    description: p.description,
    setDescription: p.setDescription,
    customerId: p.customerId,
    setCustomerId: p.setCustomerId,
    amount: p.amount,
    setAmount: p.setAmount,
    dueDate: p.dueDate,
    setDueDate: p.setDueDate,
    unitId: p.unitId,
    setUnitId: p.setUnitId,
    installments: p.installments,
    setInstallments: p.setInstallments,
    onSave: p.onSaveReceivable,
  };

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
            <Dialog open={p.open} onOpenChange={p.setOpen}>
              <DialogTrigger
                render={
                  <Button onClick={p.openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo recebível
                  </Button>
                }
              />
              <ReceivableFormDialog {...formProps} />
            </Dialog>
          </div>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={p.unitFilter === "" ? "default" : "outline"} onClick={() => p.setUnitFilter("")}>
          Geral
        </Button>
        {p.units.map((unit) => (
          <Button key={unit.id} size="sm" variant={p.unitFilter === unit.id ? "default" : "outline"} onClick={() => p.setUnitFilter(unit.id)}>
            {unit.name}
          </Button>
        ))}
      </div>
      <ReceivablesSummaryCards totalPendente={p.totalPendente} totalVencido={p.totalVencido} totalRecebidoMes={p.totalRecebidoMes} />
      <div className="surface-card space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Input value={p.statusFilter} onChange={(e) => p.setStatusFilter(e.target.value)} placeholder="Filtrar por status" />
          <Input value={p.periodFilter} onChange={(e) => p.setPeriodFilter(e.target.value)} placeholder="Filtrar por período (AAAA-MM)" />
          <SearchableSelect value={p.unitFilter} onChange={p.setUnitFilter} placeholder="Filtrar por unidade" options={p.unitOptions} />
        </div>
        <DataTable
          data={p.data}
          isLoading={!p.hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por descrição ou cliente"
          searchKeys={p.searchKeys}
          emptyTitle="Nenhuma conta a receber encontrada"
          emptyDescription="As OS novas geram recebíveis automaticamente, e você também pode lançar entradas avulsas."
          columns={p.tableColumns}
        />
      </div>
      <OrderPreviewDialog orderPreview={p.orderPreview} onClose={p.closeOrderPreview} onRefresh={p.refreshOrderPreview} />
    </div>
  );
}
