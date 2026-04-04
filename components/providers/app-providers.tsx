"use client";

import { SessionProvider } from "next-auth/react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delay={200}>
          {children}
          <Toaster
            duration={process.env.NODE_ENV === "test" ? 10_000 : 4000}
            richColors
            position="top-right"
          />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
