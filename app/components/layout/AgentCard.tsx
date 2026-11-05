import Image from "next/image";
import Link from "next/link";
import type { Agent } from "@/config/agents";
import { Icon } from "@/components/ui/Icon";

/** Catalog card: portrait, name, role, example, link to /agents-ia/<id>. */
export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents-ia/${agent.id}`} className="agent-tile">
      <span className="agent-tile-media">
        <Image
          src={agent.portrait}
          alt=""
          width={1248}
          height={780}
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw"
        />
      </span>
      <strong>{agent.name}</strong>
      <span className="agent-tile-role">{agent.role}</span>
      <span className="agent-tile-text">{agent.example}</span>
      <span className="agent-tile-cta">
        Découvrir <Icon name="arrow" />
      </span>
    </Link>
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
