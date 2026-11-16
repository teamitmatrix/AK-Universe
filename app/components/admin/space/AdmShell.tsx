import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  Clapperboard,
  ExternalLink,
  FileText,
  Euro,
  Film,
  FolderOpen,
  LayoutDashboard,
  Percent,
  Search,
  Settings,
  ShoppingCart,
  Tag,
  Tags,
  UserPlus,
  Video,
} from "lucide-react";
import { AdminLangSwitch } from "@/components/admin/space/AdminLangSwitch";
import { getAdminLang } from "@/i18n/server";
import { loadTaskOptions } from "@/lib/admin/agenda";
import { CreateMenu } from "./ToolsClient";
import { toolsTextFor } from "./toolsText";
import type { DashText } from "./dashText";
import { initialsOf } from "./initials";
import "@/styles/admin.css";

type NavId =
  | "dashboard"
  | "commerciaux"
  | "videastes"
  | "prospects"
  | "clients"
  | "ventes"
  | "devisFactures"
  | "commissions"
  | "demandes"
  | "catalogue"
  | "prixVideo"
  | "projets"
  | "promotions"
  | "documents"
  | "agenda"
  | "rapports"
  | "parametres"
  | "chatbot";

/** Links only to admin screens that exist; the older tabs at /admin are reused, not rebuilt. */
const NAV: { id: NavId; href: string; Icon: typeof Bot }[] = [
  { id: "dashboard", href: "/admin/dashboard", Icon: LayoutDashboard },
  { id: "commerciaux", href: "/admin/commerciaux", Icon: Briefcase },
  { id: "videastes", href: "/admin/videastes", Icon: Video },
  { id: "prospects", href: "/admin/prospects", Icon: UserPlus },
  { id: "clients", href: "/admin/clients", Icon: Building2 },
  { id: "ventes", href: "/admin/ventes", Icon: ShoppingCart },
  { id: "devisFactures", href: "/admin/devis-factures", Icon: FileText },
  { id: "commissions", href: "/admin/commissions", Icon: Percent },
  { id: "demandes", href: "/admin?vue=demandes", Icon: Clapperboard },
  { id: "projets", href: "/admin/projets-video", Icon: Film },
  { id: "catalogue", href: "/admin/catalogue", Icon: Tags },
  { id: "prixVideo", href: "/admin", Icon: Euro },
  { id: "promotions", href: "/admin/promotions", Icon: Tag },
  { id: "documents", href: "/admin/documents", Icon: FolderOpen },
  { id: "agenda", href: "/admin/agenda", Icon: CalendarDays },
  { id: "rapports", href: "/admin/rapports", Icon: BarChart3 },
  { id: "parametres", href: "/admin/parametres", Icon: Settings },
  { id: "chatbot", href: "/admin?vue=chatbot", Icon: Bot },
];

/**
 * Admin space frame: navy sidebar (top bar on mobile) + white header, scoped under .adm so it never
 * touches the black/gold public site styles.
 */
export async function AdmShell({
  t,
  active,
  admin,
  children,
  query = "",
}: {
  t: DashText;
  active: NavId | null;
  admin: { name: string; email: string };
  children: React.ReactNode;
  /** Current global-search text (search page only). */
  query?: string;
}) {
  const [lang, taskOptions] = await Promise.all([getAdminLang(), loadTaskOptions().catch(() => null)]);
  const tools = toolsTextFor(lang);
  const label = (id: NavId) => (id in tools.nav ? tools.nav[id as keyof typeof tools.nav] : t.nav[id as keyof typeof t.nav]);
  return (
    <div className="adm" translate="no">
      <aside className="adm-side">
        <Link href="/admin/dashboard" className="adm-brand">
          <Image src="/assets/img/logo.svg" alt="" width={28} height={28} />
          <span>
            <strong>AK UNIVERSE</strong>
            <small>{t.brand}</small>
          </span>
        </Link>
        <nav className="adm-nav" aria-label={t.nav.menu}>
          {NAV.map(({ id, href, Icon }) => (
            <Link key={id} href={href} className={active === id ? "is-active" : undefined} aria-current={active === id ? "page" : undefined}>
              <Icon size={17} aria-hidden="true" />
              {label(id)}
            </Link>
          ))}
          <Link href="/">
            <ExternalLink size={17} aria-hidden="true" />
            {t.nav.site}
          </Link>
        </nav>
        <div className="adm-me">
          <span className="adm-avatar" aria-hidden="true">
            {initialsOf(admin.name)}
          </span>
          <span>
            <strong>{admin.name}</strong>
            <small>{admin.email}</small>
            <em>{t.adminRole}</em>
          </span>
        </div>
      </aside>
      <div className="adm-main">
        <header className="adm-head">
          <div>
            <h1>{t.hello(admin.name.split(" ")[0] ?? admin.name)} 👋</h1>
            <p>{t.subtitle}</p>
          </div>
          <div className="adm-head-tools">
            {/* Global search: plain GET form, works on every admin page (handoff requirement). */}
            <form action="/admin/recherche" method="get" role="search" className="adm-search adm-global-search">
              <Search size={15} aria-hidden="true" />
              <input type="search" name="q" defaultValue={query} placeholder={tools.search.placeholder} aria-label={tools.search.label} minLength={2} maxLength={60} />
            </form>
            <CreateMenu options={taskOptions} />
            <AdminLangSwitch initialLang={lang} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
