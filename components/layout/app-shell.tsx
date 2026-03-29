import { AuthGuard } from "@/components/auth/auth-guard";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageTransition } from "@/components/layout/page-transition";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="fixed inset-y-0 left-0 z-40 hidden w-[240px] md:block">
          <AppSidebar />
        </div>
        <AppHeader />
        <main className="min-h-screen px-4 pb-8 pt-24 md:ml-[240px] md:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </AuthGuard>
  );
}
