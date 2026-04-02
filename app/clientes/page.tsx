"use client";

import Link from "next/link";
import { Eye, MessageCircle, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ClientForm } from "@/components/clients/client-form";
import { PersonPreviewDialog } from "@/components/people/person-preview-dialog";
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
import { useCustomers } from "@/hooks/use-customers";
import { getClientDisplayName, getClientDocument, getWhatsAppUrl } from "@/lib/formatters";

export default function ClientesPage() {
  const [open, setOpen] = useState(false);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { customers, meta, refresh, hydrated } = useCustomers({ page, limit: 10, search });

  const data = useMemo(
    () =>
      customers.map((client) => ({
        ...client,
        displayName: getClientDisplayName(client),
        document: getClientDocument(client),
      })),
    [customers],
  );
  const searchKeys = useMemo<Array<(row: (typeof data)[number]) => string>>(
    () => [(row) => row.displayName, (row) => row.document, (row) => row.celular],
    [],
  );
  const viewingCustomer = customers.find((customer) => customer.id === viewingCustomerId) ?? null;

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
                <DialogDescription>Os dados agora são persistidos no banco de dados do sistema.</DialogDescription>
              </DialogHeader>
              <ClientForm
                submitLabel="Salvar cliente"
                onSubmit={async (values) => {
                  const response = await fetch("/api/customers", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(values),
                  });

                  const data = await response.json();

                  if (!response.ok) {
                    toast.error(data.message ?? "Não foi possível cadastrar o cliente.");
                    return;
                  }

                  await refresh();
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
          isLoading={!hydrated}
          totalItems={meta?.total}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          manualPagination={{
            page: meta?.page ?? page,
            totalPages: meta?.totalPages ?? 1,
            onPageChange: setPage,
          }}
          searchPlaceholder="Buscar por nome, CPF/CNPJ ou celular"
          searchKeys={searchKeys}
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
                  <Button variant="outline" size="sm" onClick={() => setViewingCustomerId(row.id)}>
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                  <Link href={`/clientes/${row.id}`} className="inline-flex">
                    <Button variant="outline" size="sm">
                      <Pencil className="mr-1 h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </div>

      <PersonPreviewDialog
        open={Boolean(viewingCustomer)}
        onOpenChange={(nextOpen) => !nextOpen && setViewingCustomerId(null)}
        person={viewingCustomer}
        title="Cliente"
        subtitle="Visualização rápida do cadastro."
      />
    </div>
  );
}
