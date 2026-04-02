"use client";

import { Activity, AlertTriangle, CircleDollarSign, ClipboardList, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { useDebounce } from "@/hooks/use-debounce";
import { usePayables } from "@/hooks/use-payables";
import { useReceivables } from "@/hooks/use-receivables";
import { useServiceOrders } from "@/hooks/use-service-orders";
import { currency, date } from "@/lib/formatters";

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

export default function DashboardPage() {
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

  const today = getTodayLocalIso();
  const openedToday = orders.filter((order) => order.openedAt === today && order.status !== "Cancelada").length;
  const receitaMes = receivables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);
  const totalReceber = receivables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);
  const totalPagar = payables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);

  const previousReceitaMes = previousReceivables.filter((item) => item.status === "Pago").reduce((sum, item) => sum + item.value, 0);
  const previousPagar = previousPayables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);

  const latestOrders = orders.slice(0, 5);
  const warningsReceber = receivables.filter((item) => item.dueDate === today).slice(0, 3);
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
  const hydrated = !unitLoading && ordersHydrated && receivablesHydrated && payablesHydrated;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={
          currentUnit
            ? `Visão rápida da unidade ${currentUnit.name}, com foco em OS e saúde financeira.`
            : "Visão rápida da operação da unidade selecionada."
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="OS abertas hoje" value={String(openedToday)} icon={ClipboardList} trend={hasHistory ? "up" : "none"} />
        <StatCard title="Receita do mês" value={currency(receitaMes)} icon={CircleDollarSign} trend={hasHistory ? (receitaMes >= previousReceitaMes ? "up" : "down") : "none"} />
        <StatCard title="Contas a receber" value={currency(totalReceber)} icon={Wallet} trend={hasHistory ? "neutral" : "none"} />
        <StatCard title="Contas a pagar" value={currency(totalPagar)} icon={AlertTriangle} trend={hasHistory ? (totalPagar > previousPagar ? "down" : "neutral") : "none"} />
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
                      <th className="pb-3 font-medium">Placa</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestOrders.map((order) => (
                      <tr key={order.id} className="border-t">
                        <td className="py-4 font-medium">{order.number}</td>
                        <td>{order.clientName}</td>
                        <td>{order.plate}</td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td>{currency(order.total)}</td>
                        <td>{date(order.openedAt)}</td>
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
        </div>

        <div className="space-y-6">
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
                      Aberta em {date(item.openedAt)} para o veículo {item.plate}.
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
