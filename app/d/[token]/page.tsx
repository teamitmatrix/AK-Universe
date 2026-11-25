import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentSheet } from "@/components/commercial/DocumentSheet";
import { PrintBar } from "@/components/commercial/PrintBar";
import { isShareToken, loadSalesDocByShareToken } from "@/lib/commercial/document-share";
import { getCompany } from "@/lib/company";
import "@/styles/commercial-doc.css";

export const metadata: Metadata = {
  title: { absolute: "Document — AK Universe" },
  robots: { index: false, follow: false },
};

/** Public quote / invoice view opened from the client e-mail (tokenized, no login). */
export default async function SharedDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isShareToken(token)) notFound();
  const [doc, company] = await Promise.all([loadSalesDocByShareToken(token), getCompany()]);
  if (!doc) notFound();
  const isQuote = doc.kind === "devis";

  return (
    <div className="doc-page">
      <PrintBar
        title={`${isQuote ? "Devis" : "Facture"} ${doc.number}`}
        closeHref="/"
        closeLabel="Accueil"
      />
      <DocumentSheet doc={doc} company={company} shareToken={token} />
    </div>
  );
}
