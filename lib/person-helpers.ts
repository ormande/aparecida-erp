export type PersonLike = {
  tipo: "pf" | "pj";
  nomeCompleto?: string;
  nomeFantasia?: string;
  cpf?: string;
  cnpj?: string;
};

export function getPersonName(person: PersonLike, fallback = "Sem nome"): string {
  return person.tipo === "pf" ? person.nomeCompleto ?? fallback : person.nomeFantasia ?? fallback;
}

export function getPersonDocument(person: PersonLike): string {
  const raw = person.tipo === "pf" ? person.cpf : person.cnpj;
  return raw ?? "";
}
