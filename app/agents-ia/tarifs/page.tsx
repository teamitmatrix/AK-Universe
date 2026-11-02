import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Tarifs Agents IA — AK Universe" },
  description: "Des offres d'agents IA adaptées à chaque entreprise : Starter, Pro, Pro Business et Sur devis.",
};

const PLANS = [
  {
    name: "Starter",
    desc: "Pour bien commencer avec l'IA.",
    price: "490",
    quote: false,
    image: "ph-plan-starter",
    features: ["1 agent IA au choix", "Tâches essentielles", "Support par email", "Idéal pour les petites entreprises"],
    cta: "Commencer gratuitement",
    ctaClass: "btn btn-outline-gold btn-block",
    setupIcon: "rocket",
    setup: (
      <>
        Mise en place
        <br />à partir de <span className="gold">390 € HT</span>
      </>
    ),
  },
  {
    name: "Pro",
    desc: "Pour accélérer votre croissance.",
    price: "990",
    quote: false,
    popular: true,
    image: "ph-plan-pro",
    features: [
      "Jusqu'à 3 agents IA",
      "Automatisation avancée",
      "Intégrations (CRM, outils…)",
      "Support prioritaire",
      "Rapports de performance",
    ],
    cta: "Essayer gratuitement",
    ctaClass: "btn btn-primary btn-block",
    setupIcon: "gear",
    setup: (
      <>
        Mise en place
        <br />à partir de <span className="gold">590 € HT</span>
      </>
    ),
  },
  {
    name: "Pro Business",
    desc: "Pour les entreprises en pleine expansion.",
    price: "1 690",
    quote: false,
    image: "ph-plan-business",
    features: [
      "Jusqu'à 5 agents IA",
      "Solutions personnalisées",
      "Intégrations avancées",
      "Support dédié",
      "Suivi et optimisation",
      "Reporting avancé",
    ],
    cta: "Essayer gratuitement",
    ctaClass: "btn btn-outline-gold btn-block",
    setupIcon: "chart",
    setup: (
      <>
        Mise en place
        <br />à partir de <span className="gold">990 € HT</span>
      </>
    ),
  },
  {
    name: "Sur devis",
    desc: "Pour les grandes équipes et projets spécifiques.",
    price: "",
    quote: true,
    image: "ph-plan-devis",
    features: [
      "Agents IA illimités",
      "Solutions sur mesure",
      "Intégrations spécifiques",
      "Accompagnement dédié",
      "Formation et suivi",
      "Accès à la roadmap produit",
    ],
    cta: "Nous contacter",
    ctaClass: "btn btn-outline-gold btn-block",
    href: "#",
    setupIcon: "headset",
    setup: (
      <>
        Mise en place
        <br />
        <span className="gold">sur devis</span>
      </>
    ),
  },
];

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="tarifs" signedIn={!!user} />
      <main className="pricing stars">
        <div className="container">
          <div className="pricing-head">
            <p className="eyebrow eyebrow-lines">Nos tarifs</p>
            <h1>
              Des solutions adaptées
              <br />à chaque <span className="gold">entreprise.</span>
            </h1>
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
                  <h2>{plan.name}</h2>
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
      </main>
      <SiteFooter />
    </>
  );
}
