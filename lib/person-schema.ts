import { z } from "zod";

export const personSchema = z.object({
  tipo: z.enum(["pf", "pj"]),
  nomeCompleto: z.string().optional().default(""),
  cpf: z.string().optional().default(""),
  dataNascimento: z.string().optional().default(""),
  nomeFantasia: z.string().optional().default(""),
  razaoSocial: z.string().optional().default(""),
  cnpj: z.string().optional().default(""),
});

export type PersonSchemaInput = z.infer<typeof personSchema>;
