import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommissionsView } from "@/components/admin/space/CrmViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadCommissionBoard, oneOf, repParam, type CommissionFilter } from "@/lib/admin/crm";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Commissions — Admin AK Universe" },
  robots: { index: false, follow: false },
};

type Params = { statut?: string; commercial?: string };

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: CommissionFilter = {
    status: oneOf(sp.statut, ["en_attente", "validee", "a_payer", "payee"] as const),
    commercial: repParam(sp.commercial),
  };
  const [lang, data] = await Promise.all([getAdminLang(), loadCommissionBoard(filter)]);
  return <CommissionsView lang={lang} admin={admin} data={data} filter={filter} />;
}
