"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { useSetupStatus } from "@/hooks/use-setup-status";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hasUsers, isLoading: isSetupLoading } = useSetupStatus();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || isSetupLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!user) {
      return;
    }

    const units = user.units ?? [];
    const resolved = user.activeUnitId;
    if (units.length > 1 && resolved === undefined) {
      router.replace(`/selecionar-unidade?next=${encodeURIComponent(pathname)}`);
    }
  }, [hasUsers, isAuthenticated, isLoading, isSetupLoading, pathname, router, user]);

  const units = user?.units ?? [];
  const needsUnitSelection =
    !isLoading &&
    !isSetupLoading &&
    isAuthenticated &&
    user != null &&
    units.length > 1 &&
    user.activeUnitId === undefined;

  if (isLoading || isSetupLoading || !isAuthenticated || needsUnitSelection) {
    return (
      <div className="navy-pattern flex min-h-screen items-center justify-center">
        <div className="surface-card w-full max-w-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">Validando sessão...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
