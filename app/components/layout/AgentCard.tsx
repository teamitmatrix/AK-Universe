import Link from "next/link";
import { AGENT_CATEGORIES, type Agent } from "@/config/agents";
import { Icon } from "@/components/ui/Icon";

/** Premium card of one AI agent, linking to /agents-ia/<id>. */
export function AgentCard({ agent }: { agent: Agent }) {
  const category = AGENT_CATEGORIES.find((c) => c.id === agent.category);
  return (
    <Link href={`/agents-ia/${agent.id}`} className="agent-tile">
      <span className="agent-tile-top">
        <span className="icon-box">
          <Icon name={agent.icon} />
        </span>
        {category && <span className="tag">{category.name}</span>}
      </span>
      <strong>{agent.name}</strong>
      <span className="agent-tile-text">{agent.tagline}</span>
      <span className="agent-tile-cta">
        Découvrir l&apos;agent <Icon name="arrow" />
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
