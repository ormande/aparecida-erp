"use client";

import { Activity, AlertTriangle, CircleDollarSign, ClipboardList, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  currency,
  dashboardRevenue,
  date,
  getClientById,
  getClientDisplayName,
  getVehicleById,
  payables,
  receivables,
  serviceOrders,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const openedToday = serviceOrders.filter((order) => order.openedAt === "2025-03-28" && order.status !== "Cancelada").length;
  const receitaMes = receivables.reduce((sum, item) => sum + item.value, 0);
  const totalReceber = receivables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);
  const totalPagar = payables.filter((item) => item.status !== "Pago").reduce((sum, item) => sum + item.value, 0);

  const latestOrders = [...serviceOrders]
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
    .slice(0, 5);

  const warningsReceber = receivables.filter((item) => item.dueDate === "2025-03-28").slice(0, 3);
  const oldPendingOs = serviceOrders
    .filter((item) => item.status === "Em andamento" || item.status === "Aguardando peça")
    .slice(0, 2);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Visão rápida da operação de hoje, com foco em ordens de serviço e saúde financeira."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="OS abertas hoje" value={String(openedToday)} icon={ClipboardList} trend="up" />
        <StatCard title="Receita do mês" value={currency(receitaMes)} icon={CircleDollarSign} trend="up" />
        <StatCard title="Contas a receber" value={currency(totalReceber)} icon={Wallet} trend="neutral" />
        <StatCard title="Contas a pagar" value={currency(totalPagar)} icon={AlertTriangle} trend="down" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="space-y-6">
          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>Últimas ordens de serviço</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
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
                      <td>{getClientDisplayName(getClientById(order.clientId))}</td>
                      <td>{getVehicleById(order.vehicleId)?.plate}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>{currency(order.total)}</td>
                      <td>{date(order.openedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="var(--color-gold)" />
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
              {warningsReceber.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-muted/40 p-4">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-muted-foreground">{getClientDisplayName(getClientById(item.clientId))}</p>
                  <p className="mt-2 text-sm font-semibold">{currency(item.value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>OS pendentes há mais de 2 dias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {oldPendingOs.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.number}</p>
                      <p className="text-sm text-muted-foreground">{getClientDisplayName(getClientById(item.clientId))}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Aberta em {date(item.openedAt)} para o veículo {getVehicleById(item.vehicleId)?.plate}.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
