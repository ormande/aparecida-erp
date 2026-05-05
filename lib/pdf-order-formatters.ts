export function formatPdfCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPdfDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`));
}

export function formatPdfPaymentMethod(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return "-";
  }

  return normalized.toLowerCase() === "pix" ? "PIX" : normalized;
}

export function formatPdfPaymentTerm(value?: "A_VISTA" | "A_PRAZO" | null) {
  if (value === "A_PRAZO") {
    return "A prazo";
  }

  if (value === "A_VISTA") {
    return "À vista";
  }

  return "-";
}

export function formatPdfDocument(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return value?.trim() || "-";
}

export function formatPdfPhone(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return value?.trim() || "-";
}

export function sanitizeClosurePdfDescription(value: string) {
  return value
    .replace(/^\[Produto\]\s*/i, "")
    .replace(/\s*\[RCV:[^\]]+\]/gi, "")
    .replace(/\s*\[PLAN:[^\]]+\]/gi, "")
    .replace(/\s*\(referência da\s+OS-\d{4}-\d{5}(?:-P\d+)?\s*-\s*já pago\)/gi, "")
    .replace(/\s*\(OS-\d{4}-\d{5}(?:-P\d+)?\s*-\s*já pago\)/gi, "")
    .replace(/\s*\(OS-\d{4}-\d{5}(?:-P\d+)?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
