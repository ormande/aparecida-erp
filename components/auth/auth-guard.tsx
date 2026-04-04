"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { useSetupStatus } from "@/hooks/use-setup-status";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isLoading: isSetupLoading } = useSetupStatus();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || isSetupLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, isSetupLoading, pathname, router]);

  if (isLoading || isSetupLoading || !isAuthenticated) {
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
