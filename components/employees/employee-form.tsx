"use client";

import { useState } from "react";

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
import type { ClientSituation, Employee, EmployeeAccessLevel } from "@/lib/app-types";

export type EmployeeFormValues = {
  nomeCompleto: string;
  email: string;
  senha: string;
  confirmarSenha: string;
  telefone: string;
  nivelAcesso: EmployeeAccessLevel;
  situacao: ClientSituation;
};

type EmployeeFormErrors = Partial<Record<keyof EmployeeFormValues, string>>;

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getInitialValues(employee?: Employee): EmployeeFormValues {
  return {
    nomeCompleto: employee?.nomeCompleto ?? "",
    email: employee?.email ?? "",
    senha: "",
    confirmarSenha: "",
    telefone: employee?.telefone ?? "",
    nivelAcesso: employee?.nivelAcesso ?? "Funcionário",
    situacao: employee?.situacao ?? "Ativo",
  };
}

export function employeeFormValuesToEmployee(values: EmployeeFormValues, base?: Employee): Employee {
  return {
    id: base?.id ?? `employee-${Date.now()}`,
    nomeCompleto: values.nomeCompleto,
    email: values.email,
    telefone: values.telefone,
    nivelAcesso: values.nivelAcesso,
    situacao: values.situacao,
    monthlyGoal: base?.monthlyGoal ?? null,
  };
}

export function EmployeeForm({
  employee,
  submitLabel,
  onSubmit,
}: {
  employee?: Employee;
  submitLabel: string;
  onSubmit: (values: EmployeeFormValues) => void;
}) {
  const [values, setValues] = useState<EmployeeFormValues>(() => getInitialValues(employee));
  const [errors, setErrors] = useState<EmployeeFormErrors>({});

  function updateField<K extends keyof EmployeeFormValues>(field: K, value: EmployeeFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: EmployeeFormErrors = {};

    if (!values.nomeCompleto.trim()) {
      nextErrors.nomeCompleto = "Informe o nome completo.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Informe o e-mail.";
    }

    if (!employee) {
      if (!values.senha || values.senha.length < 6) {
        nextErrors.senha = "A senha deve ter pelo menos 6 caracteres.";
      }
      if (values.senha !== values.confirmarSenha) {
        nextErrors.confirmarSenha = "As senhas não coincidem.";
      }
    }

    if (!values.nivelAcesso) {
      nextErrors.nivelAcesso = "Selecione o nível de acesso.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <div className="grid gap-5 py-2">
      <div className="grid gap-2">
        <Label htmlFor="nomeCompleto">Nome completo *</Label>
        <Input
          id="nomeCompleto"
          value={values.nomeCompleto}
          onChange={(event) => updateField("nomeCompleto", event.target.value)}
        />
        {errors.nomeCompleto ? <p className="text-xs text-destructive">{errors.nomeCompleto}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="funcionario@email.com"
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={values.telefone}
            onChange={(event) => updateField("telefone", maskPhone(event.target.value))}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      {!employee ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="senha">Senha *</Label>
            <Input
              id="senha"
              type="password"
              value={values.senha}
              onChange={(event) => updateField("senha", event.target.value)}
              autoComplete="new-password"
            />
            {errors.senha ? <p className="text-xs text-destructive">{errors.senha}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmarSenha">Confirmar senha *</Label>
            <Input
              id="confirmarSenha"
              type="password"
              value={values.confirmarSenha}
              onChange={(event) => updateField("confirmarSenha", event.target.value)}
              autoComplete="new-password"
            />
            {errors.confirmarSenha ? <p className="text-xs text-destructive">{errors.confirmarSenha}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Nível de acesso *</Label>
          <Select value={values.nivelAcesso} onValueChange={(value) => updateField("nivelAcesso", value as EmployeeAccessLevel)}>
            <SelectTrigger className="w-full rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Proprietário">Proprietário</SelectItem>
              <SelectItem value="Gestor">Gestor</SelectItem>
              <SelectItem value="Funcionário">Funcionário</SelectItem>
            </SelectContent>
          </Select>
          {errors.nivelAcesso ? <p className="text-xs text-destructive">{errors.nivelAcesso}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label>Situação</Label>
          <Select value={values.situacao} onValueChange={(value) => updateField("situacao", value as ClientSituation)}>
            <SelectTrigger className="w-full rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
