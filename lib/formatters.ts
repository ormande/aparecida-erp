import type { Client, Supplier } from "@/lib/app-types";

type PersonLike = {
  tipo: "pf" | "pj";
  nomeCompleto?: string;
  nomeFantasia?: string;
  cpf?: string;
  cnpj?: string;
  whatsapp?: string;
};

export function getPersonDisplayName(person?: PersonLike) {
  if (!person) {
    return "-";
  }

  return person.tipo === "pf" ? person.nomeCompleto ?? "-" : person.nomeFantasia ?? "-";
}

export function getPersonDocument(person?: PersonLike) {
  if (!person) {
    return "-";
  }

  return person.tipo === "pf" ? person.cpf || "-" : person.cnpj || "-";
}

export function getClientDisplayName(client?: Client) {
  return getPersonDisplayName(client);
}

export function getSupplierDisplayName(supplier?: Supplier) {
  return getPersonDisplayName(supplier);
}

export function getClientDocument(client?: Client) {
  return getPersonDocument(client);
}

export function getSupplierDocument(supplier?: Supplier) {
  return getPersonDocument(supplier);
}

export function normalizeWhatsApp(value: string) {
  return value.replace(/\D/g, "");
}

export function getWhatsAppUrl(value: string) {
  return `https://wa.me/55${normalizeWhatsApp(value)}`;
}

export function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const amount = Number(digits || "0") / 100;
  return currency(amount);
}

export function parseCurrencyInput(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const brlMoneyMaskFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Máscara 0.000,00 para campo com prefixo R$ separado (apenas o valor, sem símbolo). */
export function formatMoneyMaskInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits === "") {
    return "";
  }
  const amount = Number(digits) / 100;
  return brlMoneyMaskFormatter.format(amount);
}

export function formatMoneyMaskFromNumber(value: number) {
  return brlMoneyMaskFormatter.format(value);
}

/** Centavos digitados → valor decimal; string vazia → null. */
export function parseMoneyMaskInput(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }
  return Number(digits) / 100;
}
