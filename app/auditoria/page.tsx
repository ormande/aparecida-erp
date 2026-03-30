"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";

type AuditRow = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actionLabel: string;
  summary: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  unitName: string;
  beforeData?: unknown;
  afterData?: unknown;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/audit-logs", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar a auditoria.");
        }
        return response.json();
      })
      .then((data) => {
        if (active) {
          setLogs(data.logs ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setLogs([]);
        }
      })
      .finally(() => {
        if (active) {
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Auditoria"
        subtitle="Acompanhe o histórico de alterações do sistema em linguagem mais clara."
      />

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Últimas movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={logs}
            isLoading={!hydrated}
            pageSize={10}
            searchPlaceholder="Buscar por usuário, ação ou resumo"
            searchKeys={[(row) => row.userName, (row) => row.summary, (row) => row.entityType, (row) => row.unitName]}
            emptyTitle="Nenhuma movimentação registrada"
            emptyDescription="As alterações importantes do sistema aparecerão aqui automaticamente."
            columns={[
              { key: "when", header: "Quando", render: (row) => formatDateTime(row.createdAt) },
              { key: "user", header: "Quem fez", render: (row) => row.userName },
              { key: "unit", header: "Onde", render: (row) => row.unitName },
              { key: "summary", header: "O que aconteceu", render: (row) => <span className="max-w-[520px] block">{row.summary}</span> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
