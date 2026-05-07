"use client";

import type { FormEvent } from "react";
import { createElement, useCallback, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

import { OsViewDialog } from "@/components/service-orders/os-view-dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { useUnits } from "@/hooks/use-units";
import type { OrderDetails } from "@/hooks/use-os-page";
import { currency, date, formatCurrencyInput, parseCurrencyInput } from "@/lib/formatters";
import { serviceOrderFriendlyNumberLabel } from "@/lib/service-order-reference";

type AppliedFilters = {
  search: string;
  customerDocument: string;
  status: string;
  unitId: string;
  openedFrom: string;
  openedTo: string;
  minTotal?: number;
  maxTotal?: number;
};

const STATUS_OPTIONS = [
  { value: "Aberta", label: "Aberta" },
  { value: "Em andamento", label: "Em andamento" },
  { value: "Aguardando peça", label: "Aguardando peça" },
  { value: "Concluída", label: "Concluída" },
  { value: "Cancelada", label: "Cancelada" },
] as const;

export default function ConsultaOsPage() {
  const { units } = useUnits();
  const { download: downloadPdf } = usePdfDownload();

  const [search, setSearch] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [status, setStatus] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [openedFrom, setOpenedFrom] = useState("");
  const [openedTo, setOpenedTo] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(null);
  const [viewOrder, setViewOrder] = useState<OrderDetails | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const { orders, meta, hydrated } = useServiceOrders({
    page,
    limit: 10,
    search: appliedFilters?.search || undefined,
    customerDocument: appliedFilters?.customerDocument || undefined,
    status: appliedFilters?.status || undefined,
    unitId: appliedFilters?.unitId || undefined,
    openedFrom: appliedFilters?.openedFrom || undefined,
    openedTo: appliedFilters?.openedTo || undefined,
    minTotal: appliedFilters?.minTotal,
    maxTotal: appliedFilters?.maxTotal,
  });

  const searchKeys = useMemo<Array<(row: (typeof orders)[number]) => string>>(
    () => [(row) => row.number, (row) => row.clientName, (row) => row.servicesLabel],
    [],
  );

  const unitOptions = useMemo(
    () => [{ value: "", label: "Geral" }, ...units.map((unit) => ({ value: unit.id, label: unit.name }))],
    [units],
  );

  const handleSearch = useCallback(() => {
    setPage(1);
    setHasSearched(true);
    setAppliedFilters({
      search: search.trim(),
      customerDocument: customerDocument.trim(),
      status,
      unitId: selectedUnitId,
      openedFrom,
      openedTo,
      minTotal: minValue.trim() ? parseCurrencyInput(minValue) : undefined,
      maxTotal: maxValue.trim() ? parseCurrencyInput(maxValue) : undefined,
    });
  }, [customerDocument, maxValue, minValue, openedFrom, openedTo, search, selectedUnitId, status]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      handleSearch();
    },
    [handleSearch],
  );

  const handleClear = useCallback(() => {
    setSearch("");
    setCustomerDocument("");
    setStatus("");
    setSelectedUnitId("");
    setOpenedFrom("");
    setOpenedTo("");
    setMinValue("");
    setMaxValue("");
    setPage(1);
    setHasSearched(false);
    setAppliedFilters(null);
  }, []);

  const fetchOrder = useCallback(async (id: string) => {
    const response = await fetch(`/api/service-orders/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? "Nao foi possivel carregar a OS.");
    }
    return data.order as OrderDetails;
  }, []);

  const openView = useCallback(
    async (id: string) => {
      try {
        setViewOrder(await fetchOrder(id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar a OS.");
      }
    },
    [fetchOrder],
  );

  const handlePdfDownload = useCallback(
    async (id: string, number: string) => {
      setDownloadingPdfId(id);
      try {
        const [order, companyRes] = await Promise.all([
          fetchOrder(id),
          fetch("/api/company/public").then((r) => r.json() as Promise<{ company?: { name?: string } }>),
        ]);
        const companyName = companyRes.company?.name ?? "";

        if (number.startsWith("FEC-")) {
          const { FechamentoPdf } = await import("@/components/pdf/fechamento-pdf");
          await downloadPdf(
            createElement(FechamentoPdf, { order, companyName, unitName: order.unitName ?? "" }),
            `Fechamento-${number}`,
          );
          return;
        }

        const { OsPdf } = await import("@/components/pdf/os-pdf");
        await downloadPdf(createElement(OsPdf, { order, companyName, unitName: order.unitName ?? "" }), number);
      } catch {
        toast.error("Nao foi possivel gerar o PDF.");
      } finally {
        setDownloadingPdfId(null);
      }
    },
    [downloadPdf, fetchOrder],
  );

  return (
    <div className="space-y-8">
      <PageHeader title="Consulta de OS" />

      <form className="surface-card space-y-5 p-6" onSubmit={handleSubmit}>
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Numero da OS, cliente ou servico"
          />
          <Input
            value={customerDocument}
            onChange={(event) => setCustomerDocument(event.target.value)}
            placeholder="CPF/CNPJ"
          />
          <SearchableSelect value={status} onChange={setStatus} placeholder="Status" options={[...STATUS_OPTIONS]} />
          <SearchableSelect
            value={selectedUnitId}
            onChange={setSelectedUnitId}
            placeholder="Unidade"
            options={unitOptions}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <DatePicker value={openedFrom} onChange={setOpenedFrom} />
          <DatePicker value={openedTo} onChange={setOpenedTo} />
          <Input
            value={minValue}
            onChange={(event) => setMinValue(formatCurrencyInput(event.target.value))}
            placeholder="Valor minimo"
          />
          <Input
            value={maxValue}
            onChange={(event) => setMaxValue(formatCurrencyInput(event.target.value))}
            placeholder="Valor maximo"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClear}>
            Limpar
          </Button>
          <Button type="submit">Pesquisar</Button>
        </div>
      </form>

      {hasSearched ? (
        <div className="surface-card p-6">
          <DataTable
            data={orders}
            isLoading={!hydrated}
            pageSize={10}
            totalItems={meta?.total}
            manualPagination={{
              page: meta?.page ?? page,
              totalPages: meta?.totalPages ?? 1,
              onPageChange: setPage,
            }}
            searchPlaceholder="Buscar na listagem"
            searchKeys={searchKeys}
            emptyTitle="Nenhuma OS encontrada"
            emptyDescription="Ajuste os filtros e pesquise novamente."
            columns={[
              {
                key: "number",
                header: "Numero",
                render: (row) => <span className="font-medium">{serviceOrderFriendlyNumberLabel(row)}</span>,
              },
              { key: "unit", header: "Unidade", render: (row) => row.unitName ?? "Geral" },
              { key: "client", header: "Cliente", render: (row) => row.clientName },
              {
                key: "payment",
                header: "Pagamento",
                render: (row) =>
                  row.paymentStatus === "PAGO"
                    ? "Pago"
                    : row.paymentStatus === "PAGO_PARCIAL"
                      ? "Pago parcialmente"
                      : "Pendente",
              },
              { key: "total", header: "Valor total", render: (row) => currency(row.total) },
              { key: "openedAt", header: "Emissao", render: (row) => date(row.openedAt) },
              {
                key: "actions",
                header: "Acoes",
                render: (row) => (
                  <div className="flex flex-nowrap gap-2 whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => void openView(row.id)}>
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingPdfId === row.id}
                      onClick={() => void handlePdfDownload(row.id, row.number)}
                    >
                      <FileDown className="mr-1 h-4 w-4" />
                      {downloadingPdfId === row.id ? "..." : "PDF"}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      ) : null}

      <OsViewDialog order={viewOrder} onClose={() => setViewOrder(null)} />
    </div>
  );
}
