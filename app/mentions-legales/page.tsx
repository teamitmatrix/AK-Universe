import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY, HOST } from "@/config/company";

export const metadata: Metadata = {
  title: "Mentions légales — AK Universe",
  description: "Éditeur, hébergeur et informations légales du site AK Universe.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur du site</h2>
      <p>
        <Field value={COMPANY.legalName} /> — <Field value={COMPANY.legalForm} />
        <br />
        Siège social : <Field value={COMPANY.address} />
        <br />
        SIRET : <Field value={COMPANY.siret} /> — <Field value={COMPANY.rcs} />
        <br />
        N° de TVA intracommunautaire : <Field value={COMPANY.vat} />
        <br />
        E-mail : <Field value={COMPANY.email} /> — Téléphone : <Field value={COMPANY.phone} />
      </p>
      <p>
        Directeur de la publication : <Field value={COMPANY.publicationDirector} />
      </p>

      <h2>Hébergeur</h2>
      <p>
        {HOST.name}
        <br />
        {HOST.address}
        <br />
        <a href={HOST.website} target="_blank" rel="noopener noreferrer">
          {HOST.website}
        </a>
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des contenus de ce site (textes, logos, images, vidéos, éléments graphiques) est la propriété
        d&apos;AK Universe ou de ses partenaires et est protégé par le droit de la propriété intellectuelle. Toute
        reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable est interdite.
      </p>

      <h2>Données personnelles et cookies</h2>
      <p>
        Le traitement de vos données personnelles est décrit dans notre{" "}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Responsabilité</h2>
      <p>
        AK Universe s&apos;efforce d&apos;assurer l&apos;exactitude des informations publiées sur ce site, sans pouvoir
        en garantir l&apos;exhaustivité. Les liens vers des sites tiers n&apos;engagent pas la responsabilité
        d&apos;AK Universe. La traduction automatique proposée dans les autres langues est fournie à titre indicatif :
        seule la version française fait foi.
      </p>
    </LegalPage>
  );
}
