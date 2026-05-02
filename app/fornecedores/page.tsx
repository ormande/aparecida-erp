"use client";

import Link from "next/link";
import { Eye, MessageCircle, Pencil, Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

import { SupplierForm } from "@/components/suppliers/supplier-form";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PersonPreviewDialog } from "@/components/people/person-preview-dialog";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSuppliers } from "@/hooks/use-suppliers";
import { getPersonDocument, getPersonName } from "@/lib/person-helpers";

function getWhatsAppUrl(value: string) {
  return `https://wa.me/55${value.replace(/\D/g, "")}`;
}

export default function FornecedoresPage() {
  const { suppliers, hydrated } = useSuppliers();
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const data = suppliers.map((supplier) => ({
    ...supplier,
    displayName: getPersonName(supplier, "-"),
    document: getPersonDocument(supplier) || "-",
  }));
  const searchKeys = useMemo<Array<(row: (typeof data)[number]) => string>>(
    () => [(row) => row.displayName, (row) => row.document, (row) => row.categoria, (row) => row.celular],
    [],
  );
  const viewingSupplier = suppliers.find((supplier) => supplier.id === viewingSupplierId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fornecedores"
        subtitle="Gerencie parceiros de pneus, peças, insumos e serviços com base real da empresa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo fornecedor
                </Button>
              }
            />
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo fornecedor</DialogTitle>
                <DialogDescription>Cadastre o fornecedor sem sair da lista.</DialogDescription>
              </DialogHeader>
              <SupplierForm
                submitLabel="Salvar fornecedor"
                onSubmit={async (values) => {
                  const response = await fetch("/api/suppliers", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(values),
                  });

                  const data = await response.json().catch(() => ({}));

                  if (!response.ok) {
                    toast.error(
                      (data as { message?: string; error?: string }).message ??
                        (data as { error?: string }).error ??
                        "Não foi possível cadastrar o fornecedor.",
                    );
                    return;
                  }

                  toast.success("Fornecedor cadastrado com sucesso!");
                  setOpen(false);
                  await mutate("/api/suppliers");
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={data}
          isLoading={!hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por nome, CNPJ/CPF, categoria ou celular"
          searchKeys={searchKeys}
          emptyTitle="Nenhum fornecedor cadastrado"
          emptyDescription="Cadastre fornecedores da empresa para usá-los depois no financeiro."
          columns={[
            {
              key: "name",
              header: "Fornecedor",
              render: (row) => (
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[rgba(201,168,76,0.14)] p-2 text-[var(--color-gold-dark)]">
                    <Truck className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{row.displayName}</span>
                </div>
              ),
            },
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
            { key: "category", header: "Categoria", render: (row) => row.categoria },
            { key: "situation", header: "Situação", render: (row) => <StatusBadge status={row.situacao} /> },
            {
              key: "actions",
              header: "Ações",
              render: (row) => (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewingSupplierId(row.id)}>
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Button>
                  <Link
                    href={`/fornecedores/${row.id}`}
                    className="inline-flex"
                  >
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
        open={Boolean(viewingSupplier)}
        onOpenChange={(open) => !open && setViewingSupplierId(null)}
        person={viewingSupplier}
        title="Fornecedor"
        subtitle="Visualização rápida do cadastro."
      />
    </div>
  );
}
