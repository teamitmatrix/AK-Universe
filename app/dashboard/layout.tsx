import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { ClientFrame } from "@/components/client/ClientFrame";
import { getClientMe } from "@/lib/client/session";
import "@/styles/client.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-cs-serif",
});

export const metadata: Metadata = {
  title: { absolute: "Espace client — AK Universe" },
  robots: { index: false, follow: false },
};

/**
 * Frame of every /dashboard/* page (Client space). This layout only DISPLAYS the customer's name; it is not the
 * access check — each page and server action calls requireClient()/getClientMe() itself.
 */
export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const me = await getClientMe();
  // Not a customer session: the page itself redirects (to /connexion or /espace).
  if (!me) return children;
  return (
    <div className={serif.variable}>
      <ClientFrame me={me}>{children}</ClientFrame>
    </div>
  );
}
