"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ANNUAL_DISCOUNT, MAX_EXTRA_USERS, OPTIONS, PLAN, USER_PRICE, computeQuote, eur, type Cycle } from "@/config/pricing";
import { Icon } from "@/components/ui/Icon";
import { LangSwitch, nativeTranslate, textLang, useLang } from "@/components/ui/LangSwitch";

const TEXT = {
  fr: {
    back: "Retour",
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
    back: "Back",
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
      telephonie: ["AI phone calls", "An AI agent answers your calls 24/7."],
      "maj-premium": ["Premium updates", "Early access to new features."],
      "statut-premium": ["Premium status", "Premium badge and priority handling."],
      generateur: ["Advanced content generator", "Advanced templates for text, visuals and videos."],
      analyse: ["Advanced analytics", "Detailed dashboards and reports."],
    } as Record<string, readonly [string, string]>,
    summary: "Summary",
    total: "Monthly total excl. VAT",
    perYear: (amount: string) => `/ month, i.e. ${amount} / year`,
    continue: "Continue to payment",
    secure: "Secure payment",
  },
};

export function AbonnementScreen() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const t = TEXT[textLang(lang)];
  const [cycle, setCycle] = useState<Cycle>("mensuel");
  const [users, setUsers] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const quote = computeQuote({ cycle, users, options });

  const toggle = (id: string) =>
    setOptions((list) => (list.includes(id) ? list.filter((o) => o !== id) : [...list, id]));

  function goToPayment() {
    const params = new URLSearchParams({ cycle, users: String(users), options: options.join(",") });
    router.push(`/paiement.html?${params}`);
  }

  return (
    <div className="theme-light" translate={nativeTranslate(lang)}>
      <div className="container" id="abonnement">
        <div className="light-top">
          <Link href="/organisation.html" className="back">
            <Icon name="arrow-left" /> {t.back}
          </Link>
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
              <button key={c} data-cycle={c} aria-pressed={cycle === c} onClick={() => setCycle(c)}>
                {t.cycles[c]}
              </button>
            ))}
            <span className="discount">-{ANNUAL_DISCOUNT * 100}%</span>
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
                <span className="muted">{eur(USER_PRICE)} {t.perUser}</span>
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
                {OPTIONS.map((o) => (
                  <label key={o.id} className="option">
                    <Icon name={o.icon} />
                    <span>
                      {t.options[o.id][0]}{" "}
                      <span className="info" title={t.options[o.id][1]}>
                        <Icon name="info" />
                      </span>
                    </span>
                    <span className="muted">{eur(o.price)} {t.perMonth}</span>
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
            <p className="secure">
              <Icon name="lock" /> {t.secure}
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
