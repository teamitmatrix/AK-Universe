import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { PROCESSORS } from "@/config/company";
import { getCompany } from "@/lib/company";
import { localized } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Politique de confidentialité — AK Universe"),
    description: t("Données personnelles collectées par AK Universe, finalités, durées de conservation, cookies et droits."),
  };
}

const DATA = [
  {
    what: "Compte client : prénom, nom, e-mail, mot de passe (chiffré), organisation (nom, secteur, taille)",
    why: "Créer et gérer votre compte, vous donner accès aux agents IA",
    basis: "Exécution du contrat",
    keep: "Tant que le compte est actif, puis 3 ans",
  },
  {
    what: "Demandes de devis et réservations vidéo : coordonnées, lieu, date, message, services choisis",
    why: "Établir le devis, organiser le tournage, vous recontacter",
    basis: "Mesures précontractuelles / contrat",
    keep: "3 ans après le dernier contact",
  },
  {
    what: "Abonnements et paiements : formule, montants, références Stripe (aucune donnée de carte n'est stockée par AK Universe)",
    why: "Facturation, comptabilité",
    basis: "Contrat et obligation légale",
    keep: "10 ans (obligation comptable)",
  },
  {
    what: "E-mails envoyés (confirmation de demande, code de vérification, réinitialisation du mot de passe)",
    why: "Vous informer du suivi de votre demande ou de votre compte",
    basis: "Contrat",
    keep: "Journal d'envoi : 30 jours",
  },
];

const STORAGE = [
  { name: "sb-…-auth-token (cookie)", purpose: "Garder votre session ouverte après la connexion", type: "Nécessaire" },
  { name: "aku-lang (cookie)", purpose: "Mémoriser la langue choisie", type: "Nécessaire" },
  { name: "aku-projet (stockage local), aku-client (stockage de session)", purpose: "Conserver votre projet vidéo et vos coordonnées entre les étapes de la demande", type: "Nécessaire" },
  { name: "aku-cookie-notice (stockage local)", purpose: "Ne plus afficher l'information sur les cookies", type: "Nécessaire" },
  { name: "Cookies Stripe", purpose: "Sécuriser le paiement et prévenir la fraude, sur la page de paiement Stripe", type: "Nécessaire" },
];

export default async function ConfidentialitePage() {
  const COMPANY = await getCompany();
  const [t, data] = await Promise.all([getT(), localized({ rows: DATA, storage: STORAGE, processors: PROCESSORS })]);
  const email = <Field value={COMPANY.email} />;

  return (
    <LegalPage title={t("Politique de confidentialité")}>
      <h2>{t("Responsable du traitement")}</h2>
      <p>
        <Field value={COMPANY.legalName} />, <Field value={COMPANY.address} />.{" "}
        {t.rich("Contact pour toute question relative à vos données : <email/>.", { email: () => email })}
      </p>

      <h2>{t("Données collectées et finalités")}</h2>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th>{t("Données")}</th>
              <th>{t("Finalité")}</th>
              <th>{t("Base légale")}</th>
              <th>{t("Conservation")}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.what}>
                <td>{row.what}</td>
                <td>{row.why}</td>
                <td>{row.basis}</td>
                <td>{row.keep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>{t("Vos données ne sont jamais vendues ni utilisées à des fins publicitaires.")}</p>

      <h2>{t("Sous-traitants")}</h2>
      <p>{t("Vos données sont traitées uniquement par les prestataires nécessaires au fonctionnement du service :")}</p>
      <ul>
        {data.processors.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> — {p.role} ({p.country})
          </li>
        ))}
      </ul>

      <h2 id="cookies">{t("Cookies et stockage local")}</h2>
      <p>
        {t(
          "Ce site n'utilise ni cookie publicitaire ni outil de mesure d'audience. Seuls les éléments suivants, nécessaires au service, sont déposés ; ils ne requièrent donc pas de consentement préalable (article 82 de la loi Informatique et Libertés).",
        )}
      </p>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th>{t("Nom")}</th>
              <th>{t("Utilité")}</th>
              <th>{t("Type")}</th>
            </tr>
          </thead>
          <tbody>
            {data.storage.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.purpose}</td>
                <td>{row.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>{t("Vos droits")}</h2>
      <p>
        {t.rich(
          "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données, ainsi que du droit de définir des directives sur leur sort après votre décès. Pour les exercer, écrivez à <email/> ; nous répondons sous un mois.",
          { email: () => email },
        )}
      </p>
      <p>
        {t.rich(
          "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (<link>www.cnil.fr</link>).",
          {
            link: (c) => (
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
                {c}
              </a>
            ),
          },
        )}
      </p>

      <h2>{t("Sécurité")}</h2>
      <p>
        {t(
          "Les échanges sont chiffrés (HTTPS), les mots de passe ne sont jamais stockés en clair et l'accès aux données est limité par des règles d'accès en base de données. Les paiements sont traités par Stripe, certifié PCI-DSS niveau 1.",
        )}
      </p>
    </LegalPage>
  );
}
