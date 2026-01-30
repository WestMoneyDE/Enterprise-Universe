// =============================================================================
// Root Layout - Nexus Command Center
// =============================================================================

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TRPCProvider } from "@/trpc/client";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Nexus Command Center",
    template: "%s | Nexus Command Center",
  },
  description:
    "Enterprise management platform for Enterprise Universe GmbH - Managing West Money Bau, West Money OS, Z Automation, and DEDSEC World AI",
  keywords: [
    "CRM",
    "construction management",
    "SaaS",
    "AI automation",
    "enterprise management",
  ],
  authors: [{ name: "Enterprise Universe GmbH" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
