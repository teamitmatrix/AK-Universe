"use client";

import { useRouter } from "next/navigation";
import { ChartColumn, FileText, Layers, MessageCircle, Phone, Puzzle, RefreshCw, Tag, Users, type LucideIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { OptionChoice } from "@/lib/client/plans";
import { money } from "./format";
import { ChangeReview, Modal, type PlanState } from "./PlanManager";

/*
 * "Options" page: the customer builds a selection (draft), the summary updates live, and "Mettre à jour mon
 * abonnement" opens the review where the SERVER prices the change (catalogue + Stripe proration) before anything
 * is applied. The live total here is display only, computed with the same formula as the server
 * ((plan + users + options) × cycle discount); the review shows the authoritative amounts.
 */

const ICONS: Record<string, LucideIcon> = {
  telephonie: Phone,
  whatsapp: MessageCircle,
  "marque-blanche": Tag,
  generateur: FileText,
  analyse: ChartColumn,
};

function lockedReason(state: PlanState) {
  if (state.cancelAtPeriodEnd) return "Réactivez votre abonnement pour modifier vos options.";
  if (state.pending) return "Un changement est déjà en cours sur votre abonnement.";
  if (!state.changeable) return "La modification en ligne est momentanément indisponible. Contactez le support si besoin.";
  return null;
}

export function OptionsManager({
  state,
  options,
  baseListCents,
  usersListCents,
  extraUsers,
  cycleDiscount,
}: {
  state: PlanState;
  options: OptionChoice[];
  baseListCents: number;
  usersListCents: number;
  extraUsers: number;
  cycleDiscount: number;
}) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [draft, setDraft] = useState<string[]>(state.optionIds);
  const [reviewing, setReviewing] = useState(false);
  const close = useCallback(() => setReviewing(false), []);
  const reason = lockedReason(state);
  const locked = Boolean(reason);

  const current = useMemo(() => new Set(state.optionIds), [state.optionIds]);
  const selected = useMemo(() => new Set(draft), [draft]);
  const added = options.filter((o) => selected.has(o.id) && !current.has(o.id));
  const removed = options.filter((o) => !selected.has(o.id) && current.has(o.id));
  const changed = added.length + removed.length > 0;

  const k = 1 - cycleDiscount;
  const totalFor = (ids: Set<string>) =>
    Math.round(((baseListCents + usersListCents + options.filter((o) => ids.has(o.id)).reduce((s, o) => s + o.listCents, 0)) / 100) * k * 100);
  const newTotal = totalFor(selected);
  const currentTotal = totalFor(current);
  const diff = newTotal - currentTotal;

  const toggle = (id: string) => setDraft((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  const label = [
    added.length ? `Ajout : ${added.map((o) => o.label).join(", ")}` : null,
    removed.length ? `Retrait : ${removed.map((o) => o.label).join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="cs-grid cs-grid-options">
      <section className="cs-card" aria-labelledby="cs-opts-title">
        <h2 id="cs-opts-title" className="cs-card-title">
          Options disponibles
        </h2>
        <p className="cs-card-sub">Ajoutez, activez ou désactivez les options pour personnaliser votre offre.</p>
        <ul className="cs-opt-list">
          {options.map((o) => {
            const on = selected.has(o.id);
            const isNew = on && !current.has(o.id);
            const isRemoved = !on && current.has(o.id);
            return (
              <li key={o.id} className={isNew ? "cs-opt is-added" : isRemoved ? "cs-opt is-removed" : "cs-opt"}>
                <div className="cs-opt-text">
                  <h3>
                    {o.label}
                    {isNew && <span className="cs-badge is-ok">Ajout</span>}
                    {isRemoved && <span className="cs-badge is-warn">Retrait</span>}
                  </h3>
                  <p>{o.info}</p>
                  {o.retired && <p className="cs-opt-note">Cette option n&apos;est plus proposée : vous pouvez la conserver ou la retirer.</p>}
                </div>
                <p className="cs-opt-price notranslate">
                  <b>+ {money(o.monthlyCents)}</b> / mois
                </p>
                {current.has(o.id) || isNew ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${o.label} : ${on ? "activée" : "désactivée"}`}
                    className={on ? "cs-switch cs-switch-lg is-on" : "cs-switch cs-switch-lg"}
                    disabled={locked}
                    onClick={() => toggle(o.id)}
                  >
                    <span aria-hidden="true" />
                  </button>
                ) : (
                  <button type="button" className="cs-btn-outline cs-opt-add" disabled={locked} onClick={() => toggle(o.id)} aria-label={`Ajouter l'option ${o.label}`}>
                    Ajouter
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {reason && <p className="cs-hint">{reason}</p>}
      </section>

      <div className="cs-stack">
        <section className="cs-card cs-summary" aria-labelledby="cs-sum-title">
          <h2 id="cs-sum-title" className="cs-card-title">
            Mon offre
          </h2>
          <ul className="cs-sum-lines">
            <li className="is-plan">
              <Layers size={22} strokeWidth={1.8} aria-hidden="true" />
              <span className="notranslate">{state.name}</span>
              <b className="notranslate">
                {money(Math.round(baseListCents * k))} <small>/ mois</small>
              </b>
            </li>
            {extraUsers > 0 && (
              <li>
                <Users size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  {extraUsers} utilisateur{extraUsers > 1 ? "s" : ""} supplémentaire{extraUsers > 1 ? "s" : ""}
                </span>
                <span className="notranslate">+ {money(Math.round(usersListCents * k))} / mois</span>
              </li>
            )}
            {options
              .filter((o) => selected.has(o.id))
              .map((o) => {
                const Icon = ICONS[o.id] ?? Puzzle;
                return (
                  <li key={o.id} className={current.has(o.id) ? undefined : "is-added"}>
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span>{o.label}</span>
                    <span className="notranslate">+ {money(o.monthlyCents)} / mois</span>
                  </li>
                );
              })}
          </ul>
          <div className="cs-sum-total">
            <span>Total mensuel (HT)</span>
            <strong className="notranslate">
              {money(newTotal)} <small>/ mois</small>
            </strong>
          </div>
          {changed && (
            <p className="cs-sum-diff notranslate" role="status">
              Actuellement {money(currentTotal)} / mois · différence{" "}
              <b className={diff > 0 ? "is-up" : "is-down"}>
                {diff > 0 ? "+" : diff < 0 ? "−" : ""} {money(Math.abs(diff))} / mois
              </b>
              {state.cycle === "annuel" && <> (facturé annuellement)</>}
            </p>
          )}
          <button type="button" className="cs-act is-primary cs-sum-cta" disabled={!changed || locked} onClick={() => setReviewing(true)}>
            <RefreshCw className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
            <span>Mettre à jour mon abonnement</span>
          </button>
          {changed && (
            <button type="button" className="cs-link-btn cs-sum-reset" onClick={() => setDraft(state.optionIds)}>
              Annuler mes modifications
            </button>
          )}
        </section>

        <aside className="cs-know" aria-labelledby="cs-know-title">
          <span className="cs-cancel-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 7.5v5.5M12 16.5h.01" />
            </svg>
          </span>
          <div>
            <h2 id="cs-know-title">À savoir</h2>
            <p>
              L&apos;ajout d&apos;options est appliqué immédiatement : seul le prorata de la période en cours est facturé, et le montant est
              ajusté sur votre prochaine facturation. Le retrait d&apos;une option prend effet à votre prochaine échéance.
            </p>
          </div>
        </aside>
      </div>

      {reviewing && (
        <Modal title="Récapitulatif" onClose={close}>
          <ChangeReview
            target={{ options: draft, label }}
            onDone={(message) => {
              setReviewing(false);
              toast(message);
              router.refresh();
            }}
          />
        </Modal>
      )}
      {toastNode}
    </div>
  );
}
