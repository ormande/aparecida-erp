"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Client } from "@/lib/app-types";
import { currency, date, getClientDisplayName, getClientDocument } from "@/lib/formatters";

type ClientOrder = {
  id: string;
  number: string;
  status: "Aberta" | "Em andamento" | "Aguardando peça" | "Concluída" | "Cancelada";
  total: number;
  openedAt: string;
};

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [latestOrders, setLatestOrders] = useState<ClientOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`/api/customers/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message ?? "Cliente não encontrado.");
        }

        return data;
      })
      .then((data) => {
        if (active) {
          setClient(data.customer);
          setLatestOrders(data.latestOrders ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setClient(null);
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
  }, [params.id]);

  if (hydrated && !client) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cliente não encontrado" subtitle="Esse registro não está mais disponível." />
        <button
          type="button"
          onClick={() => router.push("/clientes")}
          className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition hover:bg-muted"
        >
          Voltar para clientes
        </button>
      </div>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={getClientDisplayName(client)}
        subtitle={`${client.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} • ${getClientDocument(client)}`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => router.push("/clientes")}>
              Voltar
            </Button>
            <Link
              href={`/ordens-de-servico/nova?clientId=${client.id}`}
              className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Nova OS para este cliente
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Dados cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientForm
              client={client}
              submitLabel="Salvar alterações"
              onSubmit={async (values) => {
                const response = await fetch(`/api/customers/${client.id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(values),
                });

                const data = await response.json();

                if (!response.ok) {
                  toast.error(data.message ?? "Não foi possível atualizar o cliente.");
                  return;
                }

                setClient(data.customer);
                toast.success("Cliente cadastrado com sucesso!");
              }}
            />
          </CardContent>
        </Card>

        <Card className="surface-card border-none">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Situação</span>
              <StatusBadge status={client.situacao} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{client.celular}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">WhatsApp</span>
              <span>{client.whatsapp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span>{client.email || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Últimas OS</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pb-3 font-medium">Número</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Valor</th>
                <th className="pb-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {latestOrders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="py-4 font-medium">{order.number}</td>
                  <td>
                    <StatusBadge status={order.status} />
                  </td>
                  <td>{currency(order.total)}</td>
                  <td>{date(order.openedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {latestOrders.length === 0 ? (
            <p className="pt-4 text-sm text-muted-foreground">Ainda não existem ordens de serviço para este cliente.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
