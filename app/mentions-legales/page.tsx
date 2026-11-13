import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { HOST, phoneHref } from "@/config/company";
import { getCompany } from "@/lib/company";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Mentions légales — AK Universe"),
    description: t("Éditeur, hébergeur et informations légales du site AK Universe."),
  };
}

export default async function MentionsLegalesPage() {
  const COMPANY = await getCompany();
  const t = await getT();
  const email = (
    <a href={`mailto:${COMPANY.email}`}>
      <Field value={COMPANY.email} />
    </a>
  );
  const website = (url: string) => (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {url}
    </a>
  );

  return (
    <LegalPage title={t("Mentions légales")}>
      <h2>{t("Article 1 — Éditeur du site")}</h2>
      <p>{t.rich("Le site internet <site/> est édité par :", { site: () => website(COMPANY.website) })}</p>
      <p>
        <strong>
          <Field value={COMPANY.legalName} />
        </strong>
        , <Field value={t.data(COMPANY.legalForm)} />.
      </p>
      <ul>
        <li>
          <strong>{t("Siège social :")}</strong> <Field value={COMPANY.address} />
        </li>
        <li>
          <strong>SIREN :</strong> <Field value={COMPANY.siren} />
        </li>
        <li>
          <strong>SIRET :</strong> <Field value={COMPANY.siret} />
        </li>
        <li>
          <strong>RCS :</strong> <Field value={COMPANY.rcs} />
        </li>
        <li>
          <strong>{t("TVA intracommunautaire :")}</strong> <Field value={COMPANY.vat} />
        </li>
        <li>
          <strong>{t("E-mail :")}</strong> {email}
        </li>
        <li>
          <strong>{t("Téléphone :")}</strong>{" "}
          <a href={phoneHref(COMPANY.phone)}>
            <Field value={COMPANY.phone} />
          </a>
        </li>
        <li>
          <strong>{t("Site internet :")}</strong> {website(COMPANY.website)}
        </li>
      </ul>

      <h2>{t("Article 2 — Directeur de la publication")}</h2>
      <p>{t("Le directeur de la publication du site internet est :")}</p>
      <p>
        <strong>
          <Field value={t.data(COMPANY.publicationDirector)} />
        </strong>
        .
      </p>

      <h2>{t("Article 3 — Hébergement du site")}</h2>
      <p>{t("Le site internet est hébergé par :")}</p>
      <p>
        <strong>{HOST.name}</strong>
      </p>
      <ul>
        <li>
          <strong>{t("Adresse :")}</strong> {HOST.address}
        </li>
        <li>
          <strong>RCS :</strong> {HOST.rcs}
        </li>
        <li>
          <strong>{t("Téléphone :")}</strong> <a href={phoneHref(HOST.phone)}>{HOST.phone}</a>
        </li>
        <li>
          <strong>{t("E-mail :")}</strong> <a href={`mailto:${HOST.email}`}>{HOST.email}</a>
        </li>
        <li>
          <strong>{t("Site internet :")}</strong> {website(HOST.website)}
        </li>
      </ul>

      <h2>{t("Article 4 — Activités de la société")}</h2>
      <p>{t("AK UNIVERSE présente ses prestations et solutions professionnelles dans les domaines suivants :")}</p>
      <ul>
        <li>{t("Marketing et communication.")}</li>
        <li>{t("Stratégie et développement digital.")}</li>
        <li>{t("Création de contenus photographiques et audiovisuels.")}</li>
        <li>{t("Gestion des réseaux sociaux.")}</li>
        <li>{t("Création et développement de sites internet.")}</li>
        <li>{t("Solutions d'intelligence artificielle et agents IA.")}</li>
        <li>{t("Automatisation des processus professionnels.")}</li>
        <li>{t("Production et organisation de projets événementiels.")}</li>
      </ul>
      <p>{t("Les prestations sont proposées selon les conditions commerciales et contractuelles applicables.")}</p>

      <h2>{t("Article 5 — Propriété intellectuelle")}</h2>
      <p>
        {t(
          "Les éléments originaux présents sur le site, notamment les textes, photographies, vidéos, créations graphiques, logos, interfaces et autres contenus, sont protégés par le droit de la propriété intellectuelle.",
        )}
      </p>
      <p>
        {t(
          "Toute reproduction, représentation, adaptation, distribution ou exploitation non autorisée de ces éléments est interdite, sauf exception prévue par la loi.",
        )}
      </p>
      <p>{t("Les contenus appartenant à des tiers demeurent la propriété de leurs titulaires respectifs.")}</p>

      <h2>{t("Article 6 — Responsabilité")}</h2>
      <p>{t("AK UNIVERSE s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur son site.")}</p>
      <p>{t("Toutefois, des erreurs, omissions ou interruptions temporaires peuvent survenir.")}</p>
      <p>{t("AK UNIVERSE ne saurait être tenue responsable des dommages qui ne lui sont pas légalement imputables.")}</p>
      <p>
        {t("Les informations communiquées sur le site sont fournies à titre informatif, sauf engagement contractuel contraire.")}
      </p>

      <h2>{t("Article 7 — Protection des données personnelles")}</h2>
      <p>{t("AK UNIVERSE peut collecter et traiter des données personnelles dans le cadre :")}</p>
      <ul>
        <li>{t("Des formulaires de contact.")}</li>
        <li>{t("Des demandes de devis.")}</li>
        <li>{t("Des candidatures et inscriptions de talents.")}</li>
        <li>{t("Des relations commerciales.")}</li>
        <li>{t("Des fonctionnalités numériques proposées sur le site.")}</li>
      </ul>
      <p>
        {t(
          "Les traitements sont soumis au Règlement général sur la protection des données (RGPD) et à la réglementation française applicable.",
        )}
      </p>
      <p>
        {t.rich(
          "Les utilisateurs peuvent consulter la <link>Politique de confidentialité</link> afin de connaître les finalités, les bases légales, les durées de conservation, les destinataires des données et leurs droits.",
          { link: (c) => <a href="/confidentialite">{c}</a> },
        )}
      </p>
      <p>
        {t(
          "Pour exercer leurs droits d'accès, de rectification, d'effacement, d'opposition et les autres droits applicables, les personnes concernées peuvent écrire à :",
        )}{" "}
        <strong>{email}</strong>
      </p>

      <h2>{t("Article 8 — Cookies et traceurs")}</h2>
      <p>{t("Le site peut utiliser des cookies et autres traceurs nécessaires à son fonctionnement.")}</p>
      <p>
        {t(
          "D'autres cookies ou traceurs peuvent être utilisés, notamment pour la mesure d'audience, l'amélioration des services ou des opérations marketing.",
        )}
      </p>
      <p>{t("Lorsque le consentement est requis, ces traceurs ne sont utilisés qu'après l'accord de l'utilisateur.")}</p>
      <p>
        {t.rich(
          "Les utilisateurs peuvent consulter la <link>Politique de cookies</link> et gérer leurs préférences via le dispositif prévu à cet effet sur le site.",
          { link: (c) => <a href="/confidentialite#cookies">{c}</a> },
        )}
      </p>

      <h2>{t("Article 9 — Liens externes")}</h2>
      <p>{t("Le site peut contenir des liens vers des sites internet ou plateformes externes.")}</p>
      <p>{t("AK UNIVERSE ne contrôle pas systématiquement les contenus publiés sur ces sites tiers.")}</p>
      <p>{t("Chaque site externe demeure soumis à ses propres conditions d'utilisation et politiques de confidentialité.")}</p>

      <h2>{t("Article 10 — Contact")}</h2>
      <p>{t("Pour toute question concernant le site internet, les services proposés ou les présentes mentions légales :")}</p>
      <p>
        <strong>AK UNIVERSE</strong>
        <br />
        41 avenue Henri Barbusse
        <br />
        92700 Colombes, France
      </p>
      <p>
        <strong>{t("E-mail :")}</strong> {email}
      </p>
      <p>
        <strong>{t("Téléphone :")}</strong>{" "}
        <a href={phoneHref(COMPANY.phone)}>
          <Field value={COMPANY.phone} />
        </a>
      </p>
      <p>
        <strong>{t("Site :")}</strong> {website(COMPANY.website)}
      </p>

      <p>
        <strong>{t("© {year} AK UNIVERSE — Tous droits réservés.", { year: new Date().getFullYear() })}</strong>
      </p>
    </LegalPage>
  );
}
