import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY, PROCESSORS } from "@/config/company";

export const metadata: Metadata = {
  title: "Politique de confidentialité — AK Universe",
  description: "Données personnelles collectées par AK Universe, finalités, durées de conservation, cookies et droits.",
};

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
  { name: "aku-language (stockage local)", purpose: "Mémoriser la langue choisie", type: "Nécessaire" },
  { name: "googtrans (cookie)", purpose: "Afficher la traduction automatique, seulement si vous choisissez une langue autre que le français ou l'anglais", type: "Fonctionnel, à votre demande" },
  { name: "aku-projet (stockage local), aku-client (stockage de session)", purpose: "Conserver votre projet vidéo et vos coordonnées entre les étapes de la demande", type: "Nécessaire" },
  { name: "aku-cookie-notice (stockage local)", purpose: "Ne plus afficher l'information sur les cookies", type: "Nécessaire" },
  { name: "Cookies Stripe", purpose: "Sécuriser le paiement et prévenir la fraude, sur la page de paiement Stripe", type: "Nécessaire" },
];

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Responsable du traitement</h2>
      <p>
        <Field value={COMPANY.legalName} />, <Field value={COMPANY.address} />. Contact pour toute question relative à
        vos données : <Field value={COMPANY.email} />.
      </p>

      <h2>Données collectées et finalités</h2>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th>Données</th>
              <th>Finalité</th>
              <th>Base légale</th>
              <th>Conservation</th>
            </tr>
          </thead>
          <tbody>
            {DATA.map((row) => (
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
      <p>Vos données ne sont jamais vendues ni utilisées à des fins publicitaires.</p>

      <h2>Sous-traitants</h2>
      <p>Vos données sont traitées uniquement par les prestataires nécessaires au fonctionnement du service :</p>
      <ul>
        {PROCESSORS.map((p) => (
          <li key={p.name}>
            <strong>{p.name}</strong> — {p.role} ({p.country})
          </li>
        ))}
      </ul>

      <h2 id="cookies">Cookies et stockage local</h2>
      <p>
        Ce site n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience. Seuls les éléments suivants,
        nécessaires au service ou activés à votre demande, sont déposés ; ils ne requièrent donc pas de consentement
        préalable (article 82 de la loi Informatique et Libertés).
      </p>
      <div className="legal-table">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Utilité</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {STORAGE.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.purpose}</td>
                <td>{row.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Lorsque vous choisissez une autre langue, la page est traduite par Google Translate : son texte est alors
        transmis à Google. Revenez au français pour désactiver la traduction.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition
        et de portabilité de vos données, ainsi que du droit de définir des directives sur leur sort après votre décès.
        Pour les exercer, écrivez à <Field value={COMPANY.email} /> ; nous répondons sous un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        ).
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS), les mots de passe ne sont jamais stockés en clair et l&apos;accès aux
        données est limité par des règles d&apos;accès en base de données. Les paiements sont traités par Stripe,
        certifié PCI-DSS niveau 1.
      </p>
    </LegalPage>
  );
}
