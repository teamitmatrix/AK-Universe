"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Headphones, House, Layers, Puzzle, User, type LucideIcon } from "lucide-react";
import { CLIENT_NAV, type ClientNavId } from "@/lib/client/nav";

const ICONS: Record<ClientNavId, LucideIcon> = {
  accueil: House,
  offre: Layers,
  facturation: CreditCard,
  options: Puzzle,
  compte: User,
  support: Headphones,
};

/** Sidebar menu of the Client space. Pages not built yet are shown disabled, never as links to a 404. */
export function ClientNav() {
  const pathname = usePathname();
  return (
    <nav className="cs-nav" aria-label="Menu de l'espace client">
      {CLIENT_NAV.map(({ id, label, href, ready }) => {
        const Icon = ICONS[id];
        if (!ready) {
          return (
            <span key={id} className="cs-nav-soon" aria-disabled="true" title="Bientôt disponible">
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              {label}
              <small>Bientôt</small>
            </span>
          );
        }
        const active = id === "accueil" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={id} href={href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
