"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { NAV_MENUS, type NavMenu } from "@/config/navigation";

const DESKTOP = "(min-width: 981px)";

type Menu = NavMenu["id"];

type Props = {
  active?: "home" | "about" | "contact" | Menu | "none";
  signedIn?: boolean;
};

/** Main site header (home, agents IA, digital). Mirrors initNav() from the static main.js. */
export function SiteHeader({ active = "home", signedIn = false }: Props) {
  const pathname = usePathname();
  const t = useT();
  const onProject =
    pathname === "/projet" || pathname.startsWith("/projet/") || pathname === "/finaliser";
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<Menu | null>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        !(e.target as Element).closest?.(".has-dropdown") ||
        !navRef.current?.contains(e.target as Node)
      )
        setOpenMenu(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const isDesktop = () => window.matchMedia(DESKTOP).matches;
  const closeAll = () => {
    setOpenMenu(null);
    setMenuOpen(false);
  };
  const toggle = (menu: Menu) =>
    setOpenMenu((current) => (current === menu ? null : menu));

  /** Hover on desktop, click everywhere, Escape closes — as initNav() in main.js. */
  const dropdown = (menu: Menu) => ({
    className: `has-dropdown${openMenu === menu ? " open" : ""}`,
    onMouseEnter: () => {
      if (!isDesktop()) return;
      clearTimeout(closeTimer.current);
      setOpenMenu(menu);
    },
    onMouseLeave: () => {
      if (isDesktop())
        closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
    },
    onKeyDown: (e: React.KeyboardEvent) =>
      e.key === "Escape" && setOpenMenu(null),
  });

  return (
    <header className="site-header">
      <div className="container nav">
        <Link
          href="/"
          className="logo notranslate"
          translate="no"
          aria-label={t("AK Universe — accueil")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
          <img src="/assets/img/logo.svg" alt="" />
        </Link>
        <button
          className="burger"
          aria-label={menuOpen ? t("Fermer le menu") : t("Ouvrir le menu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <div className={`nav-menu${menuOpen ? " open" : ""}`}>
          <ul className="nav-links" ref={navRef}>
            <li>
              <Link
                href="/"
                className={`nav-link${active === "home" ? " active" : ""}`}
                onClick={closeAll}
              >
                {t("Accueil")}
              </Link>
            </li>
            {NAV_MENUS.map((menu) => (
              <li key={menu.id} {...dropdown(menu.id)}>
                {/* The label opens the section page; the chevron opens the menu (on mobile there is no hover). */}
                <Link
                  href={menu.href}
                  className={`nav-link${active === menu.id ? " active" : ""}`}
                    onClick={closeAll}
                >
                  {t(menu.label)}
                </Link>
                <button
                  type="button"
                  className="nav-chev"
                  aria-label={t("Sous-menu {name}", { name: t(menu.label) })}
                  aria-expanded={openMenu === menu.id}
                  aria-haspopup="true"
                  onClick={() => toggle(menu.id)}
                >
                  <Icon name="chev-down" className="chev" />
                </button>
                <div className="dropdown nav-dd">
                  <ul className="dropdown-list">
                    {menu.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={
                            pathname === link.href ? "current" : undefined
                          }
                          aria-current={
                            pathname === link.href ? "page" : undefined
                          }
                          onClick={closeAll}
                        >
                          <span>
                            <strong>{t(link.label)}</strong>
                            <small>{t(link.text)}</small>
                          </span>
                          <Icon name="chev-right" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
            <li>
              <Link
                href="/a-propos"
                className={`nav-link${active === "about" ? " active" : ""}`}
                onClick={closeAll}
              >
                {t("À propos")}
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className={`nav-link${active === "contact" ? " active" : ""}`}
                onClick={closeAll}
              >
                {t("Contact")}
              </Link>
            </li>
            <li>
              <Link
                href="/projet"
                className={`nav-link${onProject ? " active" : ""}`}
                onClick={closeAll}
              >
                {t("Mes projets")}
              </Link>
            </li>
          </ul>
          <div className="nav-actions">
            {signedIn ? (
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-outline">
                  {t("Se déconnecter")}
                </button>
              </form>
            ) : (
              <Link href="/connexion" className="btn btn-outline">
                {t("Se connecter")}
              </Link>
            )}
            {signedIn ? (
              <Link href="/compte" className="btn btn-primary">
                {t("Mon compte")} <Icon name="arrow" />
              </Link>
            ) : (
              <Link href="/inscription" className="btn btn-primary">
                {t("Essayer gratuitement")} <Icon name="arrow" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
