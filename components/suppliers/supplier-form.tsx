"use client";

import { CadastroPessoaForm, type CadastroPessoaFormValues } from "@/components/people/cadastro-pessoa-form";
import type { Supplier } from "@/lib/mock-data";

function getInitialValues(supplier?: Supplier): CadastroPessoaFormValues {
  return {
    tipo: supplier?.tipo ?? "pj",
    situacao: supplier?.situacao ?? "Ativo",
    celular: supplier?.celular ?? "",
    whatsapp: supplier?.whatsapp ?? "",
    email: supplier?.email ?? "",
    observacoes: supplier?.observacoes ?? "",
    nomeCompleto: supplier?.nomeCompleto ?? "",
    cpf: supplier?.cpf ?? "",
    dataNascimento: supplier?.dataNascimento ?? "",
    nomeFantasia: supplier?.nomeFantasia ?? "",
    razaoSocial: supplier?.razaoSocial ?? "",
    cnpj: supplier?.cnpj ?? "",
    mesmoWhatsapp: supplier ? supplier.celular === supplier.whatsapp : true,
    categoria: supplier?.categoria ?? "Outros",
  };
}

export function supplierFormValuesToSupplier(values: CadastroPessoaFormValues, base?: Supplier): Supplier {
  return {
    id: base?.id ?? `supplier-${Date.now()}`,
    tipo: values.tipo,
    situacao: values.situacao,
    categoria: values.categoria ?? "Outros",
    celular: values.celular,
    whatsapp: values.whatsapp,
    email: values.email,
    observacoes: values.observacoes,
    nomeCompleto: values.tipo === "pf" ? values.nomeCompleto : undefined,
    cpf: values.tipo === "pf" ? values.cpf : undefined,
    dataNascimento: values.tipo === "pf" ? values.dataNascimento : undefined,
    nomeFantasia: values.tipo === "pj" ? values.nomeFantasia : undefined,
    razaoSocial: values.tipo === "pj" ? values.razaoSocial : undefined,
    cnpj: values.tipo === "pj" ? values.cnpj : undefined,
  };
}

export function SupplierForm({
  supplier,
  submitLabel,
  onSubmit,
}: {
  supplier?: Supplier;
  submitLabel: string;
  onSubmit: (values: CadastroPessoaFormValues) => void;
}) {
  return (
    <CadastroPessoaForm
      tipo="fornecedor"
      submitLabel={submitLabel}
      initialValues={getInitialValues(supplier)}
      onSubmit={onSubmit}
    />
  );
}
