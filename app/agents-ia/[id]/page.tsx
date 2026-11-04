import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentCard, AgentDemo } from "@/components/layout/AgentCard";
import { AgentsSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { AGENT_CATEGORIES, AGENT_LANGUAGES, agentById, agents } from "@/config/agents";
import { AGENT_TIERS } from "@/config/pricing";
import { contactHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agent = agentById((await params).id);
  if (!agent) return {};
  return { title: { absolute: `${agent.name} — AK Universe` }, description: agent.tagline };
}

export default async function Page({ params }: Props) {
  const agent = agentById((await params).id);
  if (!agent) notFound();
  const user = await getCurrentUser();
  const category = AGENT_CATEGORIES.find((c) => c.id === agent.category);
  const related = agents.filter((a) => a.category === agent.category && a.id !== agent.id).slice(0, 3);

  const blocks = [
    { title: "Fonctionnalités", icon: "check-circle", items: agent.features },
    { title: "Capacités", icon: "sparkle", items: agent.capabilities },
    { title: "Intégrations", icon: "puzzle", items: agent.integrations },
    { title: "Langues prises en charge", icon: "message", items: AGENT_LANGUAGES },
  ];

  return (
    <>
      <SiteHeader active="agents" signedIn={!!user} />
      <AgentsSubnav active="tous" />
      <main>
        <section className="pricing stars agents-hero">
          <div className="container agent-detail-hero">
            <div>
              <Link href="/agents-ia#tous" className="agent-back">
                <Icon name="arrow-left" /> Tous les agents
              </Link>
              {category && <p className="eyebrow">{category.name}</p>}
              <h1>
                <span className="gold">{agent.name}</span>
              </h1>
              <p className="lead">{agent.description}</p>
              <div className="cta-row">
                <Link href={user ? "/abonnement" : "/inscription"} className="btn btn-primary btn-lg">
                  Essayer gratuitement <Icon name="arrow" />
                </Link>
                <Link href={contactHref("Agents IA")} className="btn btn-outline btn-lg">
                  Demander une démo
                </Link>
              </div>
            </div>
            <div className="dark-card agent-demo">
              <div className="agent-demo-head">
                <span className="icon-box">
                  <Icon name={agent.icon} />
                </span>
                <strong>{agent.name}</strong>
              </div>
              <AgentDemo agent={agent} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container agent-blocks">
            {blocks.map((block) => (
              <div key={block.title} className="dark-card">
                <h2>{block.title}</h2>
                <ul className="feature-list">
                  {block.items.map((item) => (
                    <li key={item}>
                      <Icon name={block.icon} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="container">
            <p className="eyebrow">Tarifs</p>
            <h2 className="section-title">
              Disponible dans <span className="gold">toutes nos offres</span>
            </h2>
            <div className="agent-prices">
              {AGENT_TIERS.map((tier) => (
                <div key={tier.name} className={`dark-card${"popular" in tier ? " featured" : ""}`}>
                  <strong>{tier.name}</strong>
                  <span className="agent-price">
                    {tier.price === null ? "Sur devis" : `${tier.price.toLocaleString("fr-FR")} € HT / mois`}
                  </span>
                  <small>{tier.desc}</small>
                </div>
              ))}
            </div>
            <div className="agents-cta">
              <Link href="/agents-ia/tarifs" className="btn btn-outline-gold btn-lg">
                Voir le détail des offres <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="section">
            <div className="container">
              <p className="eyebrow">Dans la même catégorie</p>
              <h2 className="section-title">
                Autres <span className="gold">agents</span>
              </h2>
              <div className="agent-tiles">
                {related.map((a) => (
                  <AgentCard key={a.id} agent={a} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
