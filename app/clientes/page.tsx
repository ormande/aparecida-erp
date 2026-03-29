"use client";

import Link from "next/link";
import { Eye, MessageCircle, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ClientForm, clientFormValuesToClient } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { clients as initialClients, getClientDisplayName, getClientDocument, getWhatsAppUrl } from "@/lib/mock-data";

export default function ClientesPage() {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState(initialClients);

  const data = useMemo(
    () =>
      clients.map((client) => ({
        ...client,
        displayName: getClientDisplayName(client),
        document: getClientDocument(client),
      })),
    [clients],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        subtitle="Cadastre pessoas físicas e jurídicas com contato rápido e visão completa do relacionamento."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo cliente
                </Button>
              }
            />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo cliente</DialogTitle>
                <DialogDescription>Os dados são mockados neste protótipo e ficam apenas em memória local.</DialogDescription>
              </DialogHeader>
              <ClientForm
                submitLabel="Salvar cliente"
                onSubmit={(values) => {
                  setClients((current) => [...current, clientFormValuesToClient(values)]);
                  toast.success("Cliente cadastrado com sucesso!");
                  setOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={data}
          pageSize={10}
          searchPlaceholder="Buscar por nome, CPF/CNPJ ou celular"
          searchKeys={[(row) => row.displayName, (row) => row.document, (row) => row.celular]}
          columns={[
            { key: "name", header: "Nome", render: (row) => <span className="font-medium">{row.displayName}</span> },
            { key: "document", header: "CPF/CNPJ", render: (row) => row.document },
            { key: "phone", header: "Telefone", render: (row) => row.celular },
            {
              key: "whatsapp",
              header: "WhatsApp",
              render: (row) => (
                <a
                  href={getWhatsAppUrl(row.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--color-gold-dark)] hover:text-[var(--color-gold)]"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{row.whatsapp}</span>
                </a>
              ),
            },
            { key: "vehicles", header: "Veículos", render: (row) => row.veiculosCount },
            { key: "situation", header: "Situação", render: (row) => <StatusBadge status={row.situacao} /> },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex gap-2">
                  <Link
                    href={`/clientes/${row.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-[12px] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Link>
                  <Link
                    href={`/clientes/${row.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-[12px] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
