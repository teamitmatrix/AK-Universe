import type { Metadata } from "next";
import Link from "next/link";
import { AgentCard, AgentDemo } from "@/components/layout/AgentCard";
import { AgentPricing } from "@/components/layout/AgentPricing";
import { AgentsSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { AGENT_CATEGORIES, agents } from "@/config/agents";
import { CHATBOT_FAQ } from "@/config/chatbot-faq";
import { contactHref } from "@/lib/contact/quote";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { absolute: "Agents IA — AK Universe" },
  description:
    "Rencontrez votre équipe IA : accueil téléphonique, service client, prospection, marketing, recrutement et plus.",
};

/** The agents questions the chatbot also answers (config/chatbot-faq.ts). */
const FAQ = CHATBOT_FAQ.filter((topic) => topic.topic.startsWith("Agents IA")).flatMap((topic) => topic.entries);

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="agents" signedIn={!!user} />
      <AgentsSubnav active="tous" />
      <main>
        <section className="section agents-catalog stars" id="tous">
          <div className="container">
            <p className="eyebrow">Tous les agents</p>
            <h1 className="section-title">
              Rencontrez <span className="gold">votre équipe IA</span>
            </h1>
            <div className="agent-tiles">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="categories">
          <div className="container">
            <p className="eyebrow">Catégories</p>
            <h2 className="section-title">
              Un agent pour <span className="gold">chaque besoin</span>
            </h2>
            <div className="agent-categories">
              {AGENT_CATEGORIES.map((category) => (
                <div key={category.id} className="dark-card agent-category">
                  <span className="icon-circle">
                    <Icon name={category.icon} />
                  </span>
                  <h3>{category.name}</h3>
                  <p>{category.text}</p>
                  <ul>
                    {agents
                      .filter((agent) => agent.category === category.id)
                      .map((agent) => (
                        <li key={agent.id}>
                          <Link href={`/agents-ia/${agent.id}`}>
                            {agent.name} <Icon name="chev-right" />
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="demos">
          <div className="container">
            <p className="eyebrow">Démos</p>
            <h2 className="section-title">
              Nos agents <span className="gold">en action</span>
            </h2>
            <div className="agent-demos">
              {agents.slice(0, 4).map((agent) => (
                <div key={agent.id} className="dark-card agent-demo">
                  <div className="agent-demo-head">
                    <span className="icon-box">
                      <Icon name={agent.icon} />
                    </span>
                    <strong>{agent.name}</strong>
                  </div>
                  <AgentDemo agent={agent} />
                  <Link href={`/agents-ia/${agent.id}`} className="agent-tile-cta">
                    Découvrir l&apos;agent <Icon name="arrow" />
                  </Link>
                </div>
              ))}
            </div>
            <div className="agents-cta">
              <Link href={contactHref("Agents IA")} className="btn btn-primary btn-lg">
                Demander une démo personnalisée <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>

        <AgentPricing />

        <section className="section" id="faq">
          <div className="container agents-faq">
            <p className="eyebrow">FAQ</p>
            <h2 className="section-title">
              Questions <span className="gold">fréquentes</span>
            </h2>
            {FAQ.map((entry) => (
              <details key={entry.q} className="dark-card">
                <summary>
                  {entry.q} <Icon name="chev-down" className="chev" />
                </summary>
                <p>{entry.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
