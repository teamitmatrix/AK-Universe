import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProspectRecordView } from "@/components/admin/space/CrmRecords";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadProspectRecord } from "@/lib/admin/crm";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Prospect — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function ProspectDetailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const prospect = await loadProspectRecord((await searchParams).id ?? "");
  if (!prospect) notFound();
  return <ProspectRecordView lang={await getAdminLang()} admin={admin} prospect={prospect} />;
}
