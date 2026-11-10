"use client";

import Link from "next/link";
import { euro } from "@/lib/projects/quote-math";
import { quoteHref } from "@/lib/contact/quote";
import type { Plan, VideoConfig } from "@/lib/video-config";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { saveForfait } from "./cart";

function PackPrice({ plan }: { plan: Plan }) {
  if (plan.onQuote || plan.price == null) {
    return <span className="marketing-pack-price">Sur devis</span>;
  }
  return (
    <span className="marketing-pack-price">
      À partir de <strong>{euro(plan.price)}</strong> {plan.priceUnit ?? "HT / mois"}
      {plan.setupPrice != null ? (
        <small>
          + {euro(plan.setupPrice)} HT {plan.setupLabel ?? "de mise en place"}
        </small>
      ) : null}
    </span>
  );
}

/** Bundle cards for /marketing#packs — uses the same forfait catalogue as /marketing/forfaits. */
export function MarketingPacks({ config }: { config: VideoConfig }) {
  const [toast, toastNode] = useToast();
  const plans = config.marketing?.plans ?? [];

  const addPack = (plan: Plan) => {
    if (plan.onQuote || plan.price == null) {
      window.location.assign(quoteHref(`marketing:${plan.key}`));
      return;
    }
    saveForfait(config, plan.key);
    toast(`${plan.name} ajouté à mon projet`);
  };

  if (!plans.length) return null;

  return (
    <section className="section" id="packs">
      <div className="container">
        <p className="eyebrow">Nos packs</p>
        <h2 className="section-title">
          Des formules <span className="gold">clé en main</span>
        </h2>
        <p className="section-sub">
          Chaque pack regroupe plusieurs prestations marketing : contenus, volumes et accompagnement inclus, avec un
          prix de départ clair.
        </p>
        <div className="agent-categories marketing-packs">
          {plans.map((plan) => {
            const quoteOnly = plan.onQuote || plan.price == null;
            const includes = plan.features?.length
              ? plan.features
              : (plan.blocks?.find((block) => block.list?.length)?.list ?? []);
            return (
              <article key={plan.key} className={`dark-card marketing-pack${plan.popular ? " featured" : ""}`}>
                {plan.popular ? (
                  <span className="tag marketing-pack-tag">
                    <Icon name="star" /> Le plus populaire
                  </span>
                ) : null}
                <h3>{plan.name}</h3>
                {(plan.sub ?? []).map((line) => (
                  <p key={line} className="marketing-pack-sub">
                    {line}
                  </p>
                ))}
                <p>{plan.desc ?? plan.tagline}</p>
                {includes.length ? (
                  <ul>
                    {includes.map((item) => (
                      <li key={item}>
                        <Icon name="check-circle" /> {item}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <PackPrice plan={plan} />
                <div className="marketing-pack-actions">
                  <button type="button" className="btn btn-primary" onClick={() => addPack(plan)}>
                    {quoteOnly ? (
                      <>
                        Demander un devis <Icon name="arrow" />
                      </>
                    ) : (
                      <>
                        <Icon name="plus" /> Ajouter au panier
                      </>
                    )}
                  </button>
                  <Link href="/marketing/forfaits" className="btn btn-outline">
                    Découvrir
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {toastNode}
    </section>
  );
}
