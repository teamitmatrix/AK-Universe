import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { ChatWidget } from "@/components/ui/ChatWidget";
import { CookieNotice } from "@/components/ui/CookieNotice";
import { SiteTranslator } from "@/components/ui/SiteTranslator";
import { I18nProvider } from "@/i18n/client";
import { clientCatalog, getLang, getSiteLang, getT } from "@/i18n/server";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-figtree",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL(siteUrl),
    title: t("AK Universe — Agents IA pour entreprises"),
    description: t(
      "Déléguez vos tâches à des agents IA spécialisés : marketing, ventes, support client, productivité.",
    ),
    icons: { icon: { url: "/assets/img/logo.svg", type: "image/svg+xml" } },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [lang, siteLang] = await Promise.all([getLang(), getSiteLang()]);

  return (
    // Google Translate changes <html lang> and classes in the browser.
    <html lang={lang} className={figtree.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        {/*
          Google Translate rewrites text nodes, which React does not expect: without this guard React throws
          "removeChild / insertBefore: node is not a child" on the next update (facebook/react#11538).
        */}
        <script
          id="dom-translation-guard"
          dangerouslySetInnerHTML={{
            __html: `(function(){var proto=Node.prototype;if(proto.__akGuarded)return;proto.__akGuarded=true;var removeChild=proto.removeChild;proto.removeChild=function(child){if(!child||child.parentNode!==this)return child;return removeChild.call(this,child);};var insertBefore=proto.insertBefore;proto.insertBefore=function(node,ref){if(ref&&ref.parentNode!==this)ref=null;return insertBefore.call(this,node,ref);};var replaceChild=proto.replaceChild;proto.replaceChild=function(node,child){if(!child||child.parentNode!==this)return child;return replaceChild.call(this,node,child);};})();`,
          }}
        />
        <I18nProvider lang={lang} siteLang={siteLang} catalog={clientCatalog(lang)}>
          {children}
          <SiteTranslator />
          <CookieNotice />
          <ChatWidget />
        </I18nProvider>
      </body>
    </html>
  );
}
