import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideasteDetailView } from "@/components/admin/space/TeamViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadVideasteDetail } from "@/lib/admin/team";
import { loadTaskOptions } from "@/lib/admin/agenda";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Vidéaste — Admin AK Universe" },
  robots: { index: false, follow: false },
};

/** /admin/videaste-detail?id=<profile id> (the old /admin/videaste-detail.html?id= URL redirects here). */
export default async function VideasteDetailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const { id } = await searchParams;
  const [lang, data, taskOptions] = await Promise.all([getAdminLang(), loadVideasteDetail(String(id ?? "")), loadTaskOptions()]);
  if (!data) notFound();
  return <VideasteDetailView lang={lang} admin={admin} data={data} taskOptions={taskOptions} />;
}
