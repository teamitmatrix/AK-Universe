import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevisFacturesView } from "@/components/admin/space/CrmViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadQuotes, oneOf, repParam, type QuoteFilter } from "@/lib/admin/crm";
import { DOC_STATUSES } from "@/lib/commercial/commission-rules";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Devis & factures — Admin AK Universe" },
  robots: { index: false, follow: false },
};

type Params = { statut?: string; type?: string; commercial?: string };

export default async function DevisFacturesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: QuoteFilter = {
    status: oneOf(sp.statut, DOC_STATUSES),
    type: oneOf(sp.type, ["devis", "facture"] as const),
    commercial: repParam(sp.commercial),
  };
  const [lang, data] = await Promise.all([getAdminLang(), loadQuotes(filter)]);
  return <DevisFacturesView lang={lang} admin={admin} data={data} filter={filter} />;
}
