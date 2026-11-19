import type { Metadata } from "next";
import { Field, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/config/company";

export const metadata: Metadata = {
  title: "Politique de confidentialité — AK Universe",
  description: "Données personnelles collectées par AK Universe, finalités, durées de conservation, cookies et droits.",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="7 novembre 2026">
      <h2>1. Responsable du traitement</h2>
      <p>
        Le site{" "}
        <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
          www.akuniverse.com
        </a>{" "}
        est exploité par :
      </p>
      <p>
        <strong>
          <Field value={COMPANY.legalName} />
        </strong>
      </p>
      <ul>
        <li>
          <strong>Adresse :</strong> <Field value={COMPANY.address} />
        </li>
        <li>
          <strong>E-mail :</strong>{" "}
          <a href={`mailto:${COMPANY.email}`}>
            <Field value={COMPANY.email} />
          </a>
        </li>
        <li>
          <strong>Site internet :</strong>{" "}
          <a href={COMPANY.website} target="_blank" rel="noopener noreferrer">
            www.akuniverse.com
          </a>
        </li>
      </ul>
      <p>
        <Field value={COMPANY.legalName} /> s&apos;engage à protéger les données personnelles de ses utilisateurs
        conformément au Règlement général sur la protection des données (RGPD).
      </p>

      <h2>2. Données collectées et utilisation</h2>
      <p>Selon les services utilisés, <Field value={COMPANY.legalName} /> peut collecter :</p>
      <ul>
        <li>Nom, prénom, adresse e-mail et numéro de téléphone.</li>
        <li>Informations professionnelles et demandes de contact ou de devis.</li>
        <li>Informations nécessaires à la création et à la gestion d&apos;un compte client.</li>
        <li>Informations relatives aux commandes, abonnements et factures.</li>
        <li>CV, portfolio et informations de candidature, le cas échéant.</li>
        <li>Données nécessaires à l&apos;utilisation des services et agents IA.</li>
      </ul>
      <p>
        Ces données sont utilisées pour répondre aux demandes, fournir les prestations, gérer les comptes et les
        paiements, traiter les candidatures et respecter les obligations légales.
      </p>
      <p>
        Les traitements reposent, selon leur finalité, sur l&apos;exécution d&apos;un contrat, les mesures
        précontractuelles, les obligations légales, l&apos;intérêt légitime d&apos;<Field value={COMPANY.legalName} />{" "}
        ou le consentement lorsque celui-ci est requis.
      </p>
      <p>
        Les champs signalés comme obligatoires sont nécessaires au traitement de la demande concernée. À défaut,
        celle-ci pourrait ne pas aboutir. Les autres informations sont facultatives.
      </p>

      <h2>3. Conservation des données</h2>
      <p>Les données sont conservées uniquement pendant les durées nécessaires à leur utilisation :</p>
      <ul>
        <li>Demandes de contact et devis : jusqu&apos;à 3 ans après le dernier contact.</li>
        <li>
          Comptes clients : pendant leur utilisation, puis jusqu&apos;à 3 ans après leur fermeture, sous réserve des
          obligations légales.
        </li>
        <li>Documents comptables : 10 ans.</li>
        <li>
          Candidatures non retenues : jusqu&apos;à 3 mois après la fin du recrutement, ou jusqu&apos;à 2 ans après le
          dernier contact si leur conservation ultérieure est autorisée.
        </li>
        <li>Données liées aux prestations et agents IA : selon les durées définies pour le service concerné.</li>
      </ul>

      <h2>4. Destinataires et sécurité</h2>
      <p>
        Les données sont accessibles aux personnes habilitées d&apos;<Field value={COMPANY.legalName} /> et aux
        prestataires nécessaires au fonctionnement des services, notamment IONOS, Supabase, Stripe, Resend et Google,
        selon les fonctionnalités utilisées.
      </p>
      <p>
        Certains traitements peuvent impliquer des transferts de données hors de l&apos;Espace économique européen,
        encadrés par les garanties prévues par le RGPD.
      </p>
      <p>
        <Field value={COMPANY.legalName} /> met en œuvre des mesures techniques et organisationnelles adaptées pour
        protéger les données contre tout accès non autorisé, perte ou divulgation.
      </p>

      <h2 id="cookies">5. Cookies</h2>
      <p>
        Le site utilise des cookies et dispositifs de stockage nécessaires à son fonctionnement, notamment pour la
        connexion, la sécurité et la mémorisation des préférences.
      </p>
      <p>
        Tout cookie non essentiel éventuellement utilisé est soumis au consentement préalable de l&apos;utilisateur,
        conformément à la réglementation applicable.
      </p>

      <h2>6. Droits des utilisateurs</h2>
      <p>
        Conformément au RGPD, vous disposez, selon les conditions légales applicables, des droits d&apos;accès, de
        rectification, d&apos;effacement, d&apos;opposition, de limitation et de portabilité de vos données, ainsi que
        du droit de retirer votre consentement à tout moment.
      </p>
      <p>
        Pour exercer vos droits :{" "}
        <a href={`mailto:${COMPANY.email}`}>
          <Field value={COMPANY.email} />
        </a>
      </p>
      <p>
        Vous pouvez également déposer une réclamation auprès de la Commission nationale de l&apos;informatique et des
        libertés (CNIL) :{" "}
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        .
      </p>

      <h2>7. Modification de la politique</h2>
      <p>
        <Field value={COMPANY.legalName} /> peut modifier cette politique afin de tenir compte des évolutions légales
        ou de ses services. La version actualisée sera publiée sur le site internet.
      </p>
    </LegalPage>
  );
}
