"use client";

import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardList, FileDown, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useEmployees } from "@/hooks/use-employees";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import { TABLE_PAGE_SIZE_OPTIONS, type TablePageSize, useTablePagination } from "@/hooks/use-table-pagination";
import { useUnits } from "@/hooks/use-units";
import { currency, date } from "@/lib/formatters";
import { defaultMonthToTodayRange, formatReportLocalDate } from "@/lib/report-dates";

export type EmployeeReportRow = {
  id: string;
  name: string;
  email: string;
  monthlyGoal: number | null;
  totalServices: number;
  totalValue: number;
  totalCommission: number;
  services: Array<{ orderNumber: string; date: string; description: string; value: number }>;
};

export type CompanyReport = {
  totalRevenue: number;
  totalReceivable: number;
  totalPayable: number;
  ordersOpened: number;
  ordersConcluded: number;
  byUnit: Array<{ unitName: string; revenue: number; ordersOpened: number; ordersConcluded: number }>;
  revenueByDay: Array<{ date: string; value: number }>;
};

export type UnsettledOrderRow = {
  id: string;
  number: string;
  type: "NORMAL" | "FECHAMENTO";
  clientName: string;
  unitName: string;
  openedAt: string;
  totalAmount: number;
  receivableAmount: number;
  receivableStatus: "PENDENTE" | "VENCIDO" | null;
  dueDate: string | null;
  reason:
    | "RECEBIVEL_PENDENTE"
    | "RECEBIVEL_VENCIDO"
    | "FECHAMENTO_ABERTO"
    | "FECHAMENTO_PARCIAL";
};

export type UnsettledSummary = {
  total: number;
  totalAmount: number;
  totalVencido: number;
  totalFechamento: number;
};

const EMPTY_EMPLOYEE_SERVICES: EmployeeReportRow["services"] = [];
const EMPTY_COMPANY_BY_UNIT: CompanyReport["byUnit"] = [];

function monthToTodayBounds() {
  const now = new Date();
  return {
    startDate: formatReportLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: formatReportLocalDate(now),
  };
}

export default function RelatoriosPage() {
  const { employees } = useEmployees();
  const { units } = useUnits();
  const { user } = useAuth();
  const { download: downloadPdf, isGenerating: isPdfGenerating } = usePdfDownload();
  const [downloadingEmpId, setDownloadingEmpId] = useState<string | null>(null);

  const [mainTab, setMainTab] = useState<"employees" | "company" | "unsettled">("employees");

  const [empPeriodMode, setEmpPeriodMode] = useState<"month" | "custom">("month");
  const [empStart, setEmpStart] = useState(() => defaultMonthToTodayRange().startDate);
  const [empEnd, setEmpEnd] = useState(() => defaultMonthToTodayRange().endDate);
  const [empEmployeeId, setEmpEmployeeId] = useState("");

  const [coPeriodMode, setCoPeriodMode] = useState<"month" | "custom">("month");
  const [coStart, setCoStart] = useState(() => defaultMonthToTodayRange().startDate);
  const [coEnd, setCoEnd] = useState(() => defaultMonthToTodayRange().endDate);
  const [coUnitId, setCoUnitId] = useState("");

  const [empRows, setEmpRows] = useState<EmployeeReportRow[]>([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [coData, setCoData] = useState<CompanyReport | null>(null);
  const [coLoading, setCoLoading] = useState(false);
  const [detailRow, setDetailRow] = useState<EmployeeReportRow | null>(null);

  const [unsettledRows, setUnsettledRows] = useState<UnsettledOrderRow[]>([]);
  const [unsettledSummary, setUnsettledSummary] = useState<UnsettledSummary | null>(null);
  const [unsettledLoading, setUnsettledLoading] = useState(false);
  const [unsettledUnitId, setUnsettledUnitId] = useState("");

  const employeeOptions = useMemo(() => {
    const opts = [{ value: "", label: "Todos os funcionários" }];
    for (const e of employees) {
      opts.push({ value: e.id, label: e.nomeCompleto });
    }
    return opts;
  }, [employees]);

  const unitOptions = useMemo(() => {
    const opts = [{ value: "", label: "Todas as unidades" }];
    for (const u of units) {
      opts.push({ value: u.id, label: u.name });
    }
    return opts;
  }, [units]);

  useEffect(() => {
    if (empPeriodMode === "month") {
      const b = monthToTodayBounds();
      setEmpStart(b.startDate);
      setEmpEnd(b.endDate);
    }
  }, [empPeriodMode]);

  useEffect(() => {
    if (coPeriodMode === "month") {
      const b = monthToTodayBounds();
      setCoStart(b.startDate);
      setCoEnd(b.endDate);
    }
  }, [coPeriodMode]);

  const fetchEmployeesReport = useCallback(async () => {
    setEmpLoading(true);
    try {
      const qs = new URLSearchParams({ startDate: empStart, endDate: empEnd });
      if (empEmployeeId) {
        qs.set("employeeId", empEmployeeId);
      }
      const res = await fetch(`/api/reports/employees?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível carregar o relatório.");
        setEmpRows([]);
        return;
      }
      setEmpRows(data.employees ?? []);
    } catch {
      toast.error("Não foi possível carregar o relatório.");
      setEmpRows([]);
    } finally {
      setEmpLoading(false);
    }
  }, [empStart, empEnd, empEmployeeId]);

  const fetchCompanyReport = useCallback(async () => {
    setCoLoading(true);
    try {
      const qs = new URLSearchParams({ startDate: coStart, endDate: coEnd });
      if (coUnitId) {
        qs.set("unitId", coUnitId);
      }
      const res = await fetch(`/api/reports/company?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível carregar o relatório.");
        setCoData(null);
        return;
      }
      setCoData(data as CompanyReport);
    } catch {
      toast.error("Não foi possível carregar o relatório.");
      setCoData(null);
    } finally {
      setCoLoading(false);
    }
  }, [coStart, coEnd, coUnitId]);

  const fetchUnsettledOrders = useCallback(async () => {
    setUnsettledLoading(true);
    try {
      const qs = new URLSearchParams();
      if (unsettledUnitId) {
        qs.set("unitId", unsettledUnitId);
      }
      const res = await fetch(`/api/reports/unsettled-orders?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível carregar.");
        setUnsettledRows([]);
        setUnsettledSummary(null);
        return;
      }
      setUnsettledRows(data.orders ?? []);
      setUnsettledSummary(data.summary ?? null);
    } catch {
      toast.error("Não foi possível carregar.");
      setUnsettledRows([]);
      setUnsettledSummary(null);
    } finally {
      setUnsettledLoading(false);
    }
  }, [unsettledUnitId]);

  useEffect(() => {
    if (mainTab === "employees") {
      void fetchEmployeesReport();
    }
  }, [mainTab, fetchEmployeesReport]);

  useEffect(() => {
    if (mainTab === "company") {
      void fetchCompanyReport();
    }
  }, [mainTab, fetchCompanyReport]);

  useEffect(() => {
    if (mainTab === "unsettled") {
      void fetchUnsettledOrders();
    }
  }, [mainTab, fetchUnsettledOrders]);

  async function getCompanyName(): Promise<string> {
    try {
      const res = await fetch("/api/company/public");
      const data = await res.json() as { company?: { name?: string } };
      return data.company?.name ?? "";
    } catch {
      return "";
    }
  }

  const handleEmployeePdfDownload = useCallback(
    async (employee: EmployeeReportRow) => {
      setDownloadingEmpId(employee.id);
      try {
        const companyName = await getCompanyName();
        const { EmployeeReportPdf } = await import("@/components/pdf/employee-report-pdf");
        await downloadPdf(
          createElement(EmployeeReportPdf, { employee, companyName, startDate: empStart, endDate: empEnd }),
          `Relatorio-${employee.name.replace(/\s+/g, "-")}`,
        );
      } catch {
        toast.error("Não foi possível gerar o PDF.");
      } finally {
        setDownloadingEmpId(null);
      }
    },
    [downloadPdf, empStart, empEnd],
  );

  const handleEmployeesSummaryPdfDownload = useCallback(async () => {
    try {
      const companyName = await getCompanyName();
      const { EmployeesSummaryPdf } = await import("@/components/pdf/employees-summary-pdf");
      await downloadPdf(
        createElement(EmployeesSummaryPdf, { employees: empRows, companyName, startDate: empStart, endDate: empEnd }),
        "Relatorio-Geral-Funcionarios",
      );
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  }, [downloadPdf, empRows, empStart, empEnd]);

  const handleCompanyPdfDownload = useCallback(async () => {
    if (!coData) return;
    try {
      const companyName = await getCompanyName();
      const selectedUnit = units.find((u) => u.id === coUnitId);
      const unitName = selectedUnit ? selectedUnit.name : "Todas as unidades";
      const { CompanyReportPdf } = await import("@/components/pdf/company-report-pdf");
      await downloadPdf(
        createElement(CompanyReportPdf, {
          report: coData,
          companyName,
          unitName,
          startDate: coStart,
          endDate: coEnd,
        }),
        "Relatorio-Empresa",
      );
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  }, [downloadPdf, coData, coStart, coEnd, coUnitId, units]);

  const detailTableData = detailRow?.services ?? EMPTY_EMPLOYEE_SERVICES;
  const detailPagination = useTablePagination(detailTableData);

  const unitTableData = coData?.byUnit ?? EMPTY_COMPANY_BY_UNIT;
  const unitPagination = useTablePagination(unitTableData);

  const chartData = useMemo(() => {
    if (!coData?.revenueByDay?.length) {
      return [];
    }
    return coData.revenueByDay.map((row) => ({
      ...row,
      label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(
        new Date(`${row.date}T12:00:00`),
      ),
    }));
  }, [coData]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Relatórios"
        subtitle="Analise desempenho por funcionário e indicadores consolidados da empresa."
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={mainTab === "employees" ? "default" : "outline"} onClick={() => setMainTab("employees")}>
          <Users className="mr-2 h-4 w-4" />
          Funcionários
        </Button>
        <Button size="sm" variant={mainTab === "company" ? "default" : "outline"} onClick={() => setMainTab("company")}>
          Empresa
        </Button>
        <Button
          size="sm"
          variant={mainTab === "unsettled" ? "default" : "outline"}
          onClick={() => setMainTab("unsettled")}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          Não baixadas
        </Button>
      </div>

      {mainTab === "employees" ? (
        <div className="space-y-6">
          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={empPeriodMode === "month" ? "default" : "outline"}
                  onClick={() => setEmpPeriodMode("month")}
                >
                  Mês atual
                </Button>
                <Button
                  size="sm"
                  variant={empPeriodMode === "custom" ? "default" : "outline"}
                  onClick={() => setEmpPeriodMode("custom")}
                >
                  Período personalizado
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Funcionário</span>
                  <SearchableSelect
                    value={empEmployeeId}
                    onChange={setEmpEmployeeId}
                    placeholder="Selecione"
                    options={employeeOptions}
                  />
                </div>
                {empPeriodMode === "custom" ? (
                  <>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">De</span>
                      <DatePicker value={empStart} onChange={setEmpStart} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">Até</span>
                      <DatePicker value={empEnd} onChange={setEmpEnd} />
                    </div>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void fetchEmployeesReport()}>
                  Atualizar
                </Button>
                {user?.accessLevel === "PROPRIETARIO" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPdfGenerating}
                    onClick={() => void handleEmployeesSummaryPdfDownload()}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {isPdfGenerating ? "Gerando..." : "PDF Geral"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="surface-card p-6">
            <DataTable
              data={empRows}
              pageSize={10}
              isLoading={empLoading}
              searchPlaceholder="Buscar por nome ou e-mail"
              searchKeys={[(row) => `${row.name} ${row.email}`]}
              emptyTitle="Nenhum dado no período"
              emptyDescription="Ajuste os filtros ou verifique se há serviços executados registrados."
              columns={[
                { key: "name", header: "Nome", render: (row) => <span className="font-medium">{row.name}</span> },
                {
                  key: "goal",
                  header: "Meta mensal",
                  render: (row) => (row.monthlyGoal != null ? currency(row.monthlyGoal) : "—"),
                },
                { key: "services", header: "Serviços executados", render: (row) => String(row.totalServices) },
                { key: "value", header: "Valor gerado", render: (row) => currency(row.totalValue) },
                {
                  key: "totalCommission",
                  header: "Comissão",
                  render: (row) => currency(row.totalCommission),
                },
                {
                  key: "pct",
                  header: "% da meta",
                  render: (row) =>
                    row.monthlyGoal != null && row.monthlyGoal > 0
                      ? `${((row.totalValue / row.monthlyGoal) * 100).toFixed(1)}%`
                      : "—",
                },
                {
                  key: "actions",
                  header: "Ações",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setDetailRow(row)}>
                        Ver detalhes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingEmpId === row.id}
                        onClick={() => void handleEmployeePdfDownload(row)}
                      >
                        <FileDown className="mr-1 h-4 w-4" />
                        {downloadingEmpId === row.id ? "..." : "PDF"}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      ) : mainTab === "company" ? (
        <div className="space-y-6">
          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={coPeriodMode === "month" ? "default" : "outline"}
                  onClick={() => setCoPeriodMode("month")}
                >
                  Mês atual
                </Button>
                <Button
                  size="sm"
                  variant={coPeriodMode === "custom" ? "default" : "outline"}
                  onClick={() => setCoPeriodMode("custom")}
                >
                  Período personalizado
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Unidade</span>
                  <SearchableSelect value={coUnitId} onChange={setCoUnitId} placeholder="Selecione" options={unitOptions} />
                </div>
                {coPeriodMode === "custom" ? (
                  <>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">De</span>
                      <DatePicker value={coStart} onChange={setCoStart} />
                    </div>
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">Até</span>
                      <DatePicker value={coEnd} onChange={setCoEnd} />
                    </div>
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void fetchCompanyReport()}>
                  Atualizar
                </Button>
                {coData && (user?.accessLevel === "PROPRIETARIO" || user?.accessLevel === "GESTOR") ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPdfGenerating}
                    onClick={() => void handleCompanyPdfDownload()}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    {isPdfGenerating ? "Gerando..." : "PDF"}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {coData ? (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {(
                  [
                    ["Faturamento do período", currency(coData.totalRevenue)],
                    ["A receber", currency(coData.totalReceivable)],
                    ["A pagar", currency(coData.totalPayable)],
                    ["OS abertas", String(coData.ordersOpened)],
                    ["OS concluídas", String(coData.ordersConcluded)],
                  ] as const
                ).map(([title, val]) => (
                  <Card key={title} className="surface-card border-none">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground">{title}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{val}</p>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <Card className="surface-card border-none">
                <CardHeader>
                  <CardTitle>Faturamento por dia</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value) => currency(Number(value ?? 0))} />
                        <Bar dataKey="value" name="Faturamento" radius={[10, 10, 0, 0]} fill="var(--color-gold)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem recebíveis pagos no período.</p>
                  )}
                </CardContent>
              </Card>

              {coData.byUnit.length > 1 ? (
                <Card className="surface-card border-none">
                  <CardHeader>
                    <CardTitle>Por unidade</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead className="text-left text-muted-foreground">
                          <tr>
                            <th className="pb-3 font-medium">Unidade</th>
                            <th className="pb-3 font-medium">Faturamento</th>
                            <th className="pb-3 font-medium">OS abertas</th>
                            <th className="pb-3 font-medium">OS concluídas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unitPagination.paginatedData.map((u) => (
                            <tr key={u.unitName} className="border-t">
                              <td className="py-3 font-medium">{u.unitName}</td>
                              <td className="py-3">{currency(u.revenue)}</td>
                              <td className="py-3">{u.ordersOpened}</td>
                              <td className="py-3">{u.ordersConcluded}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="whitespace-nowrap">Linhas por página</span>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none"
                          value={unitPagination.pageSize}
                          onChange={(e) =>
                            unitPagination.setPageSize(Number(e.target.value) as TablePageSize)
                          }
                        >
                          {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Página {unitPagination.page} de {unitPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          onClick={() =>
                            unitPagination.setPage((p) => Math.max(1, p - 1))
                          }
                          disabled={unitPagination.page === 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            unitPagination.setPage((p) =>
                              Math.min(unitPagination.totalPages, p + 1),
                            )
                          }
                          disabled={unitPagination.page === unitPagination.totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{coLoading ? "Carregando..." : "Sem dados."}</p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Unidade</span>
                  <SearchableSelect
                    value={unsettledUnitId}
                    onChange={setUnsettledUnitId}
                    placeholder="Selecione"
                    options={unitOptions}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void fetchUnsettledOrders()}>
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ["OS não baixadas", String(unsettledSummary?.total ?? 0)],
                ["Valor em aberto", currency(unsettledSummary?.totalAmount ?? 0)],
                ["Vencidas", String(unsettledSummary?.totalVencido ?? 0)],
                ["Fechamentos abertos", String(unsettledSummary?.totalFechamento ?? 0)],
              ] as const
            ).map(([title, val]) => (
              <Card key={title} className="surface-card border-none">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{val}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <div className="surface-card p-6">
            <DataTable
              data={unsettledRows}
              pageSize={10}
              isLoading={unsettledLoading}
              searchPlaceholder="Buscar por número ou cliente"
              searchKeys={[(row) => `${row.number} ${row.clientName}`]}
              emptyTitle="Nenhuma OS não baixada"
              emptyDescription="Todas as OS foram quitadas ou não há registros."
              columns={[
                {
                  key: "number",
                  header: "Número",
                  render: (row) => (
                    <span className="inline-flex items-center gap-2 font-medium">
                      {row.number}
                      {row.type === "FECHAMENTO" ? (
                        <Badge variant="secondary" className="font-normal">
                          Fechamento
                        </Badge>
                      ) : null}
                    </span>
                  ),
                },
                { key: "client", header: "Cliente", render: (row) => row.clientName },
                { key: "unit", header: "Unidade", render: (row) => row.unitName },
                { key: "opened", header: "Abertura", render: (row) => date(row.openedAt) },
                {
                  key: "due",
                  header: "Vencimento",
                  render: (row) => (row.dueDate ? date(row.dueDate) : "—"),
                },
                {
                  key: "openAmount",
                  header: "Valor em aberto",
                  render: (row) => currency(row.receivableAmount),
                },
                {
                  key: "recvStatus",
                  header: "Status",
                  render: (row) => (
                    <StatusBadge
                      status={row.receivableStatus === "VENCIDO" ? "Vencido" : "Pendente"}
                    />
                  ),
                },
                {
                  key: "reason",
                  header: "Motivo",
                  render: (row) => (
                    <span className="text-sm text-muted-foreground">
                      {row.reason === "RECEBIVEL_VENCIDO"
                        ? "Vencido"
                        : row.reason === "FECHAMENTO_ABERTO"
                          ? "Fechamento aberto"
                          : row.reason === "FECHAMENTO_PARCIAL"
                            ? "Fechamento parcial"
                            : "Pendente"}
                    </span>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      <Dialog open={detailRow !== null} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Serviços executados — {detailRow?.name}</DialogTitle>
            <DialogDescription>Itens vinculados ao funcionário no período filtrado.</DialogDescription>
            {detailRow && (user?.accessLevel === "PROPRIETARIO" || user?.accessLevel === "GESTOR") ? (
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={downloadingEmpId === detailRow.id}
                  onClick={() => void handleEmployeePdfDownload(detailRow)}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  {downloadingEmpId === detailRow.id ? "Gerando..." : "Baixar PDF"}
                </Button>
              </div>
            ) : null}
          </DialogHeader>
          {detailRow ? (
            <div className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="pb-3 font-medium">OS</th>
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Descrição</th>
                      <th className="pb-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailPagination.paginatedData.map((s, i) => (
                      <tr
                        key={`${s.orderNumber}-${s.date}-${(detailPagination.page - 1) * detailPagination.pageSize + i}`}
                        className="border-t"
                      >
                        <td className="py-3 font-medium">{s.orderNumber}</td>
                        <td className="py-3">{date(s.date)}</td>
                        <td className="py-3">{s.description}</td>
                        <td className="py-3">{currency(s.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">Linhas por página</span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none"
                    value={detailPagination.pageSize}
                    onChange={(e) =>
                      detailPagination.setPageSize(Number(e.target.value) as TablePageSize)
                    }
                  >
                    {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {detailPagination.page} de {detailPagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      detailPagination.setPage((p) => Math.max(1, p - 1))
                    }
                    disabled={detailPagination.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      detailPagination.setPage((p) =>
                        Math.min(detailPagination.totalPages, p + 1),
                      )
                    }
                    disabled={detailPagination.page === detailPagination.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
