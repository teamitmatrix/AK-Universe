import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueView } from "@/components/admin/space/ToolsViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadCatalogue } from "@/lib/admin/catalogue";
import { loadCommissionRates } from "@/lib/admin/rates";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Catalogue & prix — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function CataloguePage() {
  // Server-side role check on every request (the proxy only guarantees a session).
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const [lang, data, rates] = await Promise.all([getAdminLang(), loadCatalogue(), loadCommissionRates()]);
  return <CatalogueView lang={lang} admin={admin} data={data} rates={rates} />;
}
