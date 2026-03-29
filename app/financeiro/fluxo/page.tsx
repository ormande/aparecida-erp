"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { cashFlow, currency } from "@/lib/mock-data";

export default function FluxoCaixaPage() {
  const data = cashFlow.map((item) => ({
    ...item,
    day: item.date.slice(-2),
    saldo: item.entries - item.exits,
  }));
  const saldoAtual = cashFlow.reduce((sum, item) => sum + item.entries - item.exits, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle="Entradas e saídas diárias para leitura rápida da movimentação mensal."
      />

      <Card className="surface-card border-none">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Saldo atual</p>
          <p className="mt-3 text-4xl font-semibold">{currency(saldoAtual)}</p>
        </CardContent>
      </Card>

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Visão mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => currency(Number(value ?? 0))} />
              <Legend />
              <Line type="monotone" dataKey="entries" stroke="var(--color-success)" strokeWidth={3} dot={false} name="Entradas" />
              <Line type="monotone" dataKey="exits" stroke="var(--color-danger)" strokeWidth={3} dot={false} name="Saídas" />
              <Line type="monotone" dataKey="saldo" stroke="var(--color-gold)" strokeWidth={3} dot={false} name="Saldo diário" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
