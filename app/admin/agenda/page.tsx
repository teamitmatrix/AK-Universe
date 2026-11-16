import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgendaView } from "@/components/admin/space/ToolsViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadAgenda, loadTaskOptions, type AgendaFilter } from "@/lib/admin/agenda";
import { oneOf } from "@/lib/admin/crm";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Agenda — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ source?: string; periode?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const sp = await searchParams;
  const filter: AgendaFilter = {
    source: oneOf(sp.source, ["commercial", "video"] as const),
    range: oneOf(sp.periode, ["semaine", "tout"] as const) || "mois",
  };
  const [lang, data, taskOptions] = await Promise.all([getAdminLang(), loadAgenda(filter), loadTaskOptions()]);
  return <AgendaView lang={lang} admin={admin} data={data} filter={filter} taskOptions={taskOptions} />;
}
