"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useMemo } from "react";

function getInitials(name?: string | null) {
  if (!name) {
    return "AE";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "AE";
}

function getRoleLabel(level?: "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO") {
  if (level === "PROPRIETARIO") {
    return "Proprietário";
  }
  if (level === "GESTOR") {
    return "Gestor";
  }

  return "Funcionário";
}

export function useAuth() {
  const { data: session, status } = useSession();

  const user = useMemo(() => {
    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      role: getRoleLabel(session.user.accessLevel),
      avatar: getInitials(session.user.name),
      companyId: session.user.companyId,
      accessLevel: session.user.accessLevel,
      status: session.user.status,
      units: session.user.units ?? [],
    };
  }, [session]);

  return useMemo(
    () => ({
      user,
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated",
      login: async (email: string, password: string) =>
        signIn("credentials", {
          email,
          password,
          redirect: false,
        }),
      logout: async () =>
        signOut({
          redirect: false,
        }),
    }),
    [status, user],
  );
}
