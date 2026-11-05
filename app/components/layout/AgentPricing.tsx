import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AGENT_TIERS } from "@/config/pricing";
import { quoteHref } from "@/lib/contact/quote";

/** Look of each offer, in AGENT_TIERS order (texts and prices live in config/pricing.ts). */
const LOOK = [
  { image: "ph-plan-starter", cta: "Commencer gratuitement", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "rocket" },
  { image: "ph-plan-pro", cta: "Essayer gratuitement", ctaClass: "btn btn-primary btn-block", setupIcon: "gear" },
  { image: "ph-plan-business", cta: "Essayer gratuitement", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "chart" },
  { image: "ph-plan-devis", cta: "Nous contacter", ctaClass: "btn btn-outline-gold btn-block", setupIcon: "headset", href: quoteHref() },
];

const PLANS = AGENT_TIERS.map((tier, i) => ({
  ...tier,
  ...LOOK[i],
  popular: "popular" in tier && tier.popular,
  quote: tier.price === null,
  price: tier.price === null ? "" : tier.price.toLocaleString("fr-FR"),
  setup:
    tier.setupFrom === null ? (
      <>
        Mise en place
        <br />
        <span className="gold">sur devis</span>
      </>
    ) : (
      <>
        Mise en place
        <br />à partir de <span className="gold">{tier.setupFrom.toLocaleString("fr-FR")} € HT</span>
      </>
    ),
}));

/** Pricing block of the AI agents page (/agents-ia#tarifs). */
export function AgentPricing() {
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
        </div>

        <div className="plans">
          {PLANS.map((plan) => (
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
                    <div className="per">/ mois HT</div>
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
              <Link href={plan.href ?? "/inscription"} className={plan.ctaClass}>
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
