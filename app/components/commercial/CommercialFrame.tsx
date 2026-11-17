import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { initialsOf } from "@/components/admin/space/initials";
import type { TextLang } from "@/config/languages";
import { AdminLangSwitch } from "@/components/admin/space/AdminLangSwitch";
import { CommercialNav } from "./CommercialNav";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { comTextFor } from "./comText";

/** Sidebar + header (global search, notification center) around every Commercial page. */
export function CommercialFrame({ lang, me, children }: { lang: TextLang; me: { id: string; name: string; email: string }; children: React.ReactNode }) {
  const t = comTextFor(lang);
  return (
    <div className="adm adm-com">
      <aside className="adm-side">
        <Link href="/commercial/dashboard" className="adm-brand">
          <Image src="/assets/img/logo.svg" alt="" width={28} height={28} />
          <span>
            <strong>AK UNIVERSE</strong>
            <small>{t.brand}</small>
          </span>
        </Link>
        <CommercialNav />
        <div className="adm-me">
          <span className="adm-avatar" aria-hidden="true">
            {initialsOf(me.name)}
          </span>
          <span>
            <strong>{me.name}</strong>
            <small>{me.email}</small>
            <em>{t.role}</em>
          </span>
        </div>
        <form action="/auth/signout" method="post">
          <input type="hidden" name="redirectTo" value="/connexion" />
          <button type="submit" className="com-logout">
            <LogOut size={16} aria-hidden="true" />
            {t.logout}
          </button>
        </form>
      </aside>
      <div className="adm-main">
        <header className="adm-head com-head">
          <div className="adm-head-tools com-head-tools">
            <GlobalSearch />
            <NotificationBell userId={me.id} />
            <AdminLangSwitch initialLang={lang} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
