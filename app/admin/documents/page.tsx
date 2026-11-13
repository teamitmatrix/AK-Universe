import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentsView } from "@/components/admin/space/ToolsViews";
import { getAdminIdentity } from "@/lib/admin/identity";
import { loadDocuments } from "@/lib/admin/documents";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "Documents — Admin AK Universe" },
  robots: { index: false, follow: false },
};

export default async function DocumentsPage() {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const [lang, data] = await Promise.all([getLang(), loadDocuments()]);
  return <DocumentsView lang={lang} admin={admin} data={data} />;
}
