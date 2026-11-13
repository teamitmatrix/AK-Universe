import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { phoneHref } from "@/config/company";
import { getCompany } from "@/lib/company";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Conditions générales de vente et d'utilisation — AK Universe"),
    description: t(
      "Conditions générales de vente et d'utilisation (CGV / CGU) des prestations AK Universe destinées aux professionnels.",
    ),
  };
}

export default async function CgvPage() {
  const COMPANY = await getCompany();
  const t = await getT();
  const site = (
    <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
      www.akuniverse.com
    </a>
  );
  const email = (
    <a href={`mailto:${COMPANY.email}`}>
      <Field value={COMPANY.email} />
    </a>
  );

  return (
    <LegalPage title={t("Conditions générales de vente et d'utilisation (CGV / CGU)")}>
      <h2>{t("Article 1 — Présentation")}</h2>
      <p>
        {t.rich(
          "Le site <site/> est édité par <name/>, SAS au capital de 6 000 €, immatriculée au RCS de Nanterre sous le numéro <siren/>, dont le siège social est situé au <address/>.",
          {
            site: () => site,
            name: () => (
              <strong>
                <Field value={COMPANY.legalName} />
              </strong>
            ),
            siren: () => <Field value={COMPANY.siren} />,
            address: () => <Field value={COMPANY.address} />,
          },
        )}
      </p>
      <p>
        {t("Président : Sardar Iqbal")}
        <br />
        {t("E-mail :")} {email}
        <br />
        {t("Téléphone :")}{" "}
        <a href={phoneHref(COMPANY.phone)}>
          <Field value={COMPANY.phone} />
        </a>
      </p>

      <h2>{t("Article 2 — Objet")}</h2>
      <p>
        {t(
          "Les présentes conditions encadrent l'utilisation du site internet et la vente des prestations d'AK UNIVERSE, destinées exclusivement aux professionnels (B2B).",
        )}
      </p>
      <p>
        {t(
          "Les prestations comprennent notamment le marketing, la communication, les services digitaux, la création de contenus, les agents IA et l'automatisation.",
        )}
      </p>

      <h2>{t("Article 3 — Utilisation du site")}</h2>
      <p>{t("Les utilisateurs s'engagent à utiliser le site conformément à la législation applicable.")}</p>
      <p>
        {t(
          "Toute utilisation frauduleuse, tentative d'accès non autorisé ou reproduction illicite des contenus est interdite.",
        )}
      </p>
      <p>{t("L'envoi d'une candidature via l'espace Talent ne garantit aucune collaboration ou embauche.")}</p>

      <h2>{t("Article 4 — Devis et commandes")}</h2>
      <p>
        {t(
          "Les prestations font l'objet d'une offre, d'un devis ou d'un contrat précisant les services, tarifs, délais et conditions particulières.",
        )}
      </p>
      <p>{t("La commande devient ferme selon les modalités d'acceptation prévues dans ces documents.")}</p>

      <h2>{t("Article 5 — Tarifs et paiement")}</h2>
      <p>{t("Les tarifs sont exprimés en euros hors taxes (HT), sauf indication contraire.")}</p>
      <p>
        {t(
          "Les modalités de paiement sont définies dans le devis ou le contrat. À défaut d'accord particulier, le délai légal de paiement est de 30 jours à compter de l'exécution de la prestation.",
        )}
      </p>
      <p>
        {t(
          "Les éventuelles remises sont précisées dans les offres commerciales. Aucun escompte n'est accordé pour paiement anticipé, sauf accord écrit.",
        )}
      </p>
      <p>
        {t(
          "Tout retard de paiement entraîne de plein droit des pénalités calculées au taux de refinancement de la BCE majoré de 10 points, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement, conformément à la réglementation B2B.",
        )}
      </p>

      <h2>{t("Article 6 — Exécution des prestations")}</h2>
      <p>{t("AK UNIVERSE s'engage à réaliser les prestations conformément aux engagements contractuels.")}</p>
      <p>{t("Le client doit fournir les informations, documents, accès et validations nécessaires.")}</p>
      <p>{t("Toute modification importante du périmètre initial peut faire l'objet d'un devis complémentaire.")}</p>

      <h2>{t("Article 7 — Abonnements et résiliation")}</h2>
      <p>
        {t(
          "Les durées d'engagement, modalités de renouvellement, conditions de résiliation et éventuels préavis sont définis dans le devis ou contrat accepté.",
        )}
      </p>
      <p>
        {t("Les prestations effectivement réalisées restent dues selon les conditions contractuelles et la loi applicable.")}
      </p>

      <h2>{t("Article 8 — Intelligence artificielle et services digitaux")}</h2>
      <p>{t("Les agents IA et solutions numériques peuvent dépendre de services tiers.")}</p>
      <p>{t("Les résultats générés automatiquement peuvent comporter des erreurs et nécessiter une vérification humaine.")}</p>
      <p>
        {t(
          "AK UNIVERSE précise les fonctionnalités, limites, conditions de maintenance et éventuels frais de consommation dans les offres concernées.",
        )}
      </p>

      <h2>{t("Article 9 — Responsabilité")}</h2>
      <p>{t("AK UNIVERSE met en œuvre les moyens convenus pour exécuter ses prestations.")}</p>
      <p>
        {t(
          "Sauf engagement contractuel spécifique, aucun résultat commercial, chiffre d'affaires ou positionnement sur les moteurs de recherche n'est garanti.",
        )}
      </p>
      <p>{t("La responsabilité des parties reste soumise aux règles légales et contractuelles applicables.")}</p>

      <h2>{t("Article 10 — Propriété intellectuelle")}</h2>
      <p>{t("Les contenus et créations du site sont protégés par le droit de la propriété intellectuelle.")}</p>
      <p>
        {t(
          "Les droits d'utilisation ou de cession des livrables réalisés pour un client sont définis dans les documents contractuels.",
        )}
      </p>
      <p>{t("Toute exploitation non autorisée des contenus protégés est interdite, sauf exception légale.")}</p>

      <h2>{t("Article 11 — Confidentialité et données personnelles")}</h2>
      <p>
        {t(
          "AK UNIVERSE s'engage à respecter la confidentialité des informations professionnelles échangées dans le cadre des prestations.",
        )}
      </p>
      <p>
        {t.rich(
          "Les données personnelles sont traitées conformément au RGPD et à la <link>Politique de confidentialité</link> du site.",
          { link: (c) => <a href="/confidentialite">{c}</a> },
        )}
      </p>
      <p>
        {t(
          "Lorsque nécessaire, les traitements de données réalisés pour un client sont encadrés par un accord de sous-traitance spécifique.",
        )}
      </p>
      <p>
        {t("Contact :")} {email}
      </p>

      <h2>{t("Article 12 — Droit applicable et litiges")}</h2>
      <p>{t("Les présentes conditions sont soumises au droit français.")}</p>
      <p>
        {t(
          "En cas de différend, les parties privilégient une résolution amiable avant de saisir les juridictions compétentes.",
        )}
      </p>
      <p>
        {t(
          "Les protections légales applicables à certains professionnels, notamment pour les contrats conclus hors établissement, demeurent réservées.",
        )}
      </p>

      <hr />

      <p>
        <strong>AK UNIVERSE</strong>
        <br />
        {site}
        <br />
        {email}
      </p>
      <p>
        <strong>{t("© {year} AK UNIVERSE — Tous droits réservés.", { year: new Date().getFullYear() })}</strong>
      </p>
    </LegalPage>
  );
}
