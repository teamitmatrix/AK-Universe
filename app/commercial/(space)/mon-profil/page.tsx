import { euros } from "@/components/commercial/financeUi";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS } from "@/lib/commercial/commission-rules";
import { loadMyProfile } from "@/lib/commercial/finance";
import { requireCommercial } from "@/lib/commercial/session";

/**
 * commercial/mon-profil.html (handoff page 10): the rep's information, monthly target and commission rates.
 * Target and rates are read-only here: only an administrator changes them (/admin/commerciaux).
 */
export default async function MonProfilPage() {
  const me = await requireCommercial("/commercial/mon-profil");
  const p = await loadMyProfile(me);

  return (
    <div className="adm-content">
      <div className="adm-pagehead">
        <div>
          <h2>Mon profil</h2>
          <p>Vos informations et vos taux de commission.</p>
        </div>
      </div>

      <div className="com-split">
        <section className="adm-card" aria-labelledby="com-info">
          <header className="adm-card-head">
            <h2 id="com-info">Informations</h2>
          </header>
          <dl className="com-dl">
            <div>
              <dt>Nom</dt>
              <dd>{p.name}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{p.email}</dd>
            </div>
            <div>
              <dt>Rôle</dt>
              <dd>Commercial</dd>
            </div>
            <div>
              <dt>Statut</dt>
              <dd>
                <span className={`adm-badge ${p.active ? "is-ok" : "is-danger"}`}>{p.active ? "Actif" : "Désactivé"}</span>
              </dd>
            </div>
            {p.since && (
              <div>
                <dt>Membre depuis</dt>
                <dd>{new Date(p.since).toLocaleDateString("fr-FR")}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="adm-card" aria-labelledby="com-target">
          <header className="adm-card-head">
            <h2 id="com-target">Objectif</h2>
          </header>
          <dl className="com-dl">
            <div>
              <dt>Objectif mensuel</dt>
              <dd className="com-gold">{p.targetCents === null ? "Non défini" : euros(p.targetCents)}</dd>
            </div>
          </dl>
          <p className="adm-muted">Modifiable uniquement par un administrateur. Besoin d&apos;un changement ? Contactez l&apos;équipe AK Universe.</p>
        </section>
      </div>

      <section className="adm-card" aria-labelledby="com-rates">
        <header className="adm-card-head">
          <h2 id="com-rates">Taux de commission</h2>
        </header>
        <p className="adm-muted">
          Commission = montant réellement encaissé (HT, après remise) × taux, sauf commission fixe saisie sur une ligne. Le taux du type de produit
          s&apos;applique en priorité ; votre taux personnel{p.ownRate !== null ? ` (${p.ownRate} %)` : ""} sert par défaut. Les abonnements IA
          génèrent une commission à chaque paiement Stripe (taux « Agents IA »).
        </p>
        <dl className="com-dl">
          {PRODUCT_TYPES.map((t) => (
            <div key={t}>
              <dt>{PRODUCT_TYPE_LABELS[t]}</dt>
              <dd>{p.rates[t]} %</dd>
            </div>
          ))}
          <div>
            <dt>Votre taux par défaut</dt>
            <dd>{p.ownRate === null ? "Non défini" : `${p.ownRate} %`}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
