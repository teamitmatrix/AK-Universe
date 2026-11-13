"use client";

import Link from "next/link";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { quoteHref } from "@/lib/contact/quote";
import type { Plan, PlanBlock } from "@/lib/video-config";
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

function OfferBlock({ block }: { block: PlanBlock }) {
  return (
    <div className="mk-offer-block">
      <div className="mk-offer-block-head">
        <span className="icon-box mk-offer-ico">
          <Icon name={block.icon} />
        </span>
        <strong>{block.title}</strong>
      </div>
      {block.text ? <p>{block.text}</p> : null}
      {block.list?.length ? (
        <ul className="feature-list digital-points mk-offer-list">
          {block.list.map((item) => (
            <li key={item}>
              <Icon name="check-circle" /> {item}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function OfferFooter({ plan }: { plan: Plan }) {
  const t = useT();
  return (
    <div className={`mk-offer-footer${plan.onQuote ? " mk-offer-footer-single" : ""}`}>
      <div className="mk-offer-price">
        <div className="mk-offer-footer-head">
          <Icon name="tag" />
          <span>{plan.priceTitle ?? t("À partir de")}</span>
        </div>
        {plan.onQuote || plan.price == null ? (
          <div className="mk-offer-amount mk-offer-quote">{t("Sur devis")}</div>
        ) : (
          <>
            {plan.setupPrice != null ? (
              <>
                <div className="mk-offer-amount">
                  {euro(plan.setupPrice)} <span>{t("HT")}</span>
                </div>
                {plan.setupLabel ? <div className="mk-offer-note">{plan.setupLabel}</div> : null}
                <div className="mk-offer-amount mk-offer-amount-sm">
                  {euro(plan.price)} <span>{plan.priceUnit ?? t("HT / mois")}</span>
                </div>
              </>
            ) : (
              <div className="mk-offer-amount">
                {euro(plan.price)} <span>{plan.priceUnit ?? t("HT / mois")}</span>
              </div>
            )}
          </>
        )}
      </div>
      {plan.bonus ? (
        <div className="mk-offer-bonus">
          <div className="mk-offer-footer-head">
            <Icon name="sparkle" />
            <span>{plan.bonus.title}</span>
          </div>
          {plan.bonus.texts.map((entry, index) => (
            <p
              key={`${entry.text}-${index}`}
              className={`mk-offer-bonus-text${entry.muted ? " muted" : ""}`}
            >
              {entry.strong ? <strong>{entry.strong}</strong> : null}
              {entry.text}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ForfaitsView() {
  const t = useT();
  const { config, toast } = useVideo();
  const marketing = config.marketing;

  if (!marketing?.plans?.length) {
    return (
      <main>
        <div className="container empty-state">
          <h1>{t("Forfaits Marketing")}</h1>
        </div>
      </main>
    );
  }

  const choose = (plan: Plan) => {
    if (plan.onQuote || plan.price == null) {
      window.location.assign(quoteHref(`marketing:${plan.key}`));
      return;
    }
    saveForfait(config, plan.key);
    window.location.assign("/projet");
  };

  return (
    <main>
      <section className="pricing stars">
        <div className="container">
          <div className="pricing-head">
            <h1>{t.rich("Forfaits <gold>Marketing</gold>")}</h1>
            <p>
              {t(
                "Des solutions complètes pour booster votre visibilité, attirer plus de clients et développer votre activité grâce à des vidéos et stratégies marketing sur-mesure.",
              )}
            </p>
          </div>
          {!!marketing.benefits?.length && <Perks items={marketing.benefits} className="hero-perks" />}
          <div className="mk-offers-grid">
            {marketing.plans.map((plan) => (
              <article key={plan.key} className={`mk-offer${plan.popular ? " featured" : ""}`}>
                {plan.popular ? (
                  <span className="popular">
                    <Icon name="star" /> {t("Le plus populaire")}
                  </span>
                ) : null}
                <div className="mk-offer-main">
                  <div className="mk-offer-head">
                    {plan.num ? <span className="mk-offer-num">{plan.num}</span> : null}
                    <div className="mk-offer-titles">
                      <h2>{plan.name}</h2>
                      {(plan.sub ?? []).map((line) => (
                        <span key={line} className="mk-offer-sub">
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                  {plan.desc ? <p className="mk-offer-desc">{plan.desc}</p> : null}
                  <div className="mk-offer-body">
                    {(plan.blocks ?? []).map((block) => (
                      <OfferBlock key={block.title} block={block} />
                    ))}
                  </div>
                </div>
                <OfferFooter plan={plan} />
                <button type="button" className="btn btn-primary btn-block" onClick={() => choose(plan)}>
                  {plan.onQuote || plan.price == null ? t("Demander un devis") : t("Choisir ce forfait")}{" "}
                  <Icon name="arrow" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <p className="eyebrow">{t("Nos forfaits")}</p>
          <h2 className="section-title">{t.rich("Ce qui est inclus dans <gold>tous nos forfaits</gold>")}</h2>
          {!!marketing.included?.length && <Perks items={marketing.included} />}
          {marketing.customQuote && (
            <div className="cta-box">
              <h2>{marketing.customQuote.title}</h2>
              <p className="cta-box-text">{marketing.customQuote.text}</p>
              <div className="cta-row cta-row-center">
                <Link href={quoteHref()} className="btn btn-primary btn-lg">
                  {marketing.customQuote.primaryCta} <Icon name="arrow" />
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-lg"
                  onClick={() => toast(t("La prise de rendez-vous avec un expert sera bientôt disponible."))}
                >
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
