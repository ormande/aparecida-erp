"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ClientForm, clientFormValuesToClient } from "@/components/clients/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  currency,
  date,
  getClientById,
  getClientDisplayName,
  getClientDocument,
  getServiceOrdersByClientId,
  getVehicleById,
  getVehiclesByClientId,
} from "@/lib/mock-data";

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const initialClient = getClientById(params.id);

  if (!initialClient) {
    notFound();
  }

  const [client, setClient] = useState(initialClient);
  const clientVehicles = getVehiclesByClientId(client.id);
  const latestOrders = getServiceOrdersByClientId(client.id)
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        title={getClientDisplayName(client)}
        subtitle={`${client.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} • ${getClientDocument(client)}`}
        actions={
          <Link
            href={`/ordens-de-servico/nova?clientId=${client.id}`}
            className="inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Nova OS para este cliente
          </Link>
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
              onSubmit={(values) => {
                setClient(clientFormValuesToClient(values, client));
                toast.success("Cliente cadastrado com sucesso!");
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
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

          <Card className="surface-card border-none">
            <CardHeader>
              <CardTitle>Veículos vinculados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientVehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-2xl border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{vehicle.plate}</p>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.brand} {vehicle.model}
                      </p>
                      <p className="text-sm text-muted-foreground">Ano {vehicle.year}</p>
                    </div>
                    <Link
                      href={`/ordens-de-servico?vehicleId=${vehicle.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
                    >
                      Ver OS
                    </Link>
                  </div>
                </div>
              ))}
              {clientVehicles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum veículo vinculado a este cliente.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="surface-card border-none">
        <CardHeader>
          <CardTitle>Últimas OS</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pb-3 font-medium">Número</th>
                <th className="pb-3 font-medium">Veículo</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Valor</th>
                <th className="pb-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {latestOrders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="py-4 font-medium">{order.number}</td>
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
    </div>
  );
}
