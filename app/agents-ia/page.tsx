import type { Metadata } from "next";
import { getT } from "@/i18n/server";
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
import { localized } from "@/i18n/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: t("Agents IA — AK Universe") },
    description: t(
      "Rencontrez votre équipe IA : accueil téléphonique, service client, prospection, marketing, recrutement et plus.",
    ),
  };
}

/** The agents questions the chatbot also answers (config/chatbot-faq.ts). */
const FAQ = CHATBOT_FAQ.filter((topic) => topic.topic.startsWith("Agents IA")).flatMap((topic) => topic.entries);

export default async function Page() {
  const [user, t, data] = await Promise.all([
    getCurrentUser(),
    getT(),
    localized({ agents, categories: AGENT_CATEGORIES, faq: FAQ }),
  ]);
  const { agents: list, categories, faq } = data;

  return (
    <>
      <SiteHeader active="agents" signedIn={!!user} />
      <AgentsSubnav active="tous" />
      <main>
        <section className="section agents-catalog stars" id="tous">
          <div className="container">
            <p className="eyebrow">{t("Tous les agents")}</p>
            <h1 className="section-title">
              {t.rich("Rencontrez <gold>votre équipe IA</gold>")}
            </h1>
            <div className="agent-tiles">
              {list.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="categories">
          <div className="container">
            <p className="eyebrow">{t("Catégories")}</p>
            <h2 className="section-title">
              {t.rich("Un agent pour <gold>chaque besoin</gold>")}
            </h2>
            <div className="agent-categories">
              {categories.map((category) => (
                <div key={category.id} className="dark-card agent-category">
                  <span className="icon-circle">
                    <Icon name={category.icon} />
                  </span>
                  <h3>{category.name}</h3>
                  <p>{category.text}</p>
                  <ul>
                    {list
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
            <p className="eyebrow">{t("Démos")}</p>
            <h2 className="section-title">
              {t.rich("Nos agents <gold>en action</gold>")}
            </h2>
            <div className="agent-demos">
              {list.slice(0, 4).map((agent) => (
                <div key={agent.id} className="dark-card agent-demo">
                  <div className="agent-demo-head">
                    <span className="icon-box">
                      <Icon name={agent.icon} />
                    </span>
                    <strong>{agent.name}</strong>
                  </div>
                  <AgentDemo agent={agent} />
                  <Link href={`/agents-ia/${agent.id}`} className="agent-tile-cta">
                    {t("Découvrir l'agent")} <Icon name="arrow" />
                  </Link>
                </div>
              ))}
            </div>
            <div className="agents-cta">
              <Link href={contactHref("Agents IA")} className="btn btn-primary btn-lg">
                {t("Demander une démo personnalisée")} <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </section>

        <AgentPricing />

        <section className="section" id="faq">
          <div className="container agents-faq">
            <p className="eyebrow">FAQ</p>
            <h2 className="section-title">
              {t.rich("Questions <gold>fréquentes</gold>")}
            </h2>
            {faq.map((entry) => (
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
