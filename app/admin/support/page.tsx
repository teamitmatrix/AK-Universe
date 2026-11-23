import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupportListView } from "@/components/admin/space/SupportInbox";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadSupportBoard } from "@/lib/admin/support";
import { oneOf } from "@/lib/admin/crm";
import { isTicketStatus } from "@/lib/client/support-content";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Support clients — Admin AK Universe" },
  robots: { index: false, follow: false },
};

const STATUSES = ["ouvert", "en_cours", "en_attente", "resolu", "ferme"] as const;

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const status = oneOf(sp.statut, STATUSES);
  const q = String(sp.q ?? "").slice(0, 100);
  const [lang, data] = await Promise.all([getAdminLang(), loadSupportBoard({ status: status && isTicketStatus(status) ? status : null, q })]);
  return <SupportListView lang={lang} admin={admin} ready={data.ready} tickets={data.tickets} counts={data.counts} filter={{ status, q }} />;
}
