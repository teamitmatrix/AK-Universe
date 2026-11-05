"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/components/ui/LangSwitch";

type SubnavLink = { id: string; href: string; label: string; labelEn?: string };

/** Tab that matches the address: a section hash on this page, or the page itself. */
function selectedId(links: readonly SubnavLink[], pathname: string, hash: string, fallback?: string) {
  const section = links.find((link) => {
    const mark = link.href.indexOf("#");
    if (mark === -1) return false;
    const path = link.href.slice(0, mark);
    return (path === "" || path === pathname) && link.href.slice(mark) === hash;
  });
  if (section) return section.id;
  if (!hash) {
    const page = links.find((link) => link.href === pathname);
    if (page) return page.id;
  }
  return fallback;
}

const AGENT_LINKS = [
  { id: "tous", href: "/agents-ia#tous", label: "Tous les agents" },
  { id: "categories", href: "/agents-ia#categories", label: "Catégories" },
  { id: "demos", href: "/agents-ia#demos", label: "Démos" },
  { id: "tarifs", href: "/agents-ia#tarifs", label: "Tarifs" },
  { id: "faq", href: "/agents-ia#faq", label: "FAQ" },
] as const;

/** Secondary bar of a section, under the site header. */
export function Subnav({ label, links, active }: { label: string; links: readonly SubnavLink[]; active?: string }) {
  const pathname = usePathname();
  const [lang] = useLang();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  const current = selectedId(links, pathname, hash, active);

  return (
    <nav className="agents-subnav" aria-label={label}>
      <div className="container">
        <ul>
          {links.map((link) => {
            const on = link.id === current;
            const english = lang === "en" && link.labelEn;
            return (
              <li key={link.id}>
                <Link
                  href={link.href}
                  className={[on ? "active" : "", english ? "notranslate" : ""].filter(Boolean).join(" ") || undefined}
                  translate={english ? "no" : undefined}
                  aria-current={on ? "page" : undefined}
                  onClick={(event) => {
                    const mark = link.href.indexOf("#");
                    if (mark !== -1) {
                      setHash(link.href.slice(mark));
                      return;
                    }
                    // Same page without a section: leave the section and return to the top tab.
                    if (link.href === pathname && window.location.hash) {
                      event.preventDefault();
                      history.pushState(null, "", pathname);
                      setHash("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
                  {english ? link.labelEn : link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** Bar of the AI agents pages (/agents-ia, /agents-ia/<id>). */
export function AgentsSubnav({ active = "tous" }: { active?: (typeof AGENT_LINKS)[number]["id"] }) {
  return <Subnav label="Agents IA" links={AGENT_LINKS} active={active} />;
}

const MARKETING_LINKS = [
  { id: "marketing", href: "/marketing", label: "Notre marketing" },
  { id: "tous", href: "/marketing#tous", label: "Tous les services" },
  { id: "categories", href: "/marketing#categories", label: "Catégories" },
  { id: "realisations", href: "/marketing/realisations", label: "Réalisations" },
  { id: "devis", href: "/marketing#devis", label: "Devis" },
  { id: "faq", href: "/marketing#faq", label: "FAQ" },
] as const;

/** Bar of the marketing pages, under the same site header as Agents IA and Digital. */
export function MarketingSubnav({
  active = "marketing",
}: {
  active?: (typeof MARKETING_LINKS)[number]["id"];
}) {
  return <Subnav label="Marketing" links={MARKETING_LINKS} active={active} />;
}
