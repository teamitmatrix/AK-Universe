import Link from "next/link";

type SubnavLink = { id: string; href: string; label: string };

const AGENT_LINKS = [
  { id: "agents", href: "/agents-ia", label: "Nos agents IA" },
  { id: "tous", href: "/agents-ia#tous", label: "Tous les agents" },
  { id: "categories", href: "/agents-ia#categories", label: "Catégories" },
  { id: "demos", href: "/agents-ia#demos", label: "Démos" },
  { id: "tarifs", href: "/agents-ia/tarifs", label: "Tarifs" },
  { id: "faq", href: "/agents-ia#faq", label: "FAQ" },
] as const;

/** Secondary bar of a section, under the site header. */
export function Subnav({ label, links, active }: { label: string; links: readonly SubnavLink[]; active?: string }) {
  return (
    <nav className="agents-subnav" aria-label={label}>
      <div className="container">
        <ul>
          {links.map((link) => (
            <li key={link.id}>
              <Link
                href={link.href}
                className={link.id === active ? "active" : undefined}
                aria-current={link.id === active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** Bar of the AI agents pages (/agents-ia, /agents-ia/<id>, /agents-ia/tarifs). */
export function AgentsSubnav({ active = "agents" }: { active?: (typeof AGENT_LINKS)[number]["id"] }) {
  return <Subnav label="Agents IA" links={AGENT_LINKS} active={active} />;
}
