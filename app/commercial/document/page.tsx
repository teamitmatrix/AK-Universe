import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintBar } from "@/components/commercial/PrintBar";
import { DocumentSheet } from "@/components/commercial/DocumentSheet";
import { loadSalesDoc } from "@/lib/commercial/sales-docs";
import { requireCommercial } from "@/lib/commercial/session";
import { isUuid } from "@/lib/admin/team";
import { getCompany } from "@/lib/company";
import "@/styles/commercial-doc.css";

export const metadata: Metadata = {
  title: { absolute: "Document — AK Universe" },
  robots: { index: false, follow: false },
};

/**
 * commercial/document.html (handoff page 11): printable quote / invoice, opened by "Voir / télécharger".
 * A page of its own (no sidebar): "Télécharger en PDF" is the browser's print-to-PDF — no PDF library.
 * Only the signed-in rep's own document is shown (requireCommercial + loadSalesDoc filter + RLS).
 */
export default async function DocumentPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const me = await requireCommercial(`/commercial/document${id ? `?id=${encodeURIComponent(id)}` : ""}`);
  if (!id || !isUuid(id)) notFound();
  const [doc, company] = await Promise.all([loadSalesDoc(me, id), getCompany()]);
  if (!doc) notFound();
  const isQuote = doc.kind === "devis";

  return (
    <div className="doc-page">
      <PrintBar title={`${isQuote ? "Devis" : "Facture"} ${doc.number}`} />
      <DocumentSheet doc={doc} company={company} />
    </div>
  );
}
