"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";

const PUBLIC_PATHS = new Set(["/", "/login"]);

export function RootAppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
