"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpFromLine, Check, CircleAlert, LoaderCircle, SlidersVertical, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/ui/Toast";
import { PRIVACY, PRIVACY_CHECKBOX } from "@/config/privacy";
import { TERMS, TERMS_CHECKBOX } from "@/config/terms";
import {
  cancelScheduledChange,
  cancelSubscription,
  confirmPlanChange,
  previewPlanChange,
  resumeSubscription,
  type ChangePreview,
} from "@/lib/client/plan-actions";
import { daysUntil, longDate, money } from "./format";

/*
 * Interactive parts of "Mon offre". Nothing here computes a price: every amount shown in a review comes from the
 * previewPlanChange server action (catalogue prices + Stripe proration), and confirmPlanChange re-checks it all.
 */

export type PlanChoice = {
  id: string;
  name: string;
  rank: number;
  desc: string;
  /** Base price per month on the customer's cycle (null = on quote). */
  monthlyCents: number | null;
  agents: number | null;
  features: string[];
};

export type OptionChoice = { id: string; label: string; info: string; monthlyCents: number };

export type PlanState = {
  planId: string;
  name: string;
  optionIds: string[];
  features: string[];
  changeable: boolean;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  basis: string;
  cycle: "mensuel" | "annuel";
  pending: { kind: "renewal" | "payment"; planName: string; monthlyCents: number; effectiveAt: string | null } | null;
};

const ERRORS: Record<string, string> = {
  forbidden: "Votre session a expiré. Reconnectez-vous pour continuer.",
  invalid: "Cette offre n'est pas disponible en ligne.",
  unchanged: "Aucun changement à appliquer.",
  notAvailable: "Votre abonnement ne peut pas être modifié en ligne pour le moment. Contactez le support.",
  notReady: "La modification en ligne de l'offre sera disponible très prochainement. Contactez le support en attendant.",
  pending: "Un changement est déjà en cours sur votre abonnement.",
  stale: "Votre abonnement a changé entre-temps. Vérifiez le récapitulatif mis à jour.",
  busy: "Une modification est déjà en cours de traitement. Réessayez dans un instant.",
  payment_failed: "Le paiement a été refusé. Aucun changement n'a été appliqué.",
  payment_required: "Le paiement n'a pas abouti : le changement sera appliqué dès que la facture sera réglée.",
  legal_required: "Vous devez accepter les Conditions Générales de Vente et d'Utilisation et la Politique de confidentialité pour continuer.",
  failed: "Une erreur est survenue. Aucun changement n'a été appliqué. Réessayez dans un instant.",
};
const errorText = (code: string) => ERRORS[code] ?? ERRORS.failed;

/* ---------- Modal ---------- */

const noopSubscribe = () => () => {};

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    if (!isClient) return;
    const previous = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [onClose, isClient]);
  // Rendered at the root of the client space (above header and sidebar, inside .cs for its theme tokens) — only in
  // the browser: a dialog opened from the URL (?resilier=1) is server-rendered as nothing, then appears on hydration.
  if (!isClient) return null;
  return createPortal(
    <div className="cs-modal-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={box} className={wide ? "cs-modal is-wide" : "cs-modal"} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}>
        <header className="cs-modal-head">
          <h2 id={id} className="cs-card-title is-sm">
            {title}
          </h2>
          <button type="button" className="cs-modal-close" aria-label="Fermer" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.querySelector(".cs") ?? document.body
  );
}

/* ---------- Review + confirm (shared by plan and option changes) ---------- */

export function ChangeReview({
  target,
  onBack,
  onDone,
}: {
  /** Omitted fields keep their current value on the server (e.g. a cycle switch sends only `cycle`). */
  target: { plan?: string; options?: string[]; cycle?: "mensuel" | "annuel"; label: string };
  onBack?: () => void;
  onDone: (message: string) => void;
}) {
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [error, setError] = useState<{ code: string; invoiceUrl?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, startSubmit] = useTransition();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await previewPlanChange({ plan: target.plan, options: target.options, cycle: target.cycle });
      if (res.success) setPreview(res);
      else setError({ code: res.error });
    } catch {
      setError({ code: "failed" });
    } finally {
      setLoading(false);
    }
  }, [target.plan, target.options, target.cycle]);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load]);

  const paysNow = preview?.mode === "immediate";

  function confirm() {
    if (!preview) return;
    if (paysNow && (!termsAccepted || !privacyAccepted)) {
      setError({ code: "legal_required" });
      return;
    }
    startSubmit(async () => {
      try {
        const res = await confirmPlanChange({
          plan: preview.planId,
          options: preview.options,
          cycle: preview.cycle,
          basis: preview.basis,
          prorationDate: preview.prorationDate,
          termsAccepted: paysNow ? termsAccepted : undefined,
          privacyAccepted: paysNow ? privacyAccepted : undefined,
        });
        if (res.success) {
          onDone(
            preview.cycleChange
              ? `Vous êtes passé à la facturation ${preview.cycle === "annuel" ? "annuelle" : "mensuelle"}.`
              : res.mode === "immediate"
                ? "Votre offre a été mise à jour."
                : `Changement programmé pour le ${res.effectiveAt ? longDate(res.effectiveAt) : "prochain renouvellement"}.`
          );
          return;
        }
        if (res.error === "stale") {
          await load();
          setError({ code: "stale" });
          return;
        }
        setError({ code: res.error, invoiceUrl: res.invoiceUrl });
      } catch {
        setError({ code: "failed" });
      }
    });
  }

  const per = preview?.interval === "year" ? "an" : "mois";
  return (
    <div className="cs-review">
      <p className="cs-review-target">{target.label}</p>
      {loading && (
        <p className="cs-review-loading" role="status">
          <LoaderCircle className="cs-spin" size={18} aria-hidden="true" /> Calcul du montant…
        </p>
      )}
      {preview && !loading && (
        <dl className="cs-review-sum">
          <div>
            <dt>Total actuel</dt>
            <dd className="notranslate">{money(preview.currentMonthlyCents)} HT / mois</dd>
          </div>
          <div>
            <dt>Nouveau total</dt>
            <dd className="notranslate">
              <strong>{money(preview.monthlyCents)} HT / mois</strong>
              {preview.interval === "year" && <small> soit {money(preview.periodCents)} HT / an</small>}
            </dd>
          </div>
          {preview.mode === "immediate" ? (
            <>
              <div className="is-due">
                <dt>À régler aujourd&apos;hui</dt>
                <dd className="notranslate">
                  <strong>{money(preview.dueNowCents ?? 0)}</strong>
                  <small>
                    {preview.cycleChange
                      ? "Nouvelle période facturée aujourd'hui, déduction faite du temps non utilisé de la période en cours."
                      : "Montant au prorata de la période en cours, prélevé sur votre moyen de paiement enregistré."}
                  </small>
                </dd>
              </div>
              {preview.creditCents > 0 && (
                <div>
                  <dt>Crédit sur votre compte</dt>
                  <dd className="notranslate">
                    <strong>{money(preview.creditCents)}</strong>
                    <small>Temps non utilisé, déduit automatiquement de vos prochaines factures.</small>
                  </dd>
                </div>
              )}
            </>
          ) : (
            <div className="is-due">
              <dt>Prise d&apos;effet</dt>
              <dd>
                <strong>{preview.effectiveAt ? `le ${longDate(preview.effectiveAt)}` : "au prochain renouvellement"}</strong>
                <small>Votre offre actuelle reste active jusqu&apos;à cette date. Aucun montant n&apos;est prélevé aujourd&apos;hui.</small>
              </dd>
            </div>
          )}
          <p className="cs-review-note">
            {preview.cycleChange
              ? `Le changement s'applique aujourd'hui : votre nouvelle période de facturation commence maintenant. Prochain prélèvement de ${money(preview.periodCents)} HT${preview.nextRenewalAt ? ` le ${longDate(preview.nextRenewalAt)}` : ""}.`
              : preview.mode === "immediate"
              ? `Le changement s'applique immédiatement après le paiement. Vos prochains prélèvements seront de ${money(preview.periodCents)} HT / ${per}${preview.nextRenewalAt ? ` à partir du ${longDate(preview.nextRenewalAt)}` : ""}.`
              : `À partir de cette date, vous serez prélevé de ${money(preview.periodCents)} HT / ${per}.`}
          </p>
        </dl>
      )}
      {error && (
        <p className="cs-form-error" role="alert">
          {errorText(error.code)}
          {error.invoiceUrl && (
            <>
              {" "}
              <a href={error.invoiceUrl} target="_blank" rel="noopener noreferrer">
                Régler la facture
              </a>
            </>
          )}
        </p>
      )}
      {paysNow && (
        <div className="cs-review-note">
          <label className="terms-accept">
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} aria-required="true" />
            <span>
              {TERMS_CHECKBOX.fr.before}
              <a href={TERMS.href} target="_blank" rel="noopener noreferrer">
                {TERMS_CHECKBOX.fr.link}
              </a>
              {TERMS_CHECKBOX.fr.after}
            </span>
          </label>
          <label className="terms-accept">
            <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} aria-required="true" />
            <span>
              {PRIVACY_CHECKBOX.fr.before}
              <a href={PRIVACY.href} target="_blank" rel="noopener noreferrer">
                {PRIVACY_CHECKBOX.fr.link}
              </a>
              {PRIVACY_CHECKBOX.fr.after}
            </span>
          </label>
        </div>
      )}
      <div className="cs-modal-actions">
        {onBack && (
          <button type="button" className="cs-btn-outline" onClick={onBack} disabled={submitting}>
            Retour
          </button>
        )}
        {error && !preview && !loading && error.code === "failed" && (
          <button type="button" className="cs-btn-outline" onClick={() => void load()}>
            Réessayer
          </button>
        )}
        <button type="button" className="cs-act is-primary cs-act-fit" onClick={confirm} disabled={!preview || loading || submitting || error?.code === "payment_required" || (paysNow && (!termsAccepted || !privacyAccepted))}>
          {submitting && <LoaderCircle className="cs-spin" size={18} aria-hidden="true" />}
          <span>{submitting ? "Traitement…" : preview?.mode === "renewal" ? "Programmer le changement" : "Confirmer et payer"}</span>
        </button>
      </div>
    </div>
  );
}

/* ---------- Plan picker ---------- */

function PlanPicker({
  mode,
  plans,
  state,
  onClose,
  onDone,
}: {
  mode: "upgrade" | "modify";
  plans: PlanChoice[];
  state: PlanState;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const current = plans.find((p) => p.id === state.planId);
  const currentRank = current?.rank ?? 1;
  const list = plans.filter((p) => p.id !== state.planId && (mode === "modify" || p.rank > currentRank));
  const [selected, setSelected] = useState<PlanChoice | null>(null);
  const own = new Set(state.features);

  return (
    <Modal title={selected ? "Récapitulatif" : mode === "upgrade" ? "Améliorer mon offre" : "Modifier mon offre"} onClose={onClose} wide={!selected}>
      {selected ? (
        <ChangeReview target={{ plan: selected.id, options: state.optionIds, label: `${state.name} → ${selected.name}` }} onBack={() => setSelected(null)} onDone={onDone} />
      ) : (
        <>
          <p className="cs-card-sub">
            {mode === "upgrade"
              ? "Une offre supérieure s'applique immédiatement : seule la différence au prorata est facturée aujourd'hui."
              : "Passage à une offre supérieure : immédiat, au prorata. Passage à une offre inférieure : au prochain renouvellement, sans frais."}
          </p>
          {list.length === 0 ? (
            <p className="cs-empty">Vous disposez déjà de notre offre la plus complète. Pour un besoin sur mesure, <Link href="/contact">contactez-nous</Link>.</p>
          ) : (
            <ul className="cs-plans">
              {list.map((p) => {
                const higher = p.rank > currentRank;
                return (
                  <li key={p.id} className="cs-plan">
                    <div className="cs-plan-head">
                      <strong className="notranslate">{p.name}</strong>
                      {p.monthlyCents !== null && <span className={`cs-badge ${higher ? "is-ok" : "is-warn"}`}>{higher ? "Supérieure" : "Inférieure"}</span>}
                    </div>
                    <p className="cs-plan-desc">{p.desc}</p>
                    <p className="cs-plan-price notranslate">
                      {p.monthlyCents === null ? (
                        "Sur devis"
                      ) : (
                        <>
                          <b>{money(p.monthlyCents)}</b> HT / mois{state.cycle === "annuel" ? ", facturé annuellement" : ""}
                        </>
                      )}
                    </p>
                    <ul className="cs-plan-features">
                      {p.features.map((f) => (
                        <li key={f} className={own.has(f) ? undefined : "is-new"}>
                          <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                          {f}
                          {!own.has(f) && <span className="cs-sr"> (différence avec votre offre)</span>}
                        </li>
                      ))}
                    </ul>
                    {p.monthlyCents === null ? (
                      <Link href="/contact" className="cs-btn-outline cs-plan-cta">
                        Nous contacter
                      </Link>
                    ) : (
                      <button type="button" className={higher ? "cs-act is-primary cs-plan-cta" : "cs-act cs-plan-cta"} onClick={() => setSelected(p)}>
                        <span>Choisir cette offre</span>
                        <ArrowRight className="cs-act-arrow" size={18} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="cs-review-note">Prix hors options et utilisateurs supplémentaires : le total exact est calculé à l&apos;étape suivante.</p>
        </>
      )}
    </Modal>
  );
}

/** Message shown instead of the actions when the subscription cannot be changed right now. */
function lockedReason(state: PlanState) {
  if (state.cancelAtPeriodEnd) return "Réactivez votre abonnement pour modifier votre offre.";
  if (state.pending) return null;
  if (!state.changeable) return "La modification en ligne est momentanément indisponible. Contactez le support si besoin.";
  return null;
}

/* ---------- "Faire évoluer mon offre" ---------- */

export function EvolveCard({ plans, state, openInitially }: { plans: PlanChoice[]; state: PlanState; openInitially: "upgrade" | "modify" | null }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [open, setOpen] = useState<"upgrade" | "modify" | null>(state.changeable && !state.pending ? openInitially : null);
  const [undoing, startUndo] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const disabled = !state.changeable || Boolean(state.pending) || state.cancelAtPeriodEnd;
  const reason = lockedReason(state);

  function done(message: string) {
    setOpen(null);
    toast(message);
    router.refresh();
  }

  function undo() {
    setError(null);
    startUndo(async () => {
      const res = await cancelScheduledChange().catch(() => ({ success: false as const, error: "failed" as const }));
      if (res.success) {
        toast("Le changement programmé a été annulé.");
        router.refresh();
      } else setError(errorText(res.error));
    });
  }

  return (
    <section className="cs-card cs-manage" aria-labelledby="cs-evolve-title">
      <h2 id="cs-evolve-title" className="cs-card-title">
        Faire évoluer mon offre
      </h2>
      <p className="cs-card-sub">Passez à une offre supérieure pour plus d&apos;agents, plus d&apos;automatisations et des fonctionnalités avancées.</p>
      {state.pending && (
        <div className="cs-notice" role="status">
          {state.pending.kind === "renewal" ? (
            <>
              <p>
                Changement programmé{state.pending.effectiveAt ? ` le ${longDate(state.pending.effectiveAt)}` : ""} : <strong className="notranslate">{state.pending.planName}</strong>, {money(state.pending.monthlyCents)} HT / mois.
              </p>
              <button type="button" className="cs-link-btn" onClick={undo} disabled={undoing}>
                {undoing ? "Annulation…" : "Annuler ce changement"}
              </button>
            </>
          ) : (
            <p>Un changement vers <strong className="notranslate">{state.pending.planName}</strong> attend le règlement de sa facture. Il sera appliqué dès le paiement reçu.</p>
          )}
        </div>
      )}
      {error && (
        <p className="cs-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="cs-actions">
        <button type="button" className="cs-act is-primary" disabled={disabled} onClick={() => setOpen("upgrade")}>
          <ArrowUpFromLine className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Améliorer mon offre</span>
          <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
        </button>
        <button type="button" className="cs-act" disabled={disabled} onClick={() => setOpen("modify")}>
          <SlidersVertical className="cs-act-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
          <span>Modifier mon offre</span>
          <ArrowRight className="cs-act-arrow" size={20} aria-hidden="true" />
        </button>
      </div>
      {reason && <p className="cs-hint">{reason}</p>}
      {open && <PlanPicker mode={open} plans={plans} state={state} onClose={close} onDone={done} />}
      {toastNode}
    </section>
  );
}

/* ---------- "Mes options" ---------- */

export function OptionsCard({ options, state }: { options: OptionChoice[]; state: PlanState }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [target, setTarget] = useState<{ plan: string; options: string[]; label: string } | null>(null);
  const close = useCallback(() => setTarget(null), []);
  const active = new Set(state.optionIds);
  const disabled = !state.changeable || Boolean(state.pending) || state.cancelAtPeriodEnd;

  function toggle(o: OptionChoice) {
    const on = active.has(o.id);
    const next = on ? state.optionIds.filter((id) => id !== o.id) : [...state.optionIds, o.id];
    setTarget({ plan: state.planId, options: next, label: on ? `Retirer l'option « ${o.label} »` : `Ajouter l'option « ${o.label} »` });
  }

  return (
    <section className="cs-card" id="options" aria-labelledby="cs-options-title">
      <h2 id="cs-options-title" className="cs-card-title is-sm">
        Mes options
      </h2>
      <p className="cs-card-sub">Ajoutez des fonctionnalités à la carte et personnalisez votre offre.</p>
      <ul className="cs-options">
        {options.map((o) => {
          const on = active.has(o.id);
          return (
            <li key={o.id}>
              <span className="cs-option-label" title={o.info}>
                {o.label}
              </span>
              <span className="cs-option-price notranslate">+ {money(o.monthlyCents)} / mois</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${o.label} : ${on ? "activée" : "désactivée"}`}
                className={on ? "cs-switch is-on" : "cs-switch"}
                disabled={disabled}
                onClick={() => toggle(o)}
              >
                <span aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {disabled && lockedReason(state) && <p className="cs-hint">{lockedReason(state)}</p>}
      {target && (
        <Modal title="Récapitulatif" onClose={close}>
          <ChangeReview
            target={target}
            onDone={(message) => {
              setTarget(null);
              toast(message);
              router.refresh();
            }}
          />
        </Modal>
      )}
      {toastNode}
    </section>
  );
}

/* ---------- Cancellation ---------- */

export function CancelPanel({ state, openInitially }: { state: PlanState; openInitially: boolean }) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [open, setOpen] = useState(openInitially && !state.cancelAtPeriodEnd);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);
  const end = state.periodEnd ? longDate(state.periodEnd) : null;
  const days = state.periodEnd ? daysUntil(state.periodEnd) : null;

  function run(action: () => Promise<{ success: boolean; error?: string }>, success: string) {
    setError(null);
    startTransition(async () => {
      const res = await action().catch(() => ({ success: false, error: "failed" }));
      if (res.success) {
        setOpen(false);
        toast(success);
        router.refresh();
      } else {
        setError(errorText(res.error ?? "failed"));
        if (res.error === "stale") router.refresh();
      }
    });
  }

  return (
    <section className="cs-cancel" aria-labelledby="cs-cancel-title">
      <span className="cs-cancel-icon" aria-hidden="true">
        <CircleAlert size={24} strokeWidth={1.8} />
      </span>
      <div className="cs-cancel-body">
        <h2 id="cs-cancel-title" className="cs-card-title">
          {state.cancelAtPeriodEnd ? "Résiliation programmée" : "Résilier mon abonnement"}
        </h2>
        {state.cancelAtPeriodEnd ? (
          <p>
            Votre abonnement ne sera pas renouvelé.
            <br />
            {end ? `Votre accès reste actif jusqu'au ${end}${days !== null ? ` (encore ${days} jour${days > 1 ? "s" : ""})` : ""}.` : "Votre accès reste actif jusqu'à la fin de la période en cours."}
          </p>
        ) : (
          <p>
            Vous pouvez résilier votre abonnement à tout moment.
            <br />
            Votre accès restera actif jusqu&apos;à la fin de la période en cours{end ? `, soit le ${end}` : ""}.
          </p>
        )}
        {error && !open && (
          <p className="cs-form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {state.cancelAtPeriodEnd ? (
        <button type="button" className="cs-btn-danger is-resume" disabled={pending} onClick={() => run(resumeSubscription, "Votre abonnement sera renouvelé normalement.")}>
          {pending ? "Traitement…" : "Réactiver mon abonnement"}
        </button>
      ) : (
        <button type="button" className="cs-btn-danger" onClick={() => setOpen(true)}>
          Résilier mon abonnement
        </button>
      )}
      {open && (
        <Modal title="Confirmer la résiliation" onClose={close}>
          <div className="cs-review">
            <p>Êtes-vous sûr de vouloir résilier votre abonnement <strong className="notranslate">{state.name}</strong> ?</p>
            <ul className="cs-checks">
              <li>
                <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                {end ? `Vos agents restent actifs jusqu'au ${end}${days !== null ? `, soit encore ${days} jour${days > 1 ? "s" : ""}` : ""}.` : "Vos agents restent actifs jusqu'à la fin de la période en cours."}
              </li>
              <li>
                <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                Aucun nouveau prélèvement ne sera effectué.
              </li>
              <li>
                <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                Votre compte, vos factures et vos données sont conservés. Vous pourrez vous réabonner à tout moment.
              </li>
              {state.pending?.kind === "renewal" && (
                <li>
                  <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                  Le changement d&apos;offre programmé sera annulé.
                </li>
              )}
            </ul>
            {error && (
              <p className="cs-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="cs-modal-actions">
              <button type="button" className="cs-btn-outline" onClick={close} disabled={pending}>
                Conserver mon abonnement
              </button>
              <button
                type="button"
                className="cs-btn-danger"
                disabled={pending}
                onClick={() => run(() => cancelSubscription({ basis: state.basis }), end ? `Résiliation confirmée. Accès maintenu jusqu'au ${end}.` : "Résiliation confirmée.")}
              >
                {pending ? "Traitement…" : "Confirmer la résiliation"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toastNode}
    </section>
  );
}
