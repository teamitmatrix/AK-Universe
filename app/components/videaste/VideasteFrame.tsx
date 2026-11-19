import Image from "next/image";
import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { initialsOf } from "@/components/admin/space/initials";
import { AdminLangSwitch } from "@/components/admin/space/AdminLangSwitch";
import { NotificationBell } from "@/components/commercial/NotificationBell";
import type { TextLang } from "@/config/languages";
import { getMyNotifications, markNotificationsRead } from "@/lib/videaste/actions";
import { VideasteNav } from "./VideasteNav";

/**
 * Sidebar + header around every Videographer page. Same building blocks and black & gold theme as the Commercial
 * space (.adm + .adm-com), with .vid-* additions in videaste.css — one site, one look, one more role.
 */
export function VideasteFrame({
  lang,
  me,
  children,
}: {
  lang: TextLang;
  me: { id: string; name: string; email: string };
  children: React.ReactNode;
}) {
  return (
    <div className="adm adm-com adm-vid">
      <aside className="adm-side">
        <Link href="/videaste/dashboard" className="adm-brand">
          <Image src="/assets/img/logo.svg" alt="" width={28} height={28} />
          <span>
            <strong>AK UNIVERSE</strong>
            <small>Espace vidéaste</small>
          </span>
        </Link>
        <VideasteNav />
        <div className="adm-me">
          <span className="adm-avatar" aria-hidden="true">
            {initialsOf(me.name)}
          </span>
          <span>
            <strong>{me.name}</strong>
            <small>{me.email}</small>
            <em>Vidéaste</em>
          </span>
        </div>
        <form action="/auth/signout" method="post">
          <input type="hidden" name="redirectTo" value="/connexion" />
          <button type="submit" className="com-logout">
            <LogOut size={16} aria-hidden="true" />
            Déconnexion
          </button>
        </form>
      </aside>
      <div className="adm-main">
        <header className="adm-head com-head">
          <div className="adm-head-tools com-head-tools">
            {/* Searches the videographer's own projects only (the results page is scoped on the server). */}
            <form className="com-search" action="/videaste/mes-projets" role="search">
              <label className="adm-search">
                <Search size={15} aria-hidden="true" />
                <input type="search" name="q" placeholder="Rechercher un projet, un client…" aria-label="Rechercher un projet ou un client" maxLength={80} />
              </label>
            </form>
            <NotificationBell userId={me.id} load={getMyNotifications} markReadAction={markNotificationsRead} />
            <AdminLangSwitch initialLang={lang} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
