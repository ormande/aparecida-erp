"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DEMO_USER } from "@/lib/config";

const STORAGE_KEY = "aparecida-erp-demo-session";
const WORKSPACE_KEY = "aparecida-erp-workspace";

export type AuthUser = typeof DEMO_USER;

function readStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setIsLoading(false);

    const handleStorage = () => {
      setUser(readStoredUser());
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const loginDemo = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    if (!window.localStorage.getItem(WORKSPACE_KEY)) {
      window.localStorage.setItem(WORKSPACE_KEY, "cg");
    }
    setUser(DEMO_USER);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      loginDemo,
      logout,
    }),
    [isLoading, loginDemo, logout, user],
  );
}

export const authStorageKeys = {
  session: STORAGE_KEY,
  workspace: WORKSPACE_KEY,
};
