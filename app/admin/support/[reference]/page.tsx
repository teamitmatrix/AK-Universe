import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SupportTicketView } from "@/components/admin/space/SupportInbox";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadSupportTicket } from "@/lib/admin/support";
import { getAdminLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Demande support — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function AdminSupportTicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const { reference } = await params;
  const [lang, data] = await Promise.all([getAdminLang(), loadSupportTicket(reference)]);
  if (!data.ready || !data.ticket) notFound();
  return <SupportTicketView lang={lang} admin={admin} data={data.ticket} />;
}
