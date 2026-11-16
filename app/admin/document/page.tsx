import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/commercial/DocumentSheet";
import { PrintBar } from "@/components/commercial/PrintBar";
import { getAdminIdentity } from "@/lib/admin/identity";
import { isUuid } from "@/lib/admin/team";
import { loadSalesDocById } from "@/lib/commercial/sales-docs";
import { getCompany } from "@/lib/company";
import "@/styles/commercial-doc.css";

export const metadata: Metadata = {
  title: { absolute: "Aperçu du document — Admin AK Universe" },
  robots: { index: false, follow: false },
};

/** Printable quote or invoice for an admin. RLS plus the admin check: a commercial cannot open another rep's document here. */
export default async function AdminDocumentPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const admin = await getAdminIdentity();
  if (!admin) notFound();
  const { id } = await searchParams;
  if (!id || !isUuid(id)) notFound();
  const [doc, company] = await Promise.all([loadSalesDocById(id), getCompany()]);
  if (!doc) notFound();
  const isQuote = doc.kind === "devis";

  return (
    <div className="doc-page">
      <PrintBar title={`${isQuote ? "Devis" : "Facture"} ${doc.number}`} closeHref="/admin/devis-factures" />
      <DocumentSheet doc={doc} company={company} />
    </div>
  );
}
