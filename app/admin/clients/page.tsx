import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientsView } from "@/components/admin/space/CrmViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadClients, oneOf, repParam, type ClientFilter } from "@/lib/admin/crm";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Clients — Admin AK Universe" },
  robots: { index: false, follow: false },
};

type Params = { statut?: string; commercial?: string; q?: string };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Params> }) {
  // Server-side role check on every request (the proxy only guarantees a session).
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: ClientFilter = {
    status: oneOf(sp.statut, ["actif", "ancien"] as const),
    commercial: repParam(sp.commercial),
    q: String(sp.q ?? "").slice(0, 100),
  };
  const [lang, data] = await Promise.all([getAdminLang(), loadClients(filter)]);
  return <ClientsView lang={lang} admin={admin} data={data} filter={filter} />;
}
