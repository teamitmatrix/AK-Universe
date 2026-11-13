import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParametresView, SETTINGS_TABS } from "@/components/admin/space/ToolsViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { oneOf } from "@/lib/admin/crm";
import { loadSettings } from "@/lib/admin/settings";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Paramètres — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function ParametresPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const tab = oneOf((await searchParams).onglet, SETTINGS_TABS) || "profil";
  const [lang, data] = await Promise.all([getLang(), loadSettings()]);
  return <ParametresView lang={lang} admin={admin} data={data} tab={tab} />;
}
