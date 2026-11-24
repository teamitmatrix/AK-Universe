"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_AGENTS_PRICING,
  MAX_EXTRA_USERS,
  OPTIONS,
  PLAN,
  computeQuote,
  eur,
  normalizeAgentsPricing,
  type AgentsPricing,
  type Cycle,
} from "@/config/pricing";
import { parseAgentsCycle, readAgentsCycle, writeAgentsCycle } from "@/lib/agents-cycle";
import { Icon } from "@/components/ui/Icon";
import { LangSwitch, nativeTranslate, textLang, useLang } from "@/components/ui/LangSwitch";

const CYCLE_EVENT = "aku-agents-cycle";

function subscribeCycle(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === "aku-agents-cycle" || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CYCLE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CYCLE_EVENT, onStoreChange);
  };
}

function persistCycle(next: Cycle) {
  writeAgentsCycle(next);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CYCLE_EVENT));
}

const TEXT = {
  fr: {
    site: "Site public",
    dashboard: "Mon espace",
    later: "Compléter plus tard",
    heading: ["Personnalisez votre ", "abonnement"],
    subtitle: "Choisissez la formule et les options qui correspondent aux besoins de votre organisation.",
    cycleLabel: "Période de facturation",
    cycles: { mensuel: "Mensuel", annuel: "Annuel" },
    planText: "Parfait pour les entreprises qui veulent aller plus loin avec l'IA.",
    features: PLAN.features as readonly string[],
    perMonth: "/ mois",
    usersTitle: "Agents supplémentaires",
    usersText: "Ajoutez des utilisateurs supplémentaires à votre organisation.",
    usersLabel: "Utilisateurs supplémentaires",
    perUser: "/ utilisateur / mois",
    removeUser: "Retirer un utilisateur",
    addUser: "Ajouter un utilisateur",
    optionsTitle: "Options additionnelles",
    options: Object.fromEntries(OPTIONS.map((o) => [o.id, [o.label, o.info]])) as Record<string, readonly [string, string]>,
    summary: "Récapitulatif",
    total: "Total mensuel HT",
    perYear: (amount: string) => `/ mois, soit ${amount} / an`,
    continue: "Continuer vers le paiement",
    secure: "Paiement sécurisé",
  },
  en: {
    site: "Public site",
    dashboard: "My space",
    later: "Complete later",
    heading: ["Customize your ", "subscription"],
    subtitle: "Choose the plan and options that match your organization's needs.",
    cycleLabel: "Billing period",
    cycles: { mensuel: "Monthly", annuel: "Yearly" },
    planText: "Perfect for businesses that want to go further with AI.",
    features: ["Unlimited AI agents", "All features", "Priority support", "Updates included"],
    perMonth: "/ month",
    usersTitle: "Additional agents",
    usersText: "Add extra users to your organization.",
    usersLabel: "Additional users",
    perUser: "/ user / month",
    removeUser: "Remove a user",
    addUser: "Add a user",
    optionsTitle: "Additional options",
    options: {
      telephonie: ["AI phone calls", "A smart voice agent that handles your calls, qualifies requests and answers 24/7."],
      whatsapp: ["WhatsApp Business", "Automate your conversations and sales on WhatsApp."],
      "marque-blanche": ["White label", "Use the solution under your own brand (logo, name, domain)."],
      "maj-premium": ["Premium updates", "Early access to new features."],
      "statut-premium": ["Premium status", "Premium badge and priority handling."],
      generateur: ["Advanced content generation", "Automatically create content (posts, emails, product sheets…)."],
      analyse: ["Advanced analytics & reports", "Track your performance with detailed reports and insights."],
    } as Record<string, readonly [string, string]>,
    summary: "Summary",
    total: "Monthly total excl. VAT",
    perYear: (amount: string) => `/ month, i.e. ${amount} / year`,
    continue: "Continue to payment",
    secure: "Secure payment",
  },
};

export function AbonnementScreen({
  pricing = DEFAULT_AGENTS_PRICING,
  initialCycle,
  hiddenOptionIds = [],
}: {
  pricing?: AgentsPricing;
  initialCycle?: Cycle;
  /** Catalogue soft-deleted option ids (e.g. telephonie). */
  hiddenOptionIds?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useLang();
  const t = TEXT[textLang(lang)];
  const storedCycle = useSyncExternalStore(subscribeCycle, readAgentsCycle, () => initialCycle ?? "mensuel");
  const queryCycle = parseAgentsCycle(searchParams.get("cycle"));
  const [pickedCycle, setPickedCycle] = useState<Cycle | null>(null);
  const cycle = pickedCycle ?? queryCycle ?? initialCycle ?? storedCycle;
  const [users, setUsers] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  // Runtime payloads can be partial after serialisation; never read raw fields for display/math.
  const rates = normalizeAgentsPricing(pricing);
  const hiddenOpts = new Set(hiddenOptionIds);
  const visibleOptions = OPTIONS.filter((o) => !hiddenOpts.has(o.id));
  const quote = computeQuote({ cycle, users, options: options.filter((id) => !hiddenOpts.has(id)) }, rates);
  const annualPct = Number.isFinite(rates.annualDiscount) ? Math.round(rates.annualDiscount * 100) : 20;

  const chooseCycle = useCallback((next: Cycle) => {
    setPickedCycle(next);
    persistCycle(next);
  }, []);

  const toggle = (id: string) =>
    setOptions((list) => (list.includes(id) ? list.filter((o) => o !== id) : [...list, id]));

  function goToPayment() {
    persistCycle(cycle);
    const params = new URLSearchParams({ cycle, users: String(users), options: options.join(",") });
    router.push(`/paiement?${params}`);
  }

  return (
    <div className="theme-light" translate={nativeTranslate(lang)}>
      <div className="container" id="abonnement">
        <div className="light-top">
          <div className="leave">
            <Link href="/" className="back">
              <Icon name="arrow-left" /> {t.site}
            </Link>
            <Link href="/client/dashboard" className="back">
              {t.dashboard}
            </Link>
          </div>
          <LangSwitch lang={lang} onChange={setLang} />
        </div>

        <div className="page-title">
          <h1>
            {t.heading[0]}
            <span className="text-grad">{t.heading[1]}</span>
          </h1>
          <p>{t.subtitle}</p>
          <div className="cycle" role="group" aria-label={t.cycleLabel}>
            {(["mensuel", "annuel"] as const).map((c) => (
              <button key={c} type="button" data-cycle={c} aria-pressed={cycle === c} onClick={() => chooseCycle(c)}>
                {t.cycles[c]}
              </button>
            ))}
            <span className="discount">-{annualPct}%</span>
          </div>
        </div>

        <div className="layout-2" style={{ maxWidth: 1140, margin: "0 auto 60px" }}>
          <div className="stack">
            <section className="card-l plan-l">
              <div className="row-head">
                <span className="crown">
                  <Icon name="crown" />
                </span>
                <div>
                  <h2>{PLAN.name}</h2>
                  <p>{t.planText}</p>
                </div>
                <div className="amt">
                  <span id="plan-price" className="notranslate">{eur(quote.plan)}</span>
                  <small>{t.perMonth}</small>
                </div>
              </div>
              <ul className="checklist">
                {t.features.map((f) => (
                  <li key={f}>
                    <span className="dot">
                      <Icon name="check" />
                    </span>{" "}
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card-l">
              <div className="sec-head">
                <Icon name="users" />
                <div>
                  <h2>{t.usersTitle}</h2>
                  <p>{t.usersText}</p>
                </div>
              </div>
              <div className="stepper-row">
                <Icon name="users" />
                <span>{t.usersLabel}</span>
                <span className="muted">{eur(rates.userPrice)} {t.perUser}</span>
                <div className="stepper">
                  <button id="users-minus" aria-label={t.removeUser} onClick={() => setUsers((u) => Math.max(0, u - 1))}>
                    −
                  </button>
                  <output id="users-count" className="notranslate" aria-live="polite">
                    {users}
                  </output>
                  <button
                    id="users-plus"
                    aria-label={t.addUser}
                    onClick={() => setUsers((u) => Math.min(MAX_EXTRA_USERS, u + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            </section>

            <section className="card-l">
              <div className="sec-head">
                <Icon name="puzzle" />
                <div>
                  <h2>{t.optionsTitle}</h2>
                </div>
              </div>
              <div className="options">
                {visibleOptions.map((o) => (
                  <label key={o.id} className="option">
                    <Icon name={o.icon} />
                    <span>
                      {t.options[o.id][0]}{" "}
                      <span className="info" title={t.options[o.id][1]}>
                        <Icon name="info" />
                      </span>
                    </span>
                    <span className="muted">{eur(rates.options[o.id] ?? o.price)} {t.perMonth}</span>
                    <span className="switch">
                      <input type="checkbox" name={o.id} checked={options.includes(o.id)} onChange={() => toggle(o.id)} />
                      <span />
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="card-l recap">
            <div className="sec-head">
              <Icon name="calc" />
              <h2>{t.summary}</h2>
            </div>
            <div className="lines">
              <div className="line">
                <span>{PLAN.name}</span>
                <b>
                  <span id="r-plan" className="notranslate">{eur(quote.plan)}</span>
                  <small>{t.perMonth}</small>
                </b>
              </div>
              <div className="line">
                <span>
                  {t.usersLabel} (<span id="r-users-n" className="notranslate">{users}</span>)
                </span>
                <b id="r-users" className="notranslate">{eur(quote.usersTotal)}</b>
              </div>
              <div className="line">
                <span>
                  {t.optionsTitle} (<span id="r-opts-n" className="notranslate">{quote.optionsCount}</span>)
                </span>
                <b id="r-opts" className="notranslate">{eur(quote.optionsTotal)}</b>
              </div>
            </div>
            <div className="total">
              <strong>{t.total}</strong>
              <div className="big">
                <span id="r-total" className="notranslate">{eur(quote.monthly)}</span>
                <small id="r-total-note" key={cycle}>
                  {cycle === "annuel" ? t.perYear(eur(quote.due)) : t.perMonth}
                </small>
              </div>
            </div>
            <button type="button" className="btn btn-light-primary btn-block" onClick={goToPayment}>
              {t.continue} <Icon name="arrow" />
            </button>
            <Link href="/client/dashboard" className="back later">
              {t.later}
            </Link>
            <p className="secure">
              <Icon name="lock" /> {t.secure}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
