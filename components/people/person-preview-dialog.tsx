"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client, Supplier } from "@/lib/app-types";
import { getPersonDisplayName, getPersonDocument } from "@/lib/formatters";

type Person = Client | Supplier;

function isSupplier(person: Person): person is Supplier {
  return "categoria" in person;
}

export function PersonPreviewDialog({
  open,
  onOpenChange,
  person,
  title,
  subtitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
  title: string;
  subtitle: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {person ? (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Input value={person.tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Input value={person.situacao} disabled />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{person.tipo === "pf" ? "Nome completo" : "Nome fantasia"}</Label>
                <Input value={getPersonDisplayName(person)} disabled />
              </div>
              <div className="grid gap-2">
                <Label>{person.tipo === "pf" ? "CPF" : "CNPJ"}</Label>
                <Input value={getPersonDocument(person)} disabled />
              </div>
            </div>

            {person.tipo === "pj" ? (
              <div className="grid gap-2">
                <Label>Razão social</Label>
                <Input value={person.razaoSocial ?? ""} disabled />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Data de nascimento</Label>
                <Input value={person.dataNascimento ?? ""} disabled />
              </div>
            )}

            {isSupplier(person) ? (
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Input value={person.categoria} disabled />
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Celular</Label>
                <Input value={person.celular} disabled />
              </div>
              <div className="grid gap-2">
                <Label>WhatsApp</Label>
                <Input value={person.whatsapp} disabled />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>E-mail</Label>
                <Input value={person.email ?? ""} disabled />
              </div>
              {"veiculosCount" in person ? (
                <div className="grid gap-2">
                  <Label>Veículos vinculados</Label>
                  <Input value={String(person.veiculosCount)} disabled />
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea value={person.observacoes ?? ""} rows={5} disabled />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
