import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { getTerms, renderTermsHtml } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Conditions générales de vente et d'utilisation — AK Universe",
  description:
    "Conditions générales de vente et d'utilisation (CGV / CGU) des prestations AK Universe.",
};

export default async function CgvPage() {
  const [terms, html] = await Promise.all([getTerms(), renderTermsHtml()]);
  return (
    <LegalPage title={terms.title} updatedAt={terms.label}>
      <div className="legal-html" dangerouslySetInnerHTML={{ __html: html }} />
    </LegalPage>
  );
}
