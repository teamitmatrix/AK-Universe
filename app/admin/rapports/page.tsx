import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RapportsView } from "@/components/admin/space/ToolsViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { oneOf } from "@/lib/admin/crm";
import { REPORT_PERIODS, loadReports } from "@/lib/admin/reports";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Rapports & statistiques — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function RapportsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const period = oneOf((await searchParams).periode, REPORT_PERIODS) || "12m";
  const [lang, data] = await Promise.all([getLang(), loadReports(period)]);
  return <RapportsView lang={lang} admin={admin} data={data} />;
}
