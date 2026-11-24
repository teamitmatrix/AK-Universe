"use client";

import Image from "next/image";
import Link from "next/link";
import type { Agent } from "@/config/agents";
import { Icon } from "@/components/ui/Icon";

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Catalog card: portrait, name, role, example, price, discover + configure options. */
export function AgentCard({ agent }: { agent: Agent }) {
  const priced = agent.priceMonthly != null && agent.priceMonthly > 0;

  return (
    <article className="agent-tile marketing-tile">
      <Link href={`/agents-ia/${agent.id}`} className="agent-tile-media" aria-label={`${agent.name} — découvrir`}>
        <Image
          src={agent.portrait}
          alt=""
          width={1248}
          height={780}
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
        />
      </Link>
      <strong>
        <Link href={`/agents-ia/${agent.id}`}>{agent.name}</Link>
      </strong>
      <span className="agent-tile-role">{agent.role}</span>
      <span className="agent-tile-text">{agent.example}</span>
      {priced ? (
        <span className="agent-tile-price">
          À partir de <strong>{euros(agent.priceMonthly!)} €</strong> HT / mois
          {agent.priceAnnual != null ? (
            <>
              <br />
              soit {euros(agent.priceAnnual)} € / an
            </>
          ) : null}
          {agent.setupFrom != null ? (
            <>
              <br />
              Mise en place {euros(agent.setupFrom)} € HT
            </>
          ) : null}
          {agent.capacityLabel ? (
            <>
              <br />
              {agent.capacityLabel}
            </>
          ) : null}
        </span>
      ) : null}
      <div className="agent-tile-actions">
        <Link href={`/agents-ia/${agent.id}`} className="btn btn-outline btn-sm">
          Découvrir
        </Link>
        {priced ? (
          <Link href={`/agents-ia/${agent.id}#acheter`} className="btn btn-primary btn-sm">
            <Icon name="plus" /> Choisir les options
          </Link>
        ) : null}
      </div>
    </article>
  );
}

/** Sample conversation of an agent (config/agents.ts), labelled as an example. */
export function AgentDemo({ agent }: { agent: Agent }) {
  return (
    <div className="agent-chat" aria-label={`Exemple de conversation avec ${agent.name}`}>
      {agent.demo.map((line, i) => (
        <p key={i} className={`agent-bubble from-${line.from}`}>
          {line.text}
        </p>
      ))}
      <small>Exemple de conversation</small>
    </div>
  );
}
