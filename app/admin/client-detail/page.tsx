import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientRecordView } from "@/components/admin/space/CrmRecords";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadCustomerRecord } from "@/lib/admin/crm";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Client — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function ClientDetailPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const client = await loadCustomerRecord((await searchParams).id ?? "");
  if (!client) notFound();
  return <ClientRecordView lang={await getAdminLang()} admin={admin} client={client} />;
}
