import Link from "next/link";

type SubnavLink = { id: string; href: string; label: string };

const AGENT_LINKS = [
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
export function AgentsSubnav({ active = "tous" }: { active?: (typeof AGENT_LINKS)[number]["id"] }) {
  return <Subnav label="Agents IA" links={AGENT_LINKS} active={active} />;
}

const MARKETING_LINKS = [
  { id: "marketing", href: "/marketing", label: "Marketing" },
  { id: "services", href: "/services", label: "Tous les services" },
  { id: "social", href: "/services/video-reseaux-sociaux", label: "Réseaux sociaux" },
  { id: "realisations", href: "/marketing/realisations", label: "Réalisations" },
  { id: "forfaits", href: "/marketing/forfaits", label: "Tarifs" },
] as const;

/** Bar of the marketing pages, under the same site header as Agents IA and Digital. */
export function MarketingSubnav({ active = "marketing" }: { active?: (typeof MARKETING_LINKS)[number]["id"] }) {
  return <Subnav label="Marketing" links={MARKETING_LINKS} active={active} />;
}
