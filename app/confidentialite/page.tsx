import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { getPrivacy, renderPrivacyHtml } from "@/lib/privacy";

export const metadata: Metadata = {
  title: "Politique de confidentialité — AK Universe",
  description: "Données personnelles collectées par AK Universe, finalités, durées de conservation, cookies et droits.",
};

export default async function ConfidentialitePage() {
  const [privacy, html] = await Promise.all([getPrivacy(), renderPrivacyHtml()]);
  return (
    <LegalPage title={privacy.title} updatedAt={privacy.label}>
      <div className="legal-html" dangerouslySetInnerHTML={{ __html: html }} />
    </LegalPage>
  );
}
