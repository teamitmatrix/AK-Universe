"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  AGENT_TIERS,
  normalizeAgentsPricing,
  type AgentsPricing,
  type Cycle,
} from "@/config/pricing";
import { quoteHref } from "@/lib/contact/quote";
import { writeAgentsCycle } from "@/lib/agents-cycle";

/** Look of each offer, in AGENT_TIERS order (copy lives in config; amounts come from live pricing). */
const LOOK = [
  { image: "ph-plan-starter", cta: "Commencer gratuitement", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "rocket" },
  { image: "ph-plan-pro", cta: "Essayer gratuitement", ctaClass: "btn btn-primary btn-block", setupIcon: "gear" },
  { image: "ph-plan-business", cta: "Essayer gratuitement", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "chart" },
  { image: "ph-plan-business", cta: "Essayer gratuitement", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "bolt" },
  { image: "ph-plan-devis", cta: "Nous contacter", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "headset", href: quoteHref() },
];

function formatTierPrice(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** Pricing block of the AI agents page (/agents-ia#tarifs). */
export function AgentPricing({ pricing, hiddenIds = [] }: { pricing: AgentsPricing; hiddenIds?: string[] }) {
  const rates = normalizeAgentsPricing(pricing);
  const [cycle, setCycle] = useState<Cycle>("mensuel");
  const annual = cycle === "annuel";
  const annualPct = Math.round(rates.annualDiscount * 100);
  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const setBilling = (next: Cycle) => {
    setCycle(next);
    writeAgentsCycle(next);
  };

  const plans = AGENT_TIERS.flatMap((tier, i) => {
    if (hidden.has(`tier:${tier.name}`)) return [];
    const live = rates.tiers[tier.name] ?? { price: tier.price, setupFrom: tier.setupFrom };
    const monthly = live.price;
    const setupFrom = live.setupFrom;
    const annualPrice = "priceAnnual" in tier ? tier.priceAnnual : null;
    const display =
      monthly == null ? null : annual && annualPrice != null ? annualPrice : monthly;
    const yearlyNote =
      monthly != null && annualPrice != null
        ? formatTierPrice(annualPrice)
        : monthly != null
          ? formatTierPrice(Math.round(monthly * 12 * (1 - rates.annualDiscount) * 100) / 100)
          : "";
    return [
      {
        ...tier,
        ...LOOK[i],
        popular: "popular" in tier && tier.popular,
        quote: display === null,
        price: display === null ? "" : formatTierPrice(display),
        yearlyNote,
        perLabel: annual && annualPrice != null ? "/ an HT" : "/ mois HT",
        setup:
          setupFrom === null ? (
            <>
              Mise en place
              <br />
              <span className="gold">sur devis</span>
            </>
          ) : (
            <>
              Mise en place / onboarding
              <br />
              <span className="gold">{setupFrom.toLocaleString("fr-FR")} € HT</span>
            </>
          ),
      },
    ];
  });

  return (
    <section className="pricing stars" id="tarifs">
      <div className="container">
        <div className="pricing-head">
          <p className="eyebrow eyebrow-lines">Nos tarifs</p>
          <h2>
            Des solutions adaptées
            <br />à chaque <span className="gold">entreprise.</span>
          </h2>
          <p>
            Commencez simplement et évoluez selon vos besoins.
            <br />
            Plus de productivité, moins de coûts.
          </p>
          <div className="cycle" role="group" aria-label="Période de facturation">
            {(["mensuel", "annuel"] as const).map((c) => (
              <button key={c} type="button" data-cycle={c} aria-pressed={cycle === c} onClick={() => setBilling(c)}>
                {c === "mensuel" ? "Mensuel" : "Annuel"}
              </button>
            ))}
            <span className="discount">-{annualPct}%</span>
          </div>
        </div>

        <div className="plans">
          {plans.map((plan) => (
            <article key={plan.name} className={`plan${plan.popular ? " featured" : ""}`}>
              {plan.popular && (
                <span className="popular">
                  <Icon name="star" /> Le plus populaire
                </span>
              )}
              <div className="plan-top">
                <div className={`ph ph-m10 ${plan.image}`} aria-hidden="true" />
                <h3>{plan.name}</h3>
                <p className="desc">{plan.desc}</p>
                {plan.quote ? (
                  <div className="price">
                    Sur
                    <br />
                    devis
                  </div>
                ) : (
                  <>
                    <div className="price">
                      {plan.price}
                      <sup>€</sup>
                    </div>
                    <div className="per">{plan.perLabel}</div>
                    {!annual && plan.yearlyNote ? <div className="per-year">soit {plan.yearlyNote} € / an</div> : null}
                    {annual && plan.price ? <div className="per-year">forfait annuel HT</div> : null}
                  </>
                )}
              </div>
              <ul className="feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check-circle" /> {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href ?? `/inscription?next=${encodeURIComponent("/abonnement")}`}
                className={plan.ctaClass}
                onClick={() => writeAgentsCycle(cycle)}
              >
                {plan.cta} <Icon name="arrow" />
              </Link>
              <div className="setup">
                <span className="icon-circle">
                  <Icon name={plan.setupIcon} />
                </span>
                <span>{plan.setup}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="perks">
          <div className="perk">
            <span className="icon-circle">
              <Icon name="bolt" />
            </span>
            <div>
              <strong>Sans engagement</strong>
              <span>Annulation à tout moment</span>
            </div>
          </div>
          <div className="perk">
            <span className="icon-circle">
              <Icon name="clock" />
            </span>
            <div>
              <strong>Accès immédiat</strong>
              <span>Commencez en quelques minutes</span>
            </div>
          </div>
          <div className="perk">
            <span className="icon-circle">
              <Icon name="chart" />
            </span>
            <div>
              <strong>Résultats concrets</strong>
              <span>Plus de productivité, moins de coûts</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
