import type { Metadata } from "next";
import { CommercialFrame } from "@/components/commercial/CommercialFrame";
import { getLang } from "@/i18n/server";
import { getCommercial } from "@/lib/commercial/session";
import "@/styles/admin.css";
import "@/styles/commercial.css";

export const metadata: Metadata = {
  title: { absolute: "Espace commercial — AK Universe" },
  robots: { index: false, follow: false },
};

/**
 * Frame of every /commercial/* page: sidebar + header with the global search and the notification center
 * (handoff: "injected into every Commercial page's header"). Same building blocks as the admin space (.adm),
 * re-themed in the AK Universe black & gold (commercial.css).
 *
 * This layout only DISPLAYS the rep's name; it is not the access check. Each page and server action calls
 * requireCommercial()/getCommercial() itself, because a layout does not re-run on client-side navigation.
 */
export default async function CommercialLayout({ children }: { children: React.ReactNode }) {
  const me = await getCommercial();
  // Not an active sales rep: the page itself redirects (to /connexion or /espace).
  if (!me) return children;
  return (
    <CommercialFrame lang={await getLang()} me={me}>
      {children}
    </CommercialFrame>
  );
}
