import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PromotionsView } from "@/components/admin/space/ToolsViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadPromotions } from "@/lib/admin/promotions";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Promotions — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ nouveau?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const [lang, data, sp] = await Promise.all([getLang(), loadPromotions(), searchParams]);
  return <PromotionsView lang={lang} admin={admin} data={data} openNew={sp.nouveau === "1"} />;
}
