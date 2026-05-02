"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { usePayables } from "@/hooks/use-payables";
import { useReceivables } from "@/hooks/use-receivables";
import { useUnits } from "@/hooks/use-units";
import { currency } from "@/lib/formatters";
import { getCurrentMonthPrefix, getPreviousMonthPrefix } from "@/lib/month-period";

export default function FluxoCaixaPage() {
  const { unitId, currentUnit } = useCurrentUnit();
  const { units } = useUnits();
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [period, setPeriod] = useState(() => getPreviousMonthPrefix());

  useEffect(() => {
    if (unitId) {
      setSelectedUnitId((current) => current || unitId);
    }
  }, [unitId]);

  const activeUnit = units.find((unit) => unit.id === selectedUnitId) ?? currentUnit;
  const { receivables } = useReceivables({ unitId: selectedUnitId || undefined, period });
  const { payables } = usePayables({ unitId: selectedUnitId || undefined, period });

  const flowMap = new Map<string, { entries: number; exits: number }>();
  for (let day = 1; day <= 31; day += 1) {
    const dateKey = `${period}-${String(day).padStart(2, "0")}`;
    flowMap.set(dateKey, { entries: 0, exits: 0 });
  }

  receivables
    .filter((item) => item.status === "Pago")
    .forEach((item) => {
      const current = flowMap.get(item.dueDate);
      if (current) current.entries += item.value;
    });

  payables
    .filter((item) => item.status === "Pago")
    .forEach((item) => {
      const current = flowMap.get(item.dueDate);
      if (current) current.exits += item.value;
    });

  const data = Array.from(flowMap.entries()).map(([dateKey, value]) => ({
    date: dateKey,
    day: dateKey.slice(-2),
    entries: value.entries,
    exits: value.exits,
    saldo: value.entries - value.exits,
  }));
  const saldoAtual = data.reduce((sum, item) => sum + item.saldo, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle={
          selectedUnitId && activeUnit
            ? `Entradas e saídas da unidade ${activeUnit.name}, com visão consolidada do mês.`
            : "Entradas e saídas consolidadas, considerando apenas movimentações já baixadas."
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={selectedUnitId === "" ? "default" : "outline"} onClick={() => setSelectedUnitId("")}>
          Geral
        </Button>
        {units.map((unit) => (
          <Button
            key={unit.id}
            size="sm"
            variant={selectedUnitId === unit.id ? "default" : "outline"}
            onClick={() => setSelectedUnitId(unit.id)}
          >
            {unit.name}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Mês da visão (vencimento)</span>
        <Button
          size="sm"
          type="button"
          variant={period === getPreviousMonthPrefix() ? "default" : "outline"}
          onClick={() => setPeriod(getPreviousMonthPrefix())}
        >
          Mês passado
        </Button>
        <Button
          size="sm"
          type="button"
          variant={period === getCurrentMonthPrefix() ? "default" : "outline"}
          onClick={() => setPeriod(getCurrentMonthPrefix())}
        >
          Mês atual
        </Button>
      </div>

      <Card className="surface-card border-none">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Saldo atual</p>
          <p className="mt-3 text-4xl font-semibold">{currency(saldoAtual)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            O saldo considera apenas movimentações já baixadas.
          </p>
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
