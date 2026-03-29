"use client";

import Link from "next/link";
import { Eye, MessageCircle, Pencil, Plus, Truck } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSuppliers } from "@/hooks/use-suppliers";
import { getSupplierDisplayName, getSupplierDocument, getWhatsAppUrl } from "@/lib/mock-data";

export default function FornecedoresPage() {
  const { suppliers } = useSuppliers();

  const data = suppliers.map((supplier) => ({
    ...supplier,
    displayName: getSupplierDisplayName(supplier),
    document: getSupplierDocument(supplier),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Fornecedores"
        subtitle="Gerencie parceiros de pneus, peças, insumos e serviços com o mesmo padrão de cadastro da operação."
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
          pageSize={10}
          searchPlaceholder="Buscar por nome, CNPJ/CPF, categoria ou celular"
          searchKeys={[(row) => row.displayName, (row) => row.document, (row) => row.categoria, (row) => row.celular]}
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
                  <Link
                    href={`/fornecedores/${row.id}`}
                    className="inline-flex h-7 items-center justify-center rounded-[12px] border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    Ver
                  </Link>
                  <Link
                    href={`/fornecedores/${row.id}`}
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
