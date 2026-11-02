"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { PLAN, computeQuote, eur, type Selection } from "@/config/pricing";
import { checkPromoCode, startSubscriptionCheckout } from "@/lib/billing/actions";
import { Icon } from "@/components/ui/Icon";
import { LangSwitch, nativeTranslate, textLang, useLang } from "@/components/ui/LangSwitch";
import { useToast } from "@/components/ui/Toast";

const METHODS = ["card", "sepa", "paypal", "revolut", "satispay"] as const;

const TEXT = {
  fr: {
    back: "Retour",
    title: "Récapitulatif de votre abonnement",
    planText: "Parfait pour les entreprises qui veulent aller plus loin.",
    perMonth: "/ mois",
    billing: "Facturation",
    billedYearly: "Facturé tous les ans",
    billedMonthly: "Facturé tous les mois",
    addPromo: "Ajouter un code promotionnel",
    promoPlaceholder: "Code promo",
    apply: "Appliquer",
    promoEmpty: "Saisissez un code.",
    promoOk: "Code appliqué : la remise sera calculée à l'étape suivante.",
    promoBad: "Ce code promotionnel n'est pas valide.",
    subtotal: "Sous-total",
    vat: "TVA (0 %)",
    vatInfo: "TVA non applicable ou autoliquidée selon votre statut.",
    dueToday: "Total à payer aujourd'hui",
    assurances: [
      ["lock", "Paiement 100 % sécurisé", "Vos données sont protégées et chiffrées."],
      ["bolt", "Activation immédiate", "Accédez à vos agents IA dès votre paiement."],
      ["check-circle", "Sans engagement", "Vous pouvez résilier à tout moment."],
    ],
    applePay: "Payer avec Apple Pay",
    applePayToast: "Apple Pay est proposé automatiquement sur la page de paiement sécurisée (carte bancaire).",
    or: "ou",
    contact: "Coordonnées",
    email: "E-mail",
    method: "Moyen de paiement",
    methods: {
      card: "Carte bancaire",
      sepa: "Prélèvement automatique SEPA",
      paypal: "PayPal",
      revolut: "Revolut Pay",
      satispay: "Satispay",
    },
    submit: "Payer et s'abonner",
    submitting: "Redirection…",
    securedBy: "Paiement sécurisé par",
    note: "En vous abonnant, vous autorisez AK Universe à vous débiter conformément aux conditions d'utilisation jusqu'à résiliation.",
    errors: {
      not_configured: "Le paiement en ligne n'est pas encore configuré. Aucun montant n'a été débité.",
      prepare_failed: "Impossible de préparer le paiement. Veuillez réessayer.",
      method_unavailable: "Ce moyen de paiement n'est pas disponible. Choisissez la carte bancaire.",
    },
    success: {
      heading: ["Merci, votre abonnement est ", "confirmé"],
      text: "Un reçu vous a été envoyé par e-mail. Vos agents IA sont activés dès la confirmation du paiement.",
      home: "Retour à l'accueil",
    },
  },
  en: {
    back: "Back",
    title: "Your subscription summary",
    planText: "Perfect for businesses that want to go further.",
    perMonth: "/ month",
    billing: "Billing",
    billedYearly: "Billed yearly",
    billedMonthly: "Billed monthly",
    addPromo: "Add a promo code",
    promoPlaceholder: "Promo code",
    apply: "Apply",
    promoEmpty: "Enter a code.",
    promoOk: "Code applied: the discount will be calculated at the next step.",
    promoBad: "This promo code is not valid.",
    subtotal: "Subtotal",
    vat: "VAT (0%)",
    vatInfo: "VAT not applicable or reverse-charged depending on your status.",
    dueToday: "Total due today",
    assurances: [
      ["lock", "100% secure payment", "Your data is protected and encrypted."],
      ["bolt", "Instant activation", "Access your AI agents as soon as you pay."],
      ["check-circle", "No commitment", "You can cancel at any time."],
    ],
    applePay: "Pay with Apple Pay",
    applePayToast: "Apple Pay is offered automatically on the secure payment page (credit card).",
    or: "or",
    contact: "Contact details",
    email: "Email",
    method: "Payment method",
    methods: {
      card: "Credit card",
      sepa: "SEPA direct debit",
      paypal: "PayPal",
      revolut: "Revolut Pay",
      satispay: "Satispay",
    },
    submit: "Pay and subscribe",
    submitting: "Redirecting…",
    securedBy: "Secure payment by",
    note: "By subscribing, you authorize AK Universe to charge you in accordance with the terms of use until you cancel.",
    errors: {
      not_configured: "Online payment is not configured yet. You have not been charged.",
      prepare_failed: "Unable to prepare the payment. Please try again.",
      method_unavailable: "This payment method is not available. Please choose a credit card.",
    },
    success: {
      heading: ["Thank you, your subscription is ", "confirmed"],
      text: "A receipt has been sent to you by email. Your AI agents are activated as soon as the payment is confirmed.",
      home: "Back to home",
    },
  },
};

type PromoMsg = "promoEmpty" | "promoOk" | "promoBad";

function MethodLogo({ method }: { method: string }) {
  switch (method) {
    case "card":
      return (
        <span className="m-logo" style={{ color: "#111", fontSize: "1.6rem" }}>
          <Icon name="card" />
        </span>
      );
    case "sepa":
      return (
        <span className="m-logo">
          <svg width="36" height="22" viewBox="0 0 36 22"><rect width="36" height="22" rx="3" fill="#10298e" /><text x="18" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontStyle="italic" fontSize="9" fill="#fff">SEPA</text></svg>
        </span>
      );
    case "paypal":
      return (
        <span className="m-logo">
          <svg width="26" height="30" viewBox="0 0 26 30"><path d="M7 29H2L6.5 1h9c5 0 8 2.5 7 7.5-1 5.5-5 7.5-10 7.5H9.5z" fill="#003087" /><path d="M11 29H7l3-19h6c4 0 6 2 5.4 5.8-.8 4.6-4 6.2-8 6.2h-1.4z" fill="#009cde" /></svg>
        </span>
      );
    case "revolut":
      return (
        <span className="m-logo">
          <svg width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="5" fill="#111" /><text x="16" y="23" textAnchor="middle" fontFamily="Arial Black,Arial" fontWeight="900" fontSize="20" fill="#fff">R</text></svg>
        </span>
      );
    default:
      return (
        <span className="m-logo">
          <svg width="30" height="32" viewBox="0 0 30 32"><path d="M8 2 20 9 8 16z M22 16 10 23l12 7z" fill="#ef4123" /><path d="M8 16l12 7-12 7z" fill="#ef4123" opacity=".7" /></svg>
        </span>
      );
  }
}

export function PaiementScreen({ selection, email: initialEmail }: { selection: Selection; email: string }) {
  const [lang, setLang] = useLang();
  const t = TEXT[textLang(lang)];
  const [toast, toastNode] = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [method, setMethod] = useState("card");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  // Message keys (not strings) so they follow the language switch.
  const [promoMsg, setPromoMsg] = useState<PromoMsg | null>(null);
  const [promotionCodeId, setPromotionCodeId] = useState<string>();
  const [error, setError] = useState<keyof typeof TEXT.fr.errors | "">("");
  const [pending, startTransition] = useTransition();

  const quote = computeQuote(selection);
  const annual = selection.cycle === "annuel";

  async function applyPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!promo.trim()) {
      setPromoMsg("promoEmpty");
      return;
    }
    const result = await checkPromoCode(promo);
    setPromotionCodeId(result.valid ? result.id : undefined);
    setPromoMsg(result.valid ? "promoOk" : "promoBad");
  }

  function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const input = event.currentTarget.querySelector<HTMLInputElement>("#pay-email");
    if (input && !input.checkValidity()) {
      input.reportValidity();
      return;
    }
    startTransition(async () => {
      // Redirects to Stripe Checkout on success.
      const result = await startSubscriptionCheckout({ selection, email, method, promotionCodeId, lang });
      if (result && !result.success) setError(result.code);
    });
  }

  return (
    <div className="theme-light" translate={nativeTranslate(lang)}>
      <div className="container" id="paiement">
        <div className="light-top" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link href="/abonnement" className="back">
            <Icon name="arrow-left" /> {t.back}
          </Link>
          <LangSwitch lang={lang} onChange={setLang} />
        </div>

        <div className="pay-grid">
          <div className="stack">
            <section className="card-l">
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>{t.title}</h1>
              <div className="pay-item">
                <div className="row-head">
                  <span className="crown">
                    <Icon name="crown" />
                  </span>
                  <div>
                    <h2 style={{ fontSize: "1.35rem" }}>{PLAN.name}</h2>
                    <p>{t.planText}</p>
                  </div>
                  <div className="amt">
                    <span id="p-plan-price" className="notranslate">{eur(quote.monthly)}</span>
                    <small>{t.perMonth}</small>
                  </div>
                </div>
              </div>
              <div className="line" style={{ padding: "12px 2px" }}>
                <span>
                  {t.billing}
                  <small id="p-billing-note">{annual ? t.billedYearly : t.billedMonthly}</small>
                </span>
                <b className="p-due notranslate">{eur(quote.due)}</b>
              </div>

              <button className="promo" id="promo-toggle" type="button" onClick={() => setPromoOpen((v) => !v)}>
                <Icon name="tag" /> {t.addPromo}
              </button>
              <form className={`promo-form${promoOpen ? " show" : ""}`} id="promo-form" onSubmit={applyPromo}>
                <div className="input" style={{ flex: 1 }}>
                  <Icon name="tag" />
                  <input
                    id="promo-code"
                    type="text"
                    placeholder={t.promoPlaceholder}
                    autoComplete="off"
                    style={{ height: 50 }}
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                  />
                </div>
                <button className="btn btn-light-outline" type="submit">
                  {t.apply}
                </button>
              </form>
              <p className={`promo-msg${promoMsg ? (promoMsg === "promoOk" ? " ok" : " err") : ""}`} id="promo-msg" role="status" key={promoMsg ?? ""}>
                {promoMsg && t[promoMsg]}
              </p>

              <div className="line" style={{ padding: "14px 2px" }}>
                <span>{t.subtotal}</span>
                <b className="p-due notranslate">{eur(quote.due)}</b>
              </div>
              <div className="sep-line" />
              <div className="line" style={{ padding: "14px 2px" }}>
                <span>
                  {t.vat}{" "}
                  <span className="info" title={t.vatInfo}>
                    <Icon name="info" />
                  </span>
                </span>
                <span style={{ color: "var(--l-muted)" }}>0,00 €</span>
              </div>
              <div className="total-box">
                <span>{t.dueToday}</span>
                <span className="v p-due notranslate">{eur(quote.due)}</span>
              </div>
            </section>

            <section className="card-l assurances">
              {t.assurances.map(([icon, title, text]) => (
                <div key={icon} className="assurance">
                  <Icon name={icon} />
                  <div>
                    <b>{title}</b>
                    <span>{text}</span>
                  </div>
                </div>
              ))}
            </section>
          </div>

          <form className="card-l" id="pay-form" noValidate onSubmit={pay}>
            <button type="button" className="apple-pay" aria-label={t.applePay} onClick={() => toast(t.applePayToast)}>
              <Icon name="apple" /> Pay
            </button>
            <div className="or">{t.or}</div>

            <h2 className="label-h">{t.contact}</h2>
            <div className="input">
              <Icon name="mail" />
              <label htmlFor="pay-email" className="sr-only">
                {t.email}
              </label>
              <input
                id="pay-email"
                type="email"
                required
                placeholder={t.email}
                autoComplete="email"
                style={{ background: "var(--l-soft)" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <h2 className="label-h">{t.method}</h2>
            <div className="methods" role="radiogroup" aria-label={t.method}>
              {METHODS.map((m) => (
                <label key={m} className="method">
                  <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
                  <MethodLogo method={m} />
                  <span>{t.methods[m]}</span>
                  {m === "card" && (
                    <span className="cards-logos" aria-hidden="true">
                      <svg width="38" height="14" viewBox="0 0 38 14"><text x="0" y="12" fontFamily="Arial Black,Arial" fontWeight="900" fontStyle="italic" fontSize="14" fill="#1a1f71">VISA</text></svg>
                      <svg width="30" height="20" viewBox="0 0 30 20"><circle cx="10" cy="10" r="9" fill="#eb001b" /><circle cx="20" cy="10" r="9" fill="#f79e1b" fillOpacity=".9" /></svg>
                      <svg width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="4" fill="#2e77bc" /><text x="14" y="17" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="8" fill="#fff">AMEX</text></svg>
                      <svg width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="4" fill="#1b75bb" /><rect x="5" y="7" width="18" height="14" rx="3" fill="none" stroke="#fff" strokeWidth="2" /><path d="M14 7v14" stroke="#fff" strokeWidth="2" /></svg>
                    </span>
                  )}
                </label>
              ))}
            </div>

            {error && (
              <p key={error} className="auth-error" role="alert" style={{ marginTop: 16 }}>
                {t.errors[error]}
              </p>
            )}

            <button type="submit" className="btn btn-light-primary btn-block" style={{ marginTop: 26, fontSize: "1.35rem" }} disabled={pending}>
              <span key={String(pending)}>{pending ? t.submitting : t.submit}</span> <Icon name="arrow" />
            </button>
            <p className="secure">
              <Icon name="lock" /> {t.securedBy} <b>Stripe</b>
            </p>
            <p className="pay-note">{t.note}</p>
          </form>
        </div>
      </div>
      {toastNode}
    </div>
  );
}

/** Shown on /paiement?success=1 after Stripe Checkout. */
export function PaiementSuccess() {
  const [lang] = useLang();
  const t = TEXT[textLang(lang)].success;

  return (
    <div className="theme-light" translate={nativeTranslate(lang)}>
      <div className="container" style={{ maxWidth: 640, padding: "80px 0", textAlign: "center" }}>
        <h1>
          {t.heading[0]}
          <span className="text-grad">{t.heading[1]}</span>
        </h1>
        <p style={{ color: "var(--l-muted)", margin: "16px 0 28px" }}>{t.text}</p>
        <Link href="/" className="btn btn-light-primary">
          {t.home} <Icon name="arrow" />
        </Link>
      </div>
    </div>
  );
}
