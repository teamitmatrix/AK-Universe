import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/client/BillingClient";
import { longDate, money } from "@/components/client/format";
import { COMPANY } from "@/config/company";
import { getCompany } from "@/lib/company";
import { loadClientBilling } from "@/lib/client/billing";
import { countryLabel } from "@/lib/client/countries";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Contrat d'abonnement — AK Universe" } };

/**
 * The signed-in customer's subscription contract, current version: built on the server from THEIR subscription and
 * billing details only (session-scoped reads), so it can never show another customer's contract. Printable /
 * "save as PDF" from the browser. The billing rules stated here are the ones the client space applies.
 */
export default async function ContractPage() {
  const me = await requireClient("/dashboard/facturation/contrat");
  const [{ plan, profile, paymentMethod }, company] = await Promise.all([loadClientBilling(me), getCompany()]);
  if (!plan) redirect("/dashboard/facturation");

  const per = plan.interval === "year" ? "an" : "mois";
  const cityLine = [profile.postalCode, profile.city].filter(Boolean).join(" ");
  return (
    <main className="cs-page cs-contract-page">
      <div className="cs-doc-bar">
        <Link href="/dashboard/facturation" className="cs-btn-outline">
          <ArrowLeft size={16} aria-hidden="true" /> Retour à la facturation
        </Link>
        <PrintButton />
      </div>

      <article className="cs-contract" aria-label="Contrat d'abonnement">
        <header className="cs-contract-head">
          <div>
            <p className="cs-brand-doc notranslate">
              AK<span aria-hidden="true" />
              Universe
            </p>
            <p>{company.legalName}</p>
            <p>{company.address}</p>
            <p>
              SIRET : {company.siret} · TVA : {company.vat}
            </p>
          </div>
          <div className="cs-contract-ref">
            <h1>Contrat d&apos;abonnement</h1>
            <p>
              <strong>Référence :</strong> <span className="notranslate">{plan.reference}</span>
            </p>
            {plan.startedAt && (
              <p>
                <strong>Date de souscription :</strong> {longDate(plan.startedAt)}
              </p>
            )}
            <p>
              <strong>Version :</strong> actuelle, éditée le {longDate(new Date().toISOString())}
            </p>
          </div>
        </header>

        <section className="cs-contract-parties">
          <div>
            <h2>Le prestataire</h2>
            <p>
              <strong>{company.legalName}</strong>, {company.legalForm}
            </p>
            <p>RCS {company.rcs}</p>
            <p>
              {company.email} · {company.phone}
            </p>
          </div>
          <div>
            <h2>Le client</h2>
            <p>
              <strong>{profile.company || profile.fullName}</strong>
            </p>
            {profile.company && <p>{profile.fullName}</p>}
            {profile.addressLine1 && <p>{[profile.addressLine1, profile.addressLine2].filter(Boolean).join(", ")}</p>}
            {(cityLine || profile.country) && <p>{[cityLine, countryLabel(profile.country)].filter(Boolean).join(", ")}</p>}
            <p>{profile.email}</p>
            {profile.taxId && <p>TVA : {profile.taxId}</p>}
          </div>
        </section>

        <h2>Article 1 — Objet</h2>
        <p>
          Le présent contrat a pour objet l&apos;abonnement du client à l&apos;offre <strong className="notranslate">{plan.name}</strong> de la
          plateforme AK Universe Agents IA{plan.agents !== null ? `, incluant ${plan.agents} agent${plan.agents > 1 ? "s" : ""} IA` : ""}. L&apos;offre comprend :
        </p>
        <ul>
          {plan.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
          {plan.options.map((o) => (
            <li key={o.id}>Option : {o.label}</li>
          ))}
          {plan.extraUsers > 0 && (
            <li>
              {plan.extraUsers} utilisateur{plan.extraUsers > 1 ? "s" : ""} supplémentaire{plan.extraUsers > 1 ? "s" : ""}
            </li>
          )}
        </ul>

        <h2>Article 2 — Prix et facturation</h2>
        <p>
          Le prix de l&apos;abonnement est de <strong className="notranslate">{money(plan.priceCents)} HT par {per}</strong> (facturation{" "}
          {plan.cycle === "annuel" ? "annuelle" : "mensuelle"}), TVA en sus au taux en vigueur. Il est prélevé à chaque échéance sur le moyen de
          paiement enregistré par le client{paymentMethod ? ` (${paymentMethod.label})` : ""} via notre prestataire de paiement sécurisé. AK
          Universe ne conserve aucune donnée de carte bancaire. Les factures sont disponibles à tout moment dans l&apos;espace client, rubrique
          Facturation.
        </p>

        <h2>Article 3 — Durée et renouvellement</h2>
        <p>
          L&apos;abonnement a pris effet {plan.startedAt ? `le ${longDate(plan.startedAt)}` : "à la date de souscription"}. Il est conclu pour une
          période {plan.cycle === "annuel" ? "d'un an" : "d'un mois"}, renouvelable par tacite reconduction pour des périodes successives de même
          durée.{" "}
          {plan.cancelAtPeriodEnd && plan.periodEnd
            ? `Une résiliation a été demandée : l'abonnement prendra fin le ${longDate(plan.periodEnd)}, sans renouvellement.`
            : plan.periodEnd
              ? `La période en cours se termine le ${longDate(plan.periodEnd)}.`
              : ""}
        </p>

        <h2>Article 4 — Évolution de l&apos;offre</h2>
        <p>
          Le client peut faire évoluer son offre depuis son espace client. Le passage à une offre supérieure ou l&apos;ajout d&apos;une option
          prend effet immédiatement : seule la différence calculée au prorata de la période en cours est facturée. Le passage à une offre
          inférieure ou le retrait d&apos;une option prend effet à la prochaine échéance, sans remboursement de la période en cours. Le passage
          d&apos;une facturation mensuelle à annuelle, ou inversement, prend effet immédiatement : une nouvelle période commence et le temps non
          utilisé de la période précédente est déduit. Le montant et la date d&apos;effet sont toujours indiqués au client avant confirmation.
        </p>

        <h2>Article 5 — Résiliation</h2>
        <p>
          Le client peut résilier son abonnement à tout moment depuis son espace client. La résiliation prend effet à la fin de la période déjà
          payée, jusqu&apos;à laquelle le client conserve l&apos;accès à ses services ; aucun nouveau prélèvement n&apos;est effectué. La période
          en cours n&apos;est pas remboursée. Le compte du client, ses factures et ses données sont conservés conformément à la politique de
          confidentialité.
        </p>

        <h2>Article 6 — Conditions générales</h2>
        <p>
          Le présent contrat est régi par les <Link href="/cgv">conditions générales de vente</Link> d&apos;AK Universe (version du{" "}
          {COMPANY.updatedAt}), que le client a acceptées lors de sa souscription. En cas de contradiction, les stipulations du présent contrat
          prévalent pour ce qui concerne l&apos;abonnement.
        </p>

        <footer className="cs-contract-foot">
          <p>Document édité automatiquement à partir de l&apos;abonnement en vigueur à la date d&apos;édition.</p>
        </footer>
      </article>
    </main>
  );
}
