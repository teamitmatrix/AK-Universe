import Link from "next/link";
import { LogOut } from "lucide-react";
import { initialsOf } from "@/components/admin/space/initials";
import { NotificationBell } from "@/components/commercial/NotificationBell";
import { getMyNotifications, markNotificationsRead } from "@/lib/client/actions";
import type { ClientMe } from "@/lib/client/session";
import { ClientNav } from "./ClientNav";
import { ClientShell } from "./ClientShell";
import { ClientUserMenu } from "./ClientUserMenu";
import { Swoosh } from "./Swoosh";

/** Sidebar + header around every Client space page (approved "Espace client" mockup). */
export function ClientFrame({ me, children }: { me: ClientMe; children: React.ReactNode }) {
  return (
    <ClientShell
      sidebar={
        <>
          <Link href="/dashboard" className="cs-brand notranslate" aria-label="AK Universe — Accueil de l'espace client">
            AK<span className="cs-brand-dot" aria-hidden="true" />
            Universe
          </Link>
          <ClientNav />
          <form action="/auth/signout" method="post" className="cs-logout">
            <input type="hidden" name="redirectTo" value="/connexion" />
            <button type="submit">
              <LogOut size={20} strokeWidth={1.8} aria-hidden="true" />
              Se déconnecter
            </button>
          </form>
          <Swoosh className="cs-side-swoosh" id="cs-side" />
        </>
      }
      header={
        <div className="cs-head-tools">
          <NotificationBell userId={me.id} load={getMyNotifications} markReadAction={markNotificationsRead} />
          <span className="cs-head-sep" aria-hidden="true" />
          <ClientUserMenu name={me.name} initials={initialsOf(me.name) || "?"} />
        </div>
      }
    >
      {children}
    </ClientShell>
  );
}
