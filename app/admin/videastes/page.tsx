import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideastesView } from "@/components/admin/space/TeamViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadVideastes } from "@/lib/admin/team";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Vidéastes — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function VideastesPage({ searchParams }: { searchParams: Promise<{ tri?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const [lang, data, { tri }] = await Promise.all([getLang(), loadVideastes(), searchParams]);
  return <VideastesView lang={lang} admin={admin} data={data} sortByLoad={tri === "charge"} />;
}
