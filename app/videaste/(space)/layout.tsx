import type { Metadata } from "next";
import { VideasteFrame } from "@/components/videaste/VideasteFrame";
import { getVideaste } from "@/lib/videaste/session";
import "@/styles/admin.css";
import "@/styles/commercial.css";
import "@/styles/videaste.css";

export const metadata: Metadata = {
  title: { absolute: "Espace vidéaste — AK Universe" },
  robots: { index: false, follow: false },
};

/**
 * Frame of every /videaste/* page (sidebar + header with the notification center), in the same AK Universe black &
 * gold as the Commercial space. This layout only DISPLAYS the videographer's name; it is not the access check —
 * each page and server action calls requireVideaste()/getVideaste() itself (layouts do not re-run on navigation).
 */
export default async function VideasteLayout({ children }: { children: React.ReactNode }) {
  const me = await getVideaste();
  // Not an active videographer: the page itself redirects (to /connexion or /espace).
  if (!me) return children;
  return <VideasteFrame me={me}>{children}</VideasteFrame>;
}
