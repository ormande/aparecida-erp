"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="navy-pattern flex min-h-screen items-center justify-center">
        <div className="surface-card w-full max-w-sm p-8 text-center">
          <p className="text-sm text-muted-foreground">Validando sessão demo...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
