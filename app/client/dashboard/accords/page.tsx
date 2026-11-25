import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { acceptedWhen, agreementKind, listMyAgreements } from "@/lib/client/agreements";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Mes accords — AK Universe" } };

/** Accepted terms, privacy policy and the subscription contract, for this customer only. */
export default async function AgreementsPage() {
  const me = await requireClient("/client/dashboard/accords");
  const rows = await listMyAgreements(me.id);

  return (
    <main className="cs-page">
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
        <h1>Mes accords</h1>
        <p>
          Chaque paiement enregistre la version des Conditions Générales de Vente et d&apos;Utilisation et de la Politique de
          confidentialité que vous avez acceptées, avec la date et l&apos;heure.
        </p>
      </header>

      <section className="cs-card">
        <h2 className="cs-card-title is-sm">Contrat d&apos;abonnement</h2>
        <p className="cs-card-sub">Le contrat de votre offre en cours, généré à partir de votre abonnement.</p>
        <Link href="/client/dashboard/facturation/contrat" className="cs-act">
          <Download className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>
            Ouvrir le contrat
            <small>Impression ou enregistrement PDF depuis le navigateur</small>
          </span>
        </Link>
      </section>

      <section className="cs-card">
        <h2 className="cs-card-title is-sm">Acceptations enregistrées</h2>
        {rows.length === 0 ? (
          <p className="cs-card-sub">Aucun accord enregistré pour le moment. Ils apparaissent ici après un paiement.</p>
        ) : (
          <ul className="cs-terms">
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{agreementKind(row.kind)}</strong>
                {row.plan ? <span className="notranslate"> · {row.plan}</span> : null}
                <small className="cs-terms-sub">Accepté le {acceptedWhen(row.accepted_at)}</small>
                <small className="cs-terms-sub">{row.terms_label}</small>
                {row.privacy_label ? (
                  <small className="cs-terms-sub">
                    {row.privacy_label}
                    {row.privacy_accepted_at ? ` — ${acceptedWhen(row.privacy_accepted_at)}` : ""}
                  </small>
                ) : (
                  <small className="cs-terms-sub">Politique de confidentialité non enregistrée pour ce paiement.</small>
                )}
                <span className="cs-actions">
                  <Link href={`/client/dashboard/accords/${row.id}?doc=terms`}>Lire les CGV acceptées</Link>
                  {" · "}
                  <a href={`/client/dashboard/accords/${row.id}/fichier?doc=terms`}>Télécharger</a>
                  {row.privacy_version ? (
                    <>
                      {" · "}
                      <Link href={`/client/dashboard/accords/${row.id}?doc=privacy`}>Lire la politique acceptée</Link>
                      {" · "}
                      <a href={`/client/dashboard/accords/${row.id}/fichier?doc=privacy`}>Télécharger</a>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
