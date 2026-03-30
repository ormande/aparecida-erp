"use client";

import Link from "next/link";
import { Eye, MessageCircle, Pencil, Plus, Truck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PersonPreviewDialog } from "@/components/people/person-preview-dialog";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSuppliers } from "@/hooks/use-suppliers";

function getSupplierDisplayName(supplier: {
  tipo: "pf" | "pj";
  nomeCompleto?: string;
  nomeFantasia?: string;
}) {
  return supplier.tipo === "pf" ? supplier.nomeCompleto ?? "-" : supplier.nomeFantasia ?? "-";
}

function getSupplierDocument(supplier: {
  tipo: "pf" | "pj";
  cpf?: string;
  cnpj?: string;
}) {
  return supplier.tipo === "pf" ? supplier.cpf || "-" : supplier.cnpj || "-";
}

function getWhatsAppUrl(value: string) {
  return `https://wa.me/55${value.replace(/\D/g, "")}`;
}

export default function FornecedoresPage() {
  const { suppliers, hydrated } = useSuppliers();
  const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);

  const data = suppliers.map((supplier) => ({
    ...supplier,
    displayName: getSupplierDisplayName(supplier),
    document: getSupplierDocument(supplier),
  }));
  const viewingSupplier = suppliers.find((supplier) => supplier.id === viewingSupplierId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fornecedores"
        subtitle="Gerencie parceiros de pneus, peças, insumos e serviços com base real da empresa."
        actions={
          <Link
            href="/fornecedores/novo"
            className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo fornecedor
          </Link>
        }
      />

      <div className="surface-card p-6">
        <DataTable
          data={data}
          isLoading={!hydrated}
          pageSize={10}
          searchPlaceholder="Buscar por nome, CNPJ/CPF, categoria ou celular"
          searchKeys={[(row) => row.displayName, (row) => row.document, (row) => row.categoria, (row) => row.celular]}
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
