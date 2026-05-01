"use client";

import Link from "next/link";
import { FilePlus2, Plus } from "lucide-react";

import { OsClosureDialog } from "@/components/service-orders/os-closure-dialog";
import { OsEditDialog } from "@/components/service-orders/os-edit-dialog";
import { OsSettleDialog } from "@/components/service-orders/os-settle-dialog";
import { OsStatusModal } from "@/components/service-orders/os-status-modal";
import { OsViewDialog } from "@/components/service-orders/os-view-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useOsPage } from "@/hooks/use-os-page";

type ServiceOrdersPageContentProps = {
  title: string;
  fixedBillingFilter?: "ABERTAS" | "FATURADAS" | "PAGAS";
};

export function ServiceOrdersPageContent({ title, fixedBillingFilter }: ServiceOrdersPageContentProps) {
  const p = useOsPage({ fixedBillingFilter });
  const statusOpts = [...p.statusFilterOptions];
  const allowClosureGrouping = fixedBillingFilter === "ABERTAS";

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        subtitle={
          p.selectedUnitId && p.currentUnit
            ? `Acompanhe as OS da unidade ${p.currentUnit.name}.`
            : "Acompanhe as OS de todas as unidades."
        }
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/ordens-de-servico/fechamentos">
              <Button variant="outline">OS de fechamento</Button>
            </Link>
            {allowClosureGrouping ? (
              <Button variant={p.groupByCustomer ? "default" : "outline"} onClick={() => p.setGroupByCustomer((c) => !c)}>
                {p.groupByCustomer ? "Visão individual" : "Unificar por cliente/mês"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={p.clearFilters}>
              Excluir filtros
            </Button>
            <Link href="/ordens-de-servico/nova?standalone=1">
              <Button variant="outline">
                <FilePlus2 className="mr-2 h-4 w-4" />
                OS avulsa
              </Button>
            </Link>
            <Link href={p.queryClientId ? `/ordens-de-servico/nova?clientId=${p.queryClientId}` : "/ordens-de-servico/nova"}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova OS
              </Button>
            </Link>
          </div>
        }
      />
      <div className="surface-card space-y-5 overflow-x-auto p-6 [&_td:last-child>div]:flex-nowrap [&_td:last-child]:whitespace-nowrap">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={p.selectedUnitId === "" ? "default" : "outline"}
            onClick={() => p.setSelectedUnitId("")}
          >
            Geral
          </Button>
          {p.units.map((unit) => (
            <Button
              key={unit.id}
              size="sm"
              variant={p.selectedUnitId === unit.id ? "default" : "outline"}
              onClick={() => p.setSelectedUnitId(unit.id)}
            >
              {unit.name}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <SearchableSelect
            value={p.customerFilter}
            onChange={(v) => {
              p.setCustomerFilter(v);
              p.setPage(1);
            }}
            placeholder="Filtrar por cliente"
            options={p.customerOptions}
          />
          <SearchableSelect
            value={p.statusFilter}
            onChange={(v) => {
              p.setStatusFilter(v);
              p.setPage(1);
            }}
            placeholder="Filtrar por status"
            options={statusOpts}
          />
          <SearchableSelect
            value={p.serviceFilter}
            onChange={p.setServiceFilter}
            placeholder="Filtrar por serviço"
            options={p.serviceOptions}
          />
        </div>
        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={p.datePreset === "all" ? "default" : "outline"} onClick={() => p.setDatePreset("all")}>
              Todo periodo
            </Button>
            <Button size="sm" variant={p.datePreset === "today" ? "default" : "outline"} onClick={() => p.setDatePreset("today")}>
              Hoje
            </Button>
            <Button
              size="sm"
              variant={p.datePreset === "yesterday" ? "default" : "outline"}
              onClick={() => p.setDatePreset("yesterday")}
            >
              Ontem
            </Button>
            <Button size="sm" variant={p.datePreset === "custom" ? "default" : "outline"} onClick={() => p.setDatePreset("custom")}>
              Personalizado
            </Button>
          </div>
          {p.datePreset === "custom" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <DatePicker value={p.customFrom} onChange={p.setCustomFrom} />
              <DatePicker value={p.customTo} onChange={p.setCustomTo} />
            </div>
          ) : null}
        </div>
        {p.groupByCustomer ? (
          <DataTable
            data={p.groupedOrders}
            pageSize={10}
            isLoading={p.unitLoading || !p.hydrated}
            searchPlaceholder="Buscar por cliente"
            searchKeys={p.groupedOrdersSearchKeys}
            columns={p.groupedTableColumns.map((col) => ({
              ...col,
              className: (col as { className?: string }).className ?? "px-4",
            }))}
          />
        ) : (
          <DataTable
            data={p.filteredOrders}
            pageSize={10}
            isLoading={p.unitLoading || !p.hydrated}
            totalItems={p.meta?.total}
            searchValue={p.search}
            onSearchChange={(v) => {
              p.setSearch(v);
              p.setPage(1);
            }}
            manualPagination={{ page: p.meta?.page ?? p.page, totalPages: p.meta?.totalPages ?? 1, onPageChange: p.setPage }}
            searchPlaceholder="Buscar por número ou cliente"
            searchKeys={p.filteredOrdersSearchKeys}
            columns={p.filteredTableColumns.map((col) => ({
              ...col,
              className: (col as { className?: string }).className ?? "px-4",
            }))}
          />
        )}
      </div>
      <OsViewDialog order={p.viewOrder} onClose={() => p.setViewOrder(null)} />
      <OsEditDialog
        order={p.editOrder}
        editableData={p.editableData}
        setEditableData={p.setEditableData}
        editableServices={p.editableServices}
        setEditableServices={p.setEditableServices}
        editableProducts={p.editableProducts}
        setEditableProducts={p.setEditableProducts}
        customerOptions={p.customerOptions}
        unitOptions={p.unitOptions}
        onClose={() => p.setEditOrder(null)}
        onSave={() => void p.handleSaveEdit()}
      />
      <OsSettleDialog
        order={p.settleOrder}
        onClose={() => p.setSettleOrder(null)}
        onConfirm={async (id, paymentMethod) => {
          await p.handleStatusChange(id, "settle", paymentMethod ? { paymentMethod } : undefined);
        }}
      />
      <ConfirmModal
        open={Boolean(p.billOrder)}
        onOpenChange={(open) => {
          if (!open) {
            p.setBillOrder(null);
          }
        }}
        title="Confirmar faturamento da OS"
        description={`Deseja faturar ${p.billOrder?.number ?? "esta OS"} e gerar o recebível?`}
        onConfirm={() => {
          if (p.billOrder) {
            void p.handleStatusChange(p.billOrder.id, "bill");
          }
        }}
        confirmLabel={p.billOrder ? (p.statusLoadingByOrderId[p.billOrder.id] ? "Faturando..." : "Faturar OS") : "Faturar OS"}
        cancelLabel="Cancelar"
        confirmDisabled={p.billOrder ? Boolean(p.statusLoadingByOrderId[p.billOrder.id]) : false}
      />
      <OsStatusModal order={p.statusOrder} onClose={() => p.setStatusOrder(null)} onConfirm={p.handleStatusUpdate} />
      <OsClosureDialog
        row={p.closureRow}
        onClose={() => {
          p.setClosureRow(null);
          p.setSelectedClosureOrderIds([]);
        }}
        onConfirm={p.handleCreateClosure}
        availableOrders={p.closureAvailableOrders}
        selectedOrderIds={p.selectedClosureOrderIds}
        onToggleOrder={p.toggleClosureOrderSelection}
        paymentTerm={p.closurePaymentTerm}
        setPaymentTerm={p.setClosurePaymentTerm}
        dueDate={p.closureDueDate}
        setDueDate={p.setClosureDueDate}
      />
    </div>
  );
}
