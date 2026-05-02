"use client";

import { CadastroPessoaForm, type CadastroPessoaFormValues } from "@/components/people/cadastro-pessoa-form";
import type { Client } from "@/lib/app-types";

function getInitialValues(client?: Client): CadastroPessoaFormValues {
  return {
    tipo: client?.tipo ?? "pj",
    situacao: client?.situacao ?? "Ativo",
    celular: client?.celular ?? "",
    whatsapp: client?.whatsapp ?? "",
    email: client?.email ?? "",
    observacoes: client?.observacoes ?? "",
    nomeCompleto: client?.nomeCompleto ?? "",
    cpf: client?.cpf ?? "",
    dataNascimento: client?.dataNascimento ?? "",
    nomeFantasia: client?.nomeFantasia ?? "",
    razaoSocial: client?.razaoSocial ?? "",
    cnpj: client?.cnpj ?? "",
    mesmoWhatsapp: client ? client.celular === client.whatsapp : true,
  };
}

export function clientFormValuesToClient(values: CadastroPessoaFormValues, base?: Client): Client {
  return {
    id: base?.id ?? `client-${Date.now()}`,
    tipo: values.tipo,
    situacao: values.situacao,
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

export function ClientForm({
  client,
  submitLabel,
  onSubmit,
  onDirtyChange,
}: {
  client?: Client;
  submitLabel: string;
  onSubmit: (values: CadastroPessoaFormValues) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  return (
    <CadastroPessoaForm
      tipo="cliente"
      submitLabel={submitLabel}
      initialValues={getInitialValues(client)}
      onSubmit={onSubmit}
      onDirtyChange={onDirtyChange}
    />
  );
}
