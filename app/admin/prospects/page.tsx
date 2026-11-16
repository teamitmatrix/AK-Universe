import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProspectsView } from "@/components/admin/space/CrmViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadProspects, oneOf, repParam, type ProspectFilter } from "@/lib/admin/crm";
import { STAGES } from "@/lib/commercial/stages";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Prospects — Admin AK Universe" },
  robots: { index: false, follow: false },
};

type Params = { etape?: string; commercial?: string; q?: string };

export default async function ProspectsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: ProspectFilter = {
    stage: oneOf(sp.etape, STAGES),
    commercial: repParam(sp.commercial),
    q: String(sp.q ?? "").slice(0, 100),
  };
  const [lang, data] = await Promise.all([getAdminLang(), loadProspects(filter)]);
  return <ProspectsView lang={lang} admin={admin} data={data} filter={filter} />;
}
