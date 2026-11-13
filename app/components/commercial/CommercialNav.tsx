"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Euro, FileText, FolderOpen, Layers, LayoutDashboard, Tag, User, Users, type LucideIcon } from "lucide-react";
import { useLang } from "@/components/ui/LangSwitch";
import { COMMERCIAL_NAV, type CommercialNavId } from "@/lib/commercial/nav";
import { comTextFor } from "./comText";

const ICONS: Record<CommercialNavId, LucideIcon> = {
  dashboard: LayoutDashboard,
  prospects: Layers,
  ventes: Tag,
  devisFactures: FileText,
  commissions: Euro,
  clients: Users,
  agenda: Calendar,
  documents: FolderOpen,
  profil: User,
};

/** Sidebar menu of the Commercial space. Pages not built yet are shown disabled, never as links to a 404. */
export function CommercialNav() {
  const pathname = usePathname();
  const [lang] = useLang();
  const t = comTextFor(lang);
  return (
    <nav className="adm-nav" aria-label={t.nav.menu}>
      {COMMERCIAL_NAV.map(({ id, href, ready }) => {
        const Icon = ICONS[id];
        if (!ready) {
          return (
            <span key={id} className="com-nav-soon" aria-disabled="true">
              <Icon size={17} aria-hidden="true" />
              {t.nav[id]}
              <small>{t.soon}</small>
            </span>
          );
        }
        const active = pathname === href;
        return (
          <Link key={id} href={href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon size={17} aria-hidden="true" />
            {t.nav[id]}
          </Link>
        );
      })}
    </nav>
  );
}
