"use client";

import { useMemo, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientSituation, ClientType, SupplierCategory } from "@/lib/mock-data";

export type CadastroPessoaFormValues = {
  tipo: ClientType;
  situacao: ClientSituation;
  celular: string;
  whatsapp: string;
  email: string;
  observacoes: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  mesmoWhatsapp: boolean;
  categoria?: SupplierCategory;
};

type CadastroPessoaFormErrors = Partial<Record<keyof CadastroPessoaFormValues, string>>;

type CadastroPessoaFormProps = {
  tipo: "cliente" | "fornecedor";
  submitLabel: string;
  initialValues: CadastroPessoaFormValues;
  onSubmit: (values: CadastroPessoaFormValues) => void;
};

const supplierCategories: SupplierCategory[] = ["Pneus", "Peças", "Insumos", "Serviços", "Outros"];

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function getEmptyErrors() {
  return {} as CadastroPessoaFormErrors;
}

function getClientTypeLabel(type: ClientType) {
  return type === "pf" ? "Pessoa Física" : "Pessoa Jurídica";
}

export function CadastroPessoaForm({
  tipo,
  submitLabel,
  initialValues,
  onSubmit,
}: CadastroPessoaFormProps) {
  const [values, setValues] = useState<CadastroPessoaFormValues>(initialValues);
  const [errors, setErrors] = useState<CadastroPessoaFormErrors>(getEmptyErrors());

  const titleByType = useMemo(() => getClientTypeLabel(values.tipo), [values.tipo]);
  const entityLabel = tipo === "cliente" ? "cliente" : "fornecedor";

  function updateField<K extends keyof CadastroPessoaFormValues>(field: K, value: CadastroPessoaFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };

      if (field === "celular" && current.mesmoWhatsapp) {
        next.whatsapp = value as string;
      }

      if (field === "tipo") {
        if (value === "pf") {
          next.nomeFantasia = "";
          next.razaoSocial = "";
          next.cnpj = "";
        } else {
          next.nomeCompleto = "";
          next.cpf = "";
          next.dataNascimento = "";
        }
      }

      return next;
    });

    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors = getEmptyErrors();

    if (!values.celular.trim()) {
      nextErrors.celular = "Informe o telefone celular.";
    }

    if (values.tipo === "pf" && !values.nomeCompleto.trim()) {
      nextErrors.nomeCompleto = "Informe o nome completo.";
    }

    if (values.tipo === "pj" && !values.nomeFantasia.trim()) {
      nextErrors.nomeFantasia = "Informe o nome fantasia.";
    }

    if (tipo === "fornecedor" && !values.categoria) {
      nextErrors.categoria = "Selecione a categoria.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <div className="grid gap-5 py-2">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Tipo de {entityLabel} *</Label>
          <Select value={values.tipo} onValueChange={(value) => updateField("tipo", value as ClientType)}>
            <SelectTrigger className="w-full">
              <SelectValue>{getClientTypeLabel(values.tipo)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pf">Pessoa Física</SelectItem>
              <SelectItem value="pj">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Situação</Label>
          <Select value={values.situacao} onValueChange={(value) => updateField("situacao", value as ClientSituation)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {tipo === "fornecedor" ? (
        <div className="grid gap-2">
          <Label>Categoria *</Label>
          <Select value={values.categoria} onValueChange={(value) => updateField("categoria", value as SupplierCategory)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {supplierCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoria ? <p className="text-xs text-destructive">{errors.categoria}</p> : null}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{titleByType}</h3>

        {values.tipo === "pf" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="nomeCompleto">Nome completo *</Label>
              <Input
                id="nomeCompleto"
                value={values.nomeCompleto}
                onChange={(event) => updateField("nomeCompleto", event.target.value)}
              />
              {errors.nomeCompleto ? <p className="text-xs text-destructive">{errors.nomeCompleto}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={values.cpf}
                onChange={(event) => updateField("cpf", maskCpf(event.target.value))}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataNascimento">Data de nascimento</Label>
              <Input
                id="dataNascimento"
                type="date"
                value={values.dataNascimento}
                onChange={(event) => updateField("dataNascimento", event.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="nomeFantasia">Nome fantasia *</Label>
              <Input
                id="nomeFantasia"
                value={values.nomeFantasia}
                onChange={(event) => updateField("nomeFantasia", event.target.value)}
              />
              {errors.nomeFantasia ? <p className="text-xs text-destructive">{errors.nomeFantasia}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="razaoSocial">Razão social</Label>
              <Input
                id="razaoSocial"
                value={values.razaoSocial}
                onChange={(event) => updateField("razaoSocial", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={values.cnpj}
                onChange={(event) => updateField("cnpj", maskCnpj(event.target.value))}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="celular">Telefone celular *</Label>
          <Input
            id="celular"
            value={values.celular}
            onChange={(event) => updateField("celular", maskPhone(event.target.value))}
            placeholder="(00) 00000-0000"
          />
          {errors.celular ? <p className="text-xs text-destructive">{errors.celular}</p> : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={values.mesmoWhatsapp}
                onCheckedChange={(checked) => {
                  const enabled = Boolean(checked);
                  setValues((current) => ({
                    ...current,
                    mesmoWhatsapp: enabled,
                    whatsapp: enabled ? current.celular : current.whatsapp,
                  }));
                }}
              />
              Mesmo número do celular
            </label>
          </div>
          <Input
            id="whatsapp"
            value={values.whatsapp}
            disabled={values.mesmoWhatsapp}
            onChange={(event) => updateField("whatsapp", maskPhone(event.target.value))}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder={tipo === "cliente" ? "cliente@email.com" : "fornecedor@email.com"}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          rows={4}
          value={values.observacoes}
          onChange={(event) => updateField("observacoes", event.target.value)}
        />
      </div>

      <Button
        onClick={() => {
          if (!validate()) {
            return;
          }

          onSubmit(values);
        }}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
