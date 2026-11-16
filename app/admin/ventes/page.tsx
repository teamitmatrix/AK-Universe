import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VentesView } from "@/components/admin/space/CrmViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { LEDGER_PERIODS, loadLedger, oneOf, repParam, type LedgerFilter } from "@/lib/admin/crm";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Ventes — Admin AK Universe" },
  robots: { index: false, follow: false },
};

type Params = { periode?: string; commercial?: string; statut?: string; type?: string };

export default async function VentesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: LedgerFilter = {
    period: oneOf(sp.periode, LEDGER_PERIODS) || "mois",
    commercial: repParam(sp.commercial),
    state: oneOf(sp.statut, ["solde", "a-encaisser"] as const),
    type: oneOf(sp.type, ["video", "abonnement", "facture"] as const),
  };
  const [lang, data] = await Promise.all([getAdminLang(), loadLedger(filter)]);
  return <VentesView lang={lang} admin={admin} data={data} filter={filter} />;
}
