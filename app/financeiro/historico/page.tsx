"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { useCurrentUnit } from "@/hooks/use-current-unit";
import { usePayables } from "@/hooks/use-payables";
import { useReceivables } from "@/hooks/use-receivables";
import { useUnits } from "@/hooks/use-units";
import { currency, date } from "@/lib/formatters";

export default function FinanceiroHistoricoPage() {
  const { unitId } = useCurrentUnit();
  const { units } = useUnits();
  const [selectedUnitId, setSelectedUnitId] = useState("");

  useEffect(() => {
    if (unitId) {
      setSelectedUnitId((current) => current || unitId);
    }
  }, [unitId]);

  const { receivables, hydrated: receivablesHydrated } = useReceivables({ unitId: selectedUnitId || undefined });
  const { payables, hydrated: payablesHydrated } = usePayables({ unitId: selectedUnitId || undefined });

  const rows = useMemo(() => {
    const incoming = receivables.map((item) => ({
      id: `r-${item.id}`,
      tipo: "Entrada",
      descricao: item.description,
      origem: item.originType === "SERVICE_ORDER" ? "Ordem de serviço" : "Lançamento manual",
      unidade: item.unitName,
      valor: item.value,
      status: item.status,
      vencimento: item.dueDate,
      pessoa: item.clientName,
    }));

    const outgoing = payables.map((item) => ({
      id: `p-${item.id}`,
      tipo: "Saída",
      descricao: item.description,
      origem: item.category,
      unidade: item.unitName,
      valor: item.value,
      status: item.status,
      vencimento: item.dueDate,
      pessoa: item.supplierName,
    }));

    return [...incoming, ...outgoing].sort((a, b) => b.vencimento.localeCompare(a.vencimento));
  }, [payables, receivables]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Histórico Financeiro"
        subtitle="Veja entradas e saídas detalhadas, com origem, unidade e situação."
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

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rows}
            isLoading={!receivablesHydrated || !payablesHydrated}
            pageSize={12}
            searchPlaceholder="Buscar por descrição, pessoa, origem ou unidade"
            searchKeys={[(row) => row.descricao, (row) => row.pessoa, (row) => row.origem, (row) => row.unidade]}
            emptyTitle="Nenhuma movimentação financeira"
            emptyDescription={`Cadastros financeiros das ${units.length} unidade(s) aparecerão aqui.`}
            columns={[
              { key: "tipo", header: "Tipo", render: (row) => row.tipo },
              { key: "descricao", header: "Descrição", render: (row) => row.descricao },
              { key: "pessoa", header: "Cliente / Fornecedor", render: (row) => row.pessoa || "-" },
              { key: "origem", header: "Origem", render: (row) => row.origem },
              { key: "unidade", header: "Unidade", render: (row) => row.unidade },
              { key: "vencimento", header: "Vencimento", render: (row) => date(row.vencimento) },
              { key: "status", header: "Status", render: (row) => row.status },
              { key: "valor", header: "Valor", render: (row) => currency(row.valor) },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
