"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Clapperboard, Euro, Film, FolderOpen, LayoutDashboard, MessageSquare, User, type LucideIcon } from "lucide-react";
import { VIDEASTE_NAV, type VideasteNavId } from "@/lib/videaste/nav";

const ICONS: Record<VideasteNavId, LucideIcon> = {
  dashboard: LayoutDashboard,
  projets: Film,
  aMonter: Clapperboard,
  retours: MessageSquare,
  fichiers: FolderOpen,
  tarifs: Euro,
  agenda: CalendarDays,
  profil: User,
};

/** Sidebar menu of the Videographer space. Pages not built yet are shown disabled, never as links to a 404. */
export function VideasteNav() {
  const pathname = usePathname();
  return (
    <nav className="adm-nav" aria-label="Menu de l'espace vidéaste">
      {VIDEASTE_NAV.map(({ id, label, href, ready }) => {
        const Icon = ICONS[id];
        if (!ready) {
          return (
            <span key={id} className="com-nav-soon" aria-disabled="true">
              <Icon size={17} aria-hidden="true" />
              {label}
              <small>Bientôt</small>
            </span>
          );
        }
        // A project page belongs to "Mes projets".
        const active = pathname === href || (id === "projets" && pathname.startsWith("/videaste/projet"));
        return (
          <Link key={id} href={href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon size={17} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
