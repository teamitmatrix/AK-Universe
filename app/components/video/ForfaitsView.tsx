"use client";

import Link from "next/link";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { quoteHref } from "@/lib/contact/quote";
import { saveForfait } from "./cart";
import { useVideo } from "./context";

function Perks({ items, className = "" }: { items: { icon: string; title: string; text: string }[]; className?: string }) {
  return (
    <div className={`perks ${className}`.trim()}>
      {items.map((item) => (
        <div key={item.title} className="perk">
          <span className="icon-circle">
            <Icon name={item.icon} />
          </span>
          <div>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ForfaitsView() {
  const { config, toast } = useVideo();
  const marketing = config.marketing;

  if (!marketing?.plans?.length) {
    return (
      <main>
        <div className="container empty-state">
          <h1>Forfaits Marketing</h1>
        </div>
      </main>
    );
  }

  const choose = (key: string) => {
    if (!marketing.plans?.some((item) => item.key === key)) return;
    saveForfait(config, key);
    window.location.assign("/projet");
  };

  return (
    <main>
      <section className="pricing stars">
        <div className="container">
          <div className="pricing-head">
            <h1>
              Forfaits <span className="gold">Marketing</span>
            </h1>
            <p>
              Des solutions complètes pour booster votre visibilité, attirer plus de clients et développer votre activité
              grâce à des vidéos et stratégies marketing sur-mesure.
            </p>
          </div>
          {!!marketing.benefits?.length && <Perks items={marketing.benefits} className="hero-perks" />}
          <div className="plans forfaits-grid">
            {marketing.plans.map((plan) => (
              <article key={plan.key} className={`plan forfait${plan.popular ? " featured" : ""}`}>
                {plan.popular && (
                  <span className="popular">
                    <Icon name="star" /> Le plus populaire
                  </span>
                )}
                <div className="plan-top">
                  <h2>{plan.name}</h2>
                  <div className="amt">
                    <span className="from">À partir de</span>
                    <div className="price">{euro(plan.price)}</div>
                    <div className="per">HT / mois</div>
                  </div>
                </div>
                <p className="desc">{plan.tagline}</p>
                <ul className="feature-list">
                  {(plan.features ?? []).map((feature) => (
                    <li key={feature}>
                      <Icon name="check-circle" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn-primary btn-block" onClick={() => choose(plan.key)}>
                  Choisir ce forfait <Icon name="arrow" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">Nos forfaits</p>
          <h2 className="section-title">
            Ce qui est inclus dans <span className="gold">tous nos forfaits</span>
          </h2>
          {!!marketing.included?.length && <Perks items={marketing.included} />}
          {marketing.customQuote && (
            <div className="cta-box">
              <h2>{marketing.customQuote.title}</h2>
              <p className="cta-box-text">{marketing.customQuote.text}</p>
              <div className="cta-row cta-row-center">
                <Link href={quoteHref()} className="btn btn-primary btn-lg">
                  {marketing.customQuote.primaryCta} <Icon name="arrow" />
                </Link>
                <button type="button" className="btn btn-outline btn-lg" onClick={() => toast("La prise de rendez-vous avec un expert sera bientôt disponible.")}>
                  {marketing.customQuote.secondaryCta}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
