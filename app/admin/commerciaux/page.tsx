import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommerciauxView } from "@/components/admin/space/TeamViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadCommerciaux } from "@/lib/admin/team";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Commerciaux — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function CommerciauxPage() {
  // Server-side role check on every request (the proxy only guarantees a session).
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const [lang, data] = await Promise.all([getLang(), loadCommerciaux()]);
  return <CommerciauxView lang={lang} admin={admin} data={data} />;
}
