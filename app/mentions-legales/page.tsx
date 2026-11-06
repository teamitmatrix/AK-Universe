import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY, HOST, phoneHref } from "@/config/company";

export const metadata: Metadata = {
  title: "Mentions légales — AK Universe",
  description: "Éditeur, hébergeur et informations légales du site AK Universe.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Article 1 — Éditeur du site</h2>
      <p>
        Le site internet{" "}
        <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
          {COMPANY.website}
        </a>{" "}
        est édité par :
      </p>
      <p>
        <strong>
          <Field value={COMPANY.legalName} />
        </strong>
        , <Field value={COMPANY.legalForm} />.
      </p>
      <ul>
        <li>
          <strong>Siège social :</strong> <Field value={COMPANY.address} />
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
          <strong>TVA intracommunautaire :</strong> <Field value={COMPANY.vat} />
        </li>
        <li>
          <strong>E-mail :</strong>{" "}
          <a href={`mailto:${COMPANY.email}`}>
            <Field value={COMPANY.email} />
          </a>
        </li>
        <li>
          <strong>Téléphone :</strong>{" "}
          <a href={phoneHref(COMPANY.phone)}>
            <Field value={COMPANY.phone} />
          </a>
        </li>
        <li>
          <strong>Site internet :</strong>{" "}
          <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
            {COMPANY.website}
          </a>
        </li>
      </ul>

      <h2>Article 2 — Directeur de la publication</h2>
      <p>Le directeur de la publication du site internet est :</p>
      <p>
        <strong>
          <Field value={COMPANY.publicationDirector} />
        </strong>
        .
      </p>

      <h2>Article 3 — Hébergement du site</h2>
      <p>Le site internet est hébergé par :</p>
      <p>
        <strong>{HOST.name}</strong>
      </p>
      <ul>
        <li>
          <strong>Adresse :</strong> {HOST.address}
        </li>
        <li>
          <strong>RCS :</strong> {HOST.rcs}
        </li>
        <li>
          <strong>Téléphone :</strong> <a href={phoneHref(HOST.phone)}>{HOST.phone}</a>
        </li>
        <li>
          <strong>E-mail :</strong> <a href={`mailto:${HOST.email}`}>{HOST.email}</a>
        </li>
        <li>
          <strong>Site internet :</strong>{" "}
          <a href={HOST.website} target="_blank" rel="noopener noreferrer">
            {HOST.website}
          </a>
        </li>
      </ul>

      <h2>Article 4 — Activités de la société</h2>
      <p>AK UNIVERSE présente ses prestations et solutions professionnelles dans les domaines suivants :</p>
      <ul>
        <li>Marketing et communication.</li>
        <li>Stratégie et développement digital.</li>
        <li>Création de contenus photographiques et audiovisuels.</li>
        <li>Gestion des réseaux sociaux.</li>
        <li>Création et développement de sites internet.</li>
        <li>Solutions d&apos;intelligence artificielle et agents IA.</li>
        <li>Automatisation des processus professionnels.</li>
        <li>Production et organisation de projets événementiels.</li>
      </ul>
      <p>Les prestations sont proposées selon les conditions commerciales et contractuelles applicables.</p>

      <h2>Article 5 — Propriété intellectuelle</h2>
      <p>
        Les éléments originaux présents sur le site, notamment les textes, photographies, vidéos, créations graphiques,
        logos, interfaces et autres contenus, sont protégés par le droit de la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, adaptation, distribution ou exploitation non autorisée de ces éléments est
        interdite, sauf exception prévue par la loi.
      </p>
      <p>Les contenus appartenant à des tiers demeurent la propriété de leurs titulaires respectifs.</p>

      <h2>Article 6 — Responsabilité</h2>
      <p>AK UNIVERSE s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations diffusées sur son site.</p>
      <p>Toutefois, des erreurs, omissions ou interruptions temporaires peuvent survenir.</p>
      <p>AK UNIVERSE ne saurait être tenue responsable des dommages qui ne lui sont pas légalement imputables.</p>
      <p>
        Les informations communiquées sur le site sont fournies à titre informatif, sauf engagement contractuel contraire.
      </p>

      <h2>Article 7 — Protection des données personnelles</h2>
      <p>AK UNIVERSE peut collecter et traiter des données personnelles dans le cadre :</p>
      <ul>
        <li>Des formulaires de contact.</li>
        <li>Des demandes de devis.</li>
        <li>Des candidatures et inscriptions de talents.</li>
        <li>Des relations commerciales.</li>
        <li>Des fonctionnalités numériques proposées sur le site.</li>
      </ul>
      <p>
        Les traitements sont soumis au Règlement général sur la protection des données (RGPD) et à la réglementation
        française applicable.
      </p>
      <p>
        Les utilisateurs peuvent consulter la{" "}
        <a href="/confidentialite">Politique de confidentialité</a> afin de connaître les finalités, les bases légales,
        les durées de conservation, les destinataires des données et leurs droits.
      </p>
      <p>
        Pour exercer leurs droits d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition et les autres
        droits applicables, les personnes concernées peuvent écrire à :{" "}
        <a href={`mailto:${COMPANY.email}`}>
          <strong>
            <Field value={COMPANY.email} />
          </strong>
        </a>
      </p>

      <h2>Article 8 — Cookies et traceurs</h2>
      <p>Le site peut utiliser des cookies et autres traceurs nécessaires à son fonctionnement.</p>
      <p>
        D&apos;autres cookies ou traceurs peuvent être utilisés, notamment pour la mesure d&apos;audience,
        l&apos;amélioration des services ou des opérations marketing.
      </p>
      <p>Lorsque le consentement est requis, ces traceurs ne sont utilisés qu&apos;après l&apos;accord de l&apos;utilisateur.</p>
      <p>
        Les utilisateurs peuvent consulter la{" "}
        <a href="/confidentialite#cookies">Politique de cookies</a> et gérer leurs préférences via le dispositif prévu
        à cet effet sur le site.
      </p>

      <h2>Article 9 — Liens externes</h2>
      <p>Le site peut contenir des liens vers des sites internet ou plateformes externes.</p>
      <p>AK UNIVERSE ne contrôle pas systématiquement les contenus publiés sur ces sites tiers.</p>
      <p>Chaque site externe demeure soumis à ses propres conditions d&apos;utilisation et politiques de confidentialité.</p>

      <h2>Article 10 — Contact</h2>
      <p>Pour toute question concernant le site internet, les services proposés ou les présentes mentions légales :</p>
      <p>
        <strong>AK UNIVERSE</strong>
        <br />
        41 avenue Henri Barbusse
        <br />
        92700 Colombes, France
      </p>
      <p>
        <strong>E-mail :</strong>{" "}
        <a href={`mailto:${COMPANY.email}`}>
          <Field value={COMPANY.email} />
        </a>
      </p>
      <p>
        <strong>Téléphone :</strong>{" "}
        <a href={phoneHref(COMPANY.phone)}>
          <Field value={COMPANY.phone} />
        </a>
      </p>
      <p>
        <strong>Site :</strong>{" "}
        <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
          {COMPANY.website}
        </a>
      </p>

      <p>
        <strong>© {new Date().getFullYear()} AK UNIVERSE — Tous droits réservés.</strong>
      </p>
    </LegalPage>
  );
}
