import type { Metadata } from "next";
import { Inter, EB_Garamond, Geist } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/layout/DashboardShell";
import QueryProvider from "@/providers/QueryProvider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
});

export const metadata: Metadata = {
  title: "LexForge | Premium Legal AI SaaS",
  description: "Next-generation contract review and RAG analysis for legal professionals.",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased text-slate-900`}>
        <QueryProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
        </QueryProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
