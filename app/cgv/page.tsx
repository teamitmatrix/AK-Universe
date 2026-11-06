import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY, phoneHref } from "@/config/company";

export const metadata: Metadata = {
  title: "Conditions générales de vente et d'utilisation — AK Universe",
  description:
    "Conditions générales de vente et d'utilisation (CGV / CGU) des prestations AK Universe destinées aux professionnels.",
};

export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente et d'utilisation (CGV / CGU)">
      <h2>Article 1 — Présentation</h2>
      <p>
        Le site{" "}
        <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
          www.akuniverse.com
        </a>{" "}
        est édité par <strong>
          <Field value={COMPANY.legalName} />
        </strong>
        , SAS au capital de 6 000 €, immatriculée au RCS de Nanterre sous le numéro{" "}
        <Field value={COMPANY.siren} />, dont le siège social est situé au{" "}
        <Field value={COMPANY.address} />.
      </p>
      <p>
        Président : Sardar Iqbal
        <br />
        E-mail :{" "}
        <a href={`mailto:${COMPANY.email}`}>
          <Field value={COMPANY.email} />
        </a>
        <br />
        Téléphone :{" "}
        <a href={phoneHref(COMPANY.phone)}>
          <Field value={COMPANY.phone} />
        </a>
      </p>

      <h2>Article 2 — Objet</h2>
      <p>
        Les présentes conditions encadrent l&apos;utilisation du site internet et la vente des prestations d&apos;AK
        UNIVERSE, destinées exclusivement aux professionnels (B2B).
      </p>
      <p>
        Les prestations comprennent notamment le marketing, la communication, les services digitaux, la création de
        contenus, les agents IA et l&apos;automatisation.
      </p>

      <h2>Article 3 — Utilisation du site</h2>
      <p>Les utilisateurs s&apos;engagent à utiliser le site conformément à la législation applicable.</p>
      <p>
        Toute utilisation frauduleuse, tentative d&apos;accès non autorisé ou reproduction illicite des contenus est
        interdite.
      </p>
      <p>L&apos;envoi d&apos;une candidature via l&apos;espace Talent ne garantit aucune collaboration ou embauche.</p>

      <h2>Article 4 — Devis et commandes</h2>
      <p>
        Les prestations font l&apos;objet d&apos;une offre, d&apos;un devis ou d&apos;un contrat précisant les services,
        tarifs, délais et conditions particulières.
      </p>
      <p>La commande devient ferme selon les modalités d&apos;acceptation prévues dans ces documents.</p>

      <h2>Article 5 — Tarifs et paiement</h2>
      <p>Les tarifs sont exprimés en euros hors taxes (HT), sauf indication contraire.</p>
      <p>
        Les modalités de paiement sont définies dans le devis ou le contrat. À défaut d&apos;accord particulier, le délai
        légal de paiement est de 30 jours à compter de l&apos;exécution de la prestation.
      </p>
      <p>
        Les éventuelles remises sont précisées dans les offres commerciales. Aucun escompte n&apos;est accordé pour
        paiement anticipé, sauf accord écrit.
      </p>
      <p>
        Tout retard de paiement entraîne de plein droit des pénalités calculées au taux de refinancement de la BCE majoré
        de 10 points, ainsi qu&apos;une indemnité forfaitaire de 40 € pour frais de recouvrement, conformément à la
        réglementation B2B.
      </p>

      <h2>Article 6 — Exécution des prestations</h2>
      <p>AK UNIVERSE s&apos;engage à réaliser les prestations conformément aux engagements contractuels.</p>
      <p>Le client doit fournir les informations, documents, accès et validations nécessaires.</p>
      <p>Toute modification importante du périmètre initial peut faire l&apos;objet d&apos;un devis complémentaire.</p>

      <h2>Article 7 — Abonnements et résiliation</h2>
      <p>
        Les durées d&apos;engagement, modalités de renouvellement, conditions de résiliation et éventuels préavis sont
        définis dans le devis ou contrat accepté.
      </p>
      <p>
        Les prestations effectivement réalisées restent dues selon les conditions contractuelles et la loi applicable.
      </p>

      <h2>Article 8 — Intelligence artificielle et services digitaux</h2>
      <p>Les agents IA et solutions numériques peuvent dépendre de services tiers.</p>
      <p>
        Les résultats générés automatiquement peuvent comporter des erreurs et nécessiter une vérification humaine.
      </p>
      <p>
        AK UNIVERSE précise les fonctionnalités, limites, conditions de maintenance et éventuels frais de consommation
        dans les offres concernées.
      </p>

      <h2>Article 9 — Responsabilité</h2>
      <p>AK UNIVERSE met en œuvre les moyens convenus pour exécuter ses prestations.</p>
      <p>
        Sauf engagement contractuel spécifique, aucun résultat commercial, chiffre d&apos;affaires ou positionnement sur
        les moteurs de recherche n&apos;est garanti.
      </p>
      <p>La responsabilité des parties reste soumise aux règles légales et contractuelles applicables.</p>

      <h2>Article 10 — Propriété intellectuelle</h2>
      <p>Les contenus et créations du site sont protégés par le droit de la propriété intellectuelle.</p>
      <p>
        Les droits d&apos;utilisation ou de cession des livrables réalisés pour un client sont définis dans les
        documents contractuels.
      </p>
      <p>Toute exploitation non autorisée des contenus protégés est interdite, sauf exception légale.</p>

      <h2>Article 11 — Confidentialité et données personnelles</h2>
      <p>
        AK UNIVERSE s&apos;engage à respecter la confidentialité des informations professionnelles échangées dans le
        cadre des prestations.
      </p>
      <p>
        Les données personnelles sont traitées conformément au RGPD et à la{" "}
        <a href="/confidentialite">Politique de confidentialité</a> du site.
      </p>
      <p>
        Lorsque nécessaire, les traitements de données réalisés pour un client sont encadrés par un accord de
        sous-traitance spécifique.
      </p>
      <p>
        Contact :{" "}
        <a href={`mailto:${COMPANY.email}`}>
          <Field value={COMPANY.email} />
        </a>
      </p>

      <h2>Article 12 — Droit applicable et litiges</h2>
      <p>Les présentes conditions sont soumises au droit français.</p>
      <p>
        En cas de différend, les parties privilégient une résolution amiable avant de saisir les juridictions
        compétentes.
      </p>
      <p>
        Les protections légales applicables à certains professionnels, notamment pour les contrats conclus hors
        établissement, demeurent réservées.
      </p>

      <hr />

      <p>
        <strong>AK UNIVERSE</strong>
        <br />
        <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
          www.akuniverse.com
        </a>
        <br />
        <a href={`mailto:${COMPANY.email}`}>
          <Field value={COMPANY.email} />
        </a>
      </p>
      <p>
        <strong>© {new Date().getFullYear()} AK UNIVERSE — Tous droits réservés.</strong>
      </p>
    </LegalPage>
  );
}
