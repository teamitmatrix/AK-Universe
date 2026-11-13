import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardView } from "@/components/admin/space/DashboardView";
import { getAdminIdentity } from "@/lib/admin/identity";
import { isPeriod, loadDashboard } from "@/lib/admin/dashboard";
import { loadPromotions } from "@/lib/admin/promotions";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Dashboard — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  // Server-side role check on every request (the proxy only guarantees a session).
  const admin = await getAdminIdentity();
  if (!admin) notFound();

  const requested = (await searchParams).periode;
  const period = isPeriod(requested) ? requested : "30j";
  const [lang, data, promos] = await Promise.all([getLang(), loadDashboard(period), loadPromotions().catch(() => null)]);
  const promotions = promos && promos.configured && !("error" in promos) ? promos.rows.filter((r) => r.status === "active") : null;
  return <DashboardView lang={lang} admin={admin} data={data} promotions={promotions} />;
}
