import { z } from "zod";
import { isValidCnpj, isValidCpf } from "@/lib/document-validators";

export const personSchema = z.object({
  tipo: z.enum(["pf", "pj"]),
  nomeCompleto: z.string().optional().default(""),
  cpf: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || val.trim() === "" || isValidCpf(val), {
      message: "CPF inválido.",
    }),
  dataNascimento: z.string().optional().default(""),
  nomeFantasia: z.string().optional().default(""),
  razaoSocial: z.string().optional().default(""),
  cnpj: z
    .string()
    .optional()
    .default("")
    .refine((val) => !val || val.trim() === "" || isValidCnpj(val), {
      message: "CNPJ inválido.",
    }),
});

export type PersonSchemaInput = z.infer<typeof personSchema>;
