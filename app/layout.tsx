import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";

import { AppProviders } from "@/components/providers/app-providers";
import { RootAppFrame } from "@/components/layout/root-app-frame";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Aparecida ERP",
  description: "Gestao para borracharias com foco em atendimento, OS e financeiro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn(dmSans.variable, playfair.variable, "font-sans antialiased")}>
        <AppProviders>
          <RootAppFrame>{children}</RootAppFrame>
        </AppProviders>
      </body>
    </html>
  );
}
