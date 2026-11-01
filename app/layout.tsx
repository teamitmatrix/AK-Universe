import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { ChatWidget } from "@/components/ui/ChatWidget";
import { CookieNotice } from "@/components/ui/CookieNotice";
import { SiteTranslator } from "@/components/ui/SiteTranslator";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-figtree",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AK Universe — Agents IA pour entreprises",
  description:
    "Déléguez vos tâches à des agents IA spécialisés : marketing, ventes, support client, productivité.",
  icons: { icon: { url: "/assets/img/logo.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={figtree.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {children}
        <SiteTranslator />
        <CookieNotice />
        <ChatWidget />
      </body>
    </html>
  );
}
