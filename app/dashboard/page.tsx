"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CircleDollarSign, ClipboardList, Percent, Wallet, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useDebounce } from "@/hooks/use-debounce";
import { usePayables } from "@/hooks/use-payables";
import { useReceivables } from "@/hooks/use-receivables";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { currency, date } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { isFirstSevenDaysOfMonth } from "@/lib/report-dates";

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
  const period = getMonthPrefixLocal();
  const previousPeriodDate = new Date();
  previousPeriodDate.setMonth(previousPeriodDate.getMonth() - 1);
  const previousPeriod = getMonthPrefixLocal(previousPeriodDate);

  const { orders, hydrated: ordersHydrated } = useServiceOrders({ unitId: debouncedUnitId });
  const { receivables, hydrated: receivablesHydrated } = useReceivables({ unitId: debouncedUnitId, period });
  const { payables, hydrated: payablesHydrated } = usePayables({ unitId: debouncedUnitId, period });
  const { receivables: previousReceivables } = useReceivables({ unitId: debouncedUnitId, period: previousPeriod });
  const { payables: previousPayables } = usePayables({ unitId: debouncedUnitId, period: previousPeriod });

  const showReportBanner = isFirstSevenDaysOfMonth();
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthRaw = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(previousMonthDate);
  const previousMonthLabel = previousMonthRaw.charAt(0).toUpperCase() + previousMonthRaw.slice(1);

  const dismissStorageKey = `report-badge-dismissed-${previousPeriod}`;
  const [reportBadgeDismissed, setReportBadgeDismissed] = useState<boolean | null>(null);

  const [employeeRow, setEmployeeRow] = useState<EmployeeReportRow | null>(null);
  const [employeeReportHydrated, setEmployeeReportHydrated] = useState(false);

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

  const today = getTodayLocalIso();
  const openedToday = orders.filter((order) => order.openedAt === today && order.status !== "Cancelada").length;
  const receitaMes = receivables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);
  const totalReceber = receivables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);
  const totalPagar = payables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);

  const previousReceitaMes = previousReceivables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);
  const previousPagar = previousPayables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);

  const latestOrders = orders
    .filter((order) => !order.number.startsWith("FEC-"))
    .slice(0, 5);
  const warningsReceber = receivables.filter((item) => item.dueDate === today && item.status !== "Pago").slice(0, 3);
  const oldPendingOs = orders.filter((item) => item.status === "Em andamento" || item.status === "Aguardando peça").slice(0, 2);

  const revenueMap = new Map<string, number>();
  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - index);
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, "0");
    const dateDay = String(day.getDate()).padStart(2, "0");
    revenueMap.set(`${year}-${month}-${dateDay}`, 0);
  }
  receivables
    .filter((item) => item.status === "Pago")
    .forEach((item) => {
      if (revenueMap.has(item.dueDate)) {
        revenueMap.set(item.dueDate, (revenueMap.get(item.dueDate) ?? 0) + item.value);
      }
    });
  const dashboardRevenue = Array.from(revenueMap.entries()).map(([dateKey, revenue]) => ({
    day: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(`${dateKey}T00:00:00`)),
    revenue,
  }));

  const hasHistory = previousReceivables.length > 0 || previousPayables.length > 0;
  const financeHydrated = receivablesHydrated && payablesHydrated;
  const hydrated =
    !unitLoading &&
    ordersHydrated &&
    employeeReportHydrated &&
    (!isFuncionario ? financeHydrated : true);

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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <StatCard title="OS abertas hoje" value={String(openedToday)} icon={ClipboardList} trend={hasHistory ? "up" : "none"} />
            <StatCard
              title="Receita do mês"
              value={currency(receitaMes)}
              icon={CircleDollarSign}
              trend={hasHistory ? (receitaMes >= previousReceitaMes ? "up" : "down") : "none"}
            />
            <StatCard title="Contas a receber" value={currency(totalReceber)} icon={Wallet} trend={hasHistory ? "neutral" : "none"} />
            <StatCard
              title="Contas a pagar"
              value={currency(totalPagar)}
              icon={AlertTriangle}
              trend={hasHistory ? (totalPagar > previousPagar ? "down" : "neutral") : "none"}
            />
          </>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-6">
          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>Últimas ordens de serviço</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
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
            <Card className="surface-card border-none">
              <CardHeader>
                <CardTitle>Receita dos últimos 7 dias</CardTitle>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardRevenue}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => currency(Number(value ?? 0))} />
                    <Bar dataKey="revenue" name="Receita" radius={[10, 10, 0, 0]} fill="var(--color-gold)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {!isFuncionario ? (
            <Card className="surface-card border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[var(--color-gold-dark)]" />
                  Contas vencendo hoje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {warningsReceber.length ? (
                  warningsReceber.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-muted/40 p-4">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">{item.clientName}</p>
                      <p className="mt-2 text-sm font-semibold">{currency(item.value)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma conta vencendo hoje nesta unidade.</p>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>OS pendentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {oldPendingOs.length ? (
                oldPendingOs.map((item) => (
                  <div key={item.id} className="rounded-2xl border bg-muted/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.number}</p>
                        <p className="text-sm text-muted-foreground">{item.clientName}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Aberta em {date(item.openedAt)}.
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma OS pendente na unidade selecionada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
