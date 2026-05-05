"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, CircleDollarSign, ClipboardList, Percent, Wallet, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { OsStatsCards } from "@/components/dashboard/os-stats-cards";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useDashboardOsStats } from "@/hooks/use-dashboard-os-stats";
import { useDebounce } from "@/hooks/use-debounce";
import { useReceivables } from "@/hooks/use-receivables";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { currency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { isFirstSevenDaysOfMonth } from "@/lib/report-dates";

/** Título curto da OS a partir da descrição do recebível (ex.: parcelas "OS-1 (2/3)" → "OS-1"). */
function receivableOsTitle(description: string): string {
  const trimmed = description.trim();
  const paren = trimmed.indexOf(" (");
  return paren === -1 ? trimmed : trimmed.slice(0, paren).trim();
}

function getMonthPrefixLocal(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getTodayLocalIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthStartLocalIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

type EmployeeReportRow = {
  totalValue: number;
  totalCommission: number;
  monthlyGoal: number | null;
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isFuncionario = user?.accessLevel === "FUNCIONARIO";
  const { unitId, currentUnit, isLoading: unitLoading } = useCurrentUnit();
  const debouncedUnitId = useDebounce(unitId, 300);
  const selectedUnitId = debouncedUnitId || undefined;
  const period = getMonthPrefixLocal();
  const previousPeriodDate = new Date();
  previousPeriodDate.setMonth(previousPeriodDate.getMonth() - 1);
  const previousPeriod = getMonthPrefixLocal(previousPeriodDate);

  const { orders, hydrated: ordersHydrated } = useServiceOrders({ unitId: debouncedUnitId });
  const { coletadas, faturadas, emCaixa, totalProduzido, hydrated: osStatsHydrated } = useDashboardOsStats(selectedUnitId);
  const { receivables, hydrated: receivablesHydrated } = useReceivables({ unitId: debouncedUnitId, period });

  const showReportBanner = isFirstSevenDaysOfMonth();
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthRaw = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(previousMonthDate);
  const previousMonthLabel = previousMonthRaw.charAt(0).toUpperCase() + previousMonthRaw.slice(1);

  const dismissStorageKey = `report-badge-dismissed-${previousPeriod}`;
  const [reportBadgeDismissed, setReportBadgeDismissed] = useState<boolean | null>(null);

  const [employeeRow, setEmployeeRow] = useState<EmployeeReportRow | null>(null);
  const [employeeReportHydrated, setEmployeeReportHydrated] = useState(false);

  const [generatedChart, setGeneratedChart] = useState<Array<{ day: string; revenue: number }>>([]);
  const [generatedChartHydrated, setGeneratedChartHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setReportBadgeDismissed(window.localStorage.getItem(dismissStorageKey) === "true");
  }, [dismissStorageKey]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isFuncionario) {
      setEmployeeRow(null);
      setEmployeeReportHydrated(true);
      return;
    }
    if (!user?.id) {
      setEmployeeRow(null);
      setEmployeeReportHydrated(true);
      return;
    }

    let active = true;
    setEmployeeReportHydrated(false);
    const params = new URLSearchParams({
      startDate: getMonthStartLocalIso(),
      endDate: getTodayLocalIso(),
      employeeId: user.id,
    });
    if (debouncedUnitId) {
      params.set("unitId", debouncedUnitId);
    }

    fetch(`/api/reports/employees?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar desempenho.");
        }
        return data;
      })
      .then((data) => {
        if (!active) {
          return;
        }
        const row = data.employees?.[0] as EmployeeReportRow | undefined;
        setEmployeeRow(
          row
            ? {
                totalValue: Number(row.totalValue ?? 0),
                totalCommission: Number(row.totalCommission ?? 0),
                monthlyGoal: row.monthlyGoal == null ? null : Number(row.monthlyGoal),
              }
            : {
                totalValue: 0,
                totalCommission: 0,
                monthlyGoal: null,
              },
        );
      })
      .catch(() => {
        if (active) {
          setEmployeeRow({ totalValue: 0, totalCommission: 0, monthlyGoal: null });
        }
      })
      .finally(() => {
        if (active) {
          setEmployeeReportHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, isFuncionario, user?.id, debouncedUnitId]);

  useEffect(() => {
    if (isFuncionario) {
      setGeneratedChart([]);
      setGeneratedChartHydrated(true);
      return;
    }

    let active = true;
    setGeneratedChartHydrated(false);
    const params = new URLSearchParams({ days: "7" });
    if (debouncedUnitId) {
      params.set("unitId", debouncedUnitId);
    }

    fetch(`/api/dashboard/generated-revenue?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar série.");
        }
        return data as { series?: Array<{ dayLabel: string; total: number }> };
      })
      .then((data) => {
        if (!active) {
          return;
        }
        const rows = data.series ?? [];
        setGeneratedChart(
          rows.map((s) => ({
            day: s.dayLabel,
            revenue: Number(s.total ?? 0),
          })),
        );
      })
      .catch(() => {
        if (active) {
          setGeneratedChart([]);
        }
      })
      .finally(() => {
        if (active) {
          setGeneratedChartHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [isFuncionario, debouncedUnitId]);

  const today = getTodayLocalIso();
  const openedToday = orders.filter((order) => order.openedAt === today && order.status !== "Cancelada").length;

  const latestOrders = orders
    .filter((order) => !order.number.startsWith("FEC-"))
    .slice(0, 5);
  const hasHistory = receivables.length > 0 || orders.length > 0;

  const dueTodayReceivables = useMemo(
    () =>
      receivables
        .filter((item) => item.dueDate === today && item.status !== "Pago")
        .slice(0, 8),
    [receivables, today],
  );

  const hydrated =
    !unitLoading &&
    ordersHydrated &&
    employeeReportHydrated &&
    (!isFuncionario ? receivablesHydrated && osStatsHydrated : true);

  const metaPercentLabel =
    employeeRow == null ||
    employeeRow.monthlyGoal == null ||
    employeeRow.monthlyGoal <= 0
      ? "Sem meta definida"
      : `${((employeeRow.totalValue / employeeRow.monthlyGoal) * 100).toFixed(1)}%`;

  const showReportBadge =
    !isFuncionario && showReportBanner && reportBadgeDismissed === false;

  function dismissReportBadge() {
    window.localStorage.setItem(dismissStorageKey, "true");
    setReportBadgeDismissed(true);
  }

  return (
    <div className="space-y-8">
      {showReportBadge ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.12)] p-5 dark:bg-[rgba(201,168,76,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-gold-dark)] dark:text-[var(--color-gold-light)]">
              Relatório de {previousMonthLabel} disponível
            </p>
            <p className="mt-1 text-sm text-foreground/70">
              Consulte indicadores da empresa e o desempenho por funcionário.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/relatorios"
              className={cn(
                buttonVariants({ size: "default" }),
                "border border-[rgba(201,168,76,0.45)] bg-[var(--color-gold)] text-[var(--color-navy)] no-underline hover:bg-[var(--color-gold-light)]",
              )}
            >
              Ver relatório
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:bg-[rgba(201,168,76,0.15)] hover:text-foreground"
              aria-label="Dispensar"
              onClick={dismissReportBadge}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <PageHeader
        title="Dashboard"
        subtitle={
          isFuncionario
            ? currentUnit
              ? `Seu desempenho na unidade ${currentUnit.name}.`
              : "Seu desempenho na operação."
            : currentUnit
              ? `Visão rápida da unidade ${currentUnit.name}, com foco em OS e saúde financeira.`
              : "Visão rápida da operação da unidade selecionada."
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isFuncionario ? (
          <>
            <StatCard
              title="Valor gerado"
              value={currency(employeeRow?.totalValue ?? 0)}
              icon={CircleDollarSign}
              trend="none"
            />
            <StatCard title="% da meta" value={metaPercentLabel} icon={Percent} trend="none" />
            <StatCard
              title="Comissão do mês"
              value={currency(employeeRow?.totalCommission ?? 0)}
              icon={Wallet}
              trend="none"
            />
            <StatCard title="OS abertas hoje" value={String(openedToday)} icon={ClipboardList} trend="none" />
          </>
        ) : (
          <>
            <OsStatsCards
              coletadas={coletadas}
              faturadas={faturadas}
              emCaixa={emCaixa}
              totalProduzido={totalProduzido}
            />
            <StatCard
              title="OS abertas hoje"
              value={String(openedToday)}
              icon={ClipboardList}
              trend={hasHistory ? "up" : "none"}
              compact
            />
          </>
        )}
      </section>

      <section className="space-y-6">
        <div
          className={cn(
            "grid gap-6",
            !isFuncionario && "xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)] xl:items-stretch",
          )}
        >
          <Card className="surface-card flex h-full min-h-0 flex-col border-none">
            <CardHeader className="shrink-0">
              <CardTitle>Últimas ordens de serviço</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-x-auto">
              {!hydrated || latestOrders.length ? (
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="pb-3 font-medium">Número</th>
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestOrders.map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="py-4 font-medium">{order.number}</td>
                        <td>{order.clientName}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td>{currency(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="Nenhuma OS registrada"
                  description="Quando a unidade começar a abrir ordens de serviço, elas aparecem aqui."
                />
              )}
            </CardContent>
          </Card>

          {!isFuncionario ? (
            <Card className="surface-card flex h-full min-h-0 min-w-0 flex-col border-none">
              <CardHeader className="shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  Contas vencendo hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col pb-5 pt-0">
                {dueTodayReceivables.length ? (
                  <div className="max-h-[240px] space-y-0 overflow-y-auto overflow-x-hidden pr-0.5">
                    {dueTodayReceivables.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 border-b border-border/80 py-2 last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-tight">
                            {receivableOsTitle(item.description)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground leading-tight">{item.clientName}</p>
                        </div>
                        <div className="shrink-0 self-center text-xs font-semibold tabular-nums sm:text-sm">
                          {currency(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[8rem] flex-1 flex-col items-center justify-center px-1 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma conta com vencimento hoje nesta unidade.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {!isFuncionario ? (
          <Card className="surface-card w-full max-w-none border-none">
            <CardHeader>
              <CardTitle>Valor gerado nos últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] w-full px-2 sm:px-6">
              {generatedChartHydrated ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={generatedChart}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => currency(Number(value ?? 0))} />
                    <Bar
                      dataKey="revenue"
                      name="Valor gerado"
                      radius={[10, 10, 0, 0]}
                      fill="var(--color-gold)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Carregando gráfico...
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
