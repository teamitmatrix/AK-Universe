import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevisFacturesView } from "@/components/admin/space/CrmViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadQuotes, oneOf, repParam, type QuoteFilter } from "@/lib/admin/crm";
import { loadSalesCatalogue } from "@/lib/commercial/catalogue";
import { DOC_STATUSES, type DocKind } from "@/lib/commercial/commission-rules";
import { loadRates } from "@/lib/commercial/sales-docs";
import { createClient } from "@/lib/supabase/server";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Devis & factures — Admin AK Universe" },
  robots: { index: false, follow: false },
};

type Params = { statut?: string; type?: string; commercial?: string; nouveau?: string };

async function loadAdminClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, company, email, phone")
    .order("name")
    .limit(2000);
  if (error) return [];
  return (data ?? [])
    .filter((c) => c.name)
    .map((c) => ({
      id: c.id as string,
      name: ((c.company as string | null) || (c.name as string)) as string,
      email: (c.email as string | null) ?? "",
      phone: (c.phone as string | null) ?? "",
    }));
}

export default async function DevisFacturesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: QuoteFilter = {
    status: oneOf(sp.statut, DOC_STATUSES),
    type: oneOf(sp.type, ["devis", "facture"] as const),
    commercial: repParam(sp.commercial),
  };
  const initialNew: DocKind | null = sp.nouveau === "facture" ? "facture" : sp.nouveau === "devis" ? "devis" : null;
  const [lang, data, catalogue, rates, clients] = await Promise.all([
    getAdminLang(),
    loadQuotes(filter),
    loadSalesCatalogue(),
    loadRates(),
    loadAdminClients(),
  ]);
  return (
    <DevisFacturesView
      lang={lang}
      admin={admin}
      data={data}
      filter={filter}
      catalogue={catalogue}
      rates={rates}
      clients={clients}
      initialNew={initialNew}
    />
  );
}
