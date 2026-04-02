import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    activeUnitId?: string;
    user: DefaultSession["user"] & {
      id: string;
      companyId: string;
      accessLevel: "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO";
      status: "ATIVO" | "INATIVO";
      phone?: string | null;
      activeUnitId?: string;
      units: Array<{
        id: string;
        name: string;
      }>;
    };
  }

  interface User {
    id: string;
    companyId: string;
    accessLevel: "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO";
    status: "ATIVO" | "INATIVO";
    phone?: string | null;
    activeUnitId?: string;
    units: Array<{
      id: string;
      name: string;
    }>;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    accessLevel: "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO";
    status: "ATIVO" | "INATIVO";
    phone?: string | null;
    activeUnitId?: string;
    units?: Array<{
      id: string;
      name: string;
    }>;
  }
}
