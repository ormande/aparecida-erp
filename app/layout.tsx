import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import "./globals.css";

import { RootAppFrame } from "@/components/layout/root-app-frame";
import { AppProviders } from "@/components/providers/app-providers";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "Aparecida ERP",
  description: "Gestão para borracharias com foco em atendimento, OS e financeiro.",
  icons: {
    icon: [{ url: "/brand/logo.png", type: "image/png" }],
    apple: [{ url: "/brand/logo.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn(dmSans.variable, "font-sans antialiased")}>
        <AppProviders>
          <RootAppFrame>{children}</RootAppFrame>
        </AppProviders>
      </body>
    </html>
  );
}
