import { CircleDollarSign, ClipboardList, FileText, Wallet } from "lucide-react";

import { StatCard } from "@/components/ui/stat-card";
import { currency } from "@/lib/formatters";

type OsMetric = {
  count: number;
  total: number;
};

type OsStatsCardsProps = {
  coletadas: OsMetric;
  faturadas: OsMetric;
  emCaixa: OsMetric;
  totalProduzido: OsMetric;
};

function buildSubtitle(metric: OsMetric) {
  return `${metric.count} OS · ${currency(metric.total)}`;
}

export function OsStatsCards({ coletadas, faturadas, emCaixa, totalProduzido }: OsStatsCardsProps) {
  return (
    <>
      <StatCard
        title="OS coletadas"
        value={currency(coletadas.total)}
        subtitle={buildSubtitle(coletadas)}
        icon={ClipboardList}
        trend="none"
        compact
      />
      <StatCard
        title="OS faturadas"
        value={currency(faturadas.total)}
        subtitle={buildSubtitle(faturadas)}
        icon={FileText}
        trend="none"
        compact
      />
      <StatCard
        title="Valor em caixa"
        value={currency(emCaixa.total)}
        subtitle={buildSubtitle(emCaixa)}
        icon={Wallet}
        trend="none"
        compact
      />
      <StatCard
        title="Total produzido"
        value={currency(totalProduzido.total)}
        subtitle={buildSubtitle(totalProduzido)}
        icon={CircleDollarSign}
        trend="none"
        compact
      />
    </>
  );
}
