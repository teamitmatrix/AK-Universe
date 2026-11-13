import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommercialDetailView } from "@/components/admin/space/TeamViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadCommercialDetail } from "@/lib/admin/team";
import { loadTaskOptions } from "@/lib/admin/agenda";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Commercial — Admin AK Universe" },
  robots: { index: false, follow: false },
};

/** /admin/commercial-detail?id=<profile id> (the old /admin/commercial-detail.html?id= URL redirects here). */
export default async function CommercialDetailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const { id } = await searchParams;
  const [lang, data, taskOptions] = await Promise.all([getLang(), loadCommercialDetail(String(id ?? "")), loadTaskOptions()]);
  if (!data) notFound();
  return <CommercialDetailView lang={lang} admin={admin} data={data} taskOptions={taskOptions} />;
}
