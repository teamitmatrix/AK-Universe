import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentsSubnav } from "@/components/layout/AgentsSubnav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Icon } from "@/components/ui/Icon";
import { agentById, agents } from "@/config/agents";
import { getCurrentUser } from "@/lib/auth/session";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return agents.map((agent) => ({ id: agent.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const agent = agentById((await params).id);
  if (!agent) return {};
  return {
    title: { absolute: `${agent.name} — ${agent.role} — AK Universe` },
    description: agent.description,
  };
}

export default async function Page({ params }: Props) {
  const agent = agentById((await params).id);
  if (!agent) notFound();
  const user = await getCurrentUser();

  return (
    <>
      <SiteHeader active="agents" signedIn={!!user} />
      <AgentsSubnav active="tous" />
      <main>
        <section className="agent-profile stars">
          <div className="container agent-profile-hero">
            <div className="agent-profile-copy">
              <p className="agent-profile-crumb">
                <Link href="/agents-ia#tous">Agents IA</Link>
                <span aria-hidden="true"> / </span>
                <span>{agent.name}</span>
              </p>
              <h1>{agent.name}</h1>
              <p className="agent-profile-headline">{agent.headline}</p>
              <p className="agent-profile-lead">{agent.description}</p>
              <a href="#en-action" className="btn btn-primary btn-lg">
                Voir l&apos;agent en action <Icon name="arrow" />
              </a>
            </div>
            <div className="agent-profile-visual">
              <Image
                src={agent.heroPortrait}
                alt=""
                width={1300}
                height={830}
                sizes="(max-width: 980px) 100vw, 48vw"
                priority
              />
            </div>
          </div>
        </section>

        <section className="section agent-profile-tasks">
          <div className="container">
            <h2 className="section-title">
              Ce que {agent.name} <span className="gold">peut faire</span>
            </h2>
            <div className="agent-task-grid">
              {agent.tasks.map((task) => (
                <div key={task.label} className="agent-task-card">
                  <span className="agent-task-icon">
                    <Icon name={task.icon} />
                  </span>
                  <p>{task.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="en-action">
          <div className="container">
            <div className="agent-action-card">
              <div className="agent-action-flow" aria-hidden="true">
                <span className="agent-action-node">
                  <Icon name={agent.icon} />
                </span>
                <span className="agent-action-arrow">
                  <Icon name="arrow" />
                </span>
                <span className="agent-action-node">
                  <Icon name="check-circle" />
                </span>
              </div>
              <div>
                <h2 className="gold">{agent.name} en action</h2>
                <p>{agent.action}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section agent-profile-integrations">
          <div className="container">
            <h2 className="section-title">
              Intégrations <span className="gold">confirmées</span>
            </h2>
            <ul className="agent-integration-list">
              {agent.integrations.map((item) => (
                <li key={item}>
                  <Icon name="puzzle" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="container agent-profile-back">
          <Link href="/agents-ia#tous" className="agent-back">
            <Icon name="arrow-left" /> Retour à tous les agents
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
