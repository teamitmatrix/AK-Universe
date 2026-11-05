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
        <script
          id="dom-translation-guard"
          dangerouslySetInnerHTML={{
            __html: `(function(){var proto=Node.prototype;if(proto.__akGuarded)return;proto.__akGuarded=true;var removeChild=proto.removeChild;proto.removeChild=function(child){if(!child||child.parentNode!==this)return child;return removeChild.call(this,child);};var insertBefore=proto.insertBefore;proto.insertBefore=function(node,ref){if(ref&&ref.parentNode!==this)ref=null;return insertBefore.call(this,node,ref);};var replaceChild=proto.replaceChild;proto.replaceChild=function(node,child){if(!child||child.parentNode!==this)return child;return replaceChild.call(this,node,child);};})();`,
          }}
        />
        {children}
        <SiteTranslator />
        <CookieNotice />
        <ChatWidget />
      </body>
    </html>
  );
}
