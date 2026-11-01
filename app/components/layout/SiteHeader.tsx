"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { agents } from "@/config/agents";
import { Icon } from "@/components/ui/Icon";
import { nativeTranslate, textLang, useLang } from "@/components/ui/LangSwitch";

const DESKTOP = "(min-width: 981px)";

/** French is the source; English is written out so it stays "Digital marketing". */
const MARKETING_LABEL = { fr: "Marketing Digital", en: "Digital marketing" };

/** "Tarifs" dropdown: Agents IA prices and the Marketing packages (moved here from the marketing menu). */
const PRICING_LINKS = [
  { href: "/agents-ia/tarifs.html", label: "Forfaits IA" },
  { href: "/marketing/forfaits.html", label: "Forfaits Marketing" },
];

type Menu = "agents" | "tarifs";

type Props = {
  active?: "home" | "marketing" | "tarifs" | "none";
  signedIn?: boolean;
};

/** Main site header (home, agents IA). Mirrors initNav() from the static main.js. */
export function SiteHeader({ active = "home", signedIn = false }: Props) {
  const [lang] = useLang();
  const marketingLabel = MARKETING_LABEL[textLang(lang)];
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<Menu | null>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.(".has-dropdown") || !navRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const isDesktop = () => window.matchMedia(DESKTOP).matches;
  const closeAll = () => {
    setOpenMenu(null);
    setMenuOpen(false);
  };
  const toggle = (menu: Menu) => setOpenMenu((current) => (current === menu ? null : menu));

  /** Hover on desktop, click everywhere, Escape closes — as initNav() in main.js. */
  const dropdown = (menu: Menu) => ({
    className: `has-dropdown${openMenu === menu ? " open" : ""}`,
    onMouseEnter: () => {
      if (!isDesktop()) return;
      clearTimeout(closeTimer.current);
      setOpenMenu(menu);
    },
    onMouseLeave: () => {
      if (isDesktop()) closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
    },
    onKeyDown: (e: React.KeyboardEvent) => e.key === "Escape" && setOpenMenu(null),
  });

  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="logo notranslate" aria-label="AK Universe — accueil">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
          <img src="/assets/img/logo.svg" alt="" />
        </Link>
        <button
          className="burger"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <div className={`nav-menu${menuOpen ? " open" : ""}`}>
          <ul className="nav-links" ref={navRef}>
            <li>
              <Link href="/" className={`nav-link${active === "home" ? " active" : ""}`} onClick={closeAll}>
                Accueil
              </Link>
            </li>
            <li {...dropdown("agents")}>
              <button
                className="nav-link"
                aria-expanded={openMenu === "agents"}
                aria-haspopup="true"
                onClick={() => toggle("agents")}
              >
                Agents IA <Icon name="chev-down" className="chev" />
              </button>
              <div className="dropdown mega">
                <button
                  type="button"
                  className="mega-close"
                  aria-label="Fermer le menu Agents IA"
                  onClick={() => setOpenMenu(null)}
                >
                  <Icon name="close" />
                </button>
                <div className="mega-scroll">
                  {agents.map((agent) => (
                    <Link key={agent.id} href="/#agents" className="mega-item" onClick={closeAll}>
                      <span className={`avatar ph ph-m11 ph-av ph-av-${agent.id}`} />
                      <span className="icon-box">
                        <Icon name={agent.icon} />
                      </span>
                      <span>
                        <strong>{agent.name}</strong>
                        <small>{agent.menu}</small>
                      </span>
                      <span className="round-arrow">
                        <Icon name="arrow" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </li>
            <li>
              <a
                href="/marketing.html"
                className={`nav-link${active === "marketing" ? " active" : ""}${lang === "en" ? " notranslate" : ""}`}
                translate={nativeTranslate(lang)}
              >
                {marketingLabel}
              </a>
            </li>
            <li {...dropdown("tarifs")}>
              <button
                className={`nav-link${active === "tarifs" ? " active" : ""}`}
                aria-expanded={openMenu === "tarifs"}
                aria-haspopup="true"
                onClick={() => toggle("tarifs")}
              >
                Tarifs <Icon name="chev-down" className="chev" />
              </button>
              <div className="dropdown tarifs-dd">
                <ul className="dropdown-list">
                  {PRICING_LINKS.map((link) => (
                    <li key={link.href}>
                      <a href={link.href} onClick={closeAll}>
                        {link.label} <Icon name="chev-right" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
            <li>
              <Link href="/" className="nav-link" onClick={closeAll}>
                À propos
              </Link>
            </li>
            <li>
              <a href="/informations.html" className="nav-link" onClick={closeAll}>
                Contact
              </a>
            </li>
          </ul>
          <div className="nav-actions">
            {signedIn ? (
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn btn-outline">
                  Se déconnecter
                </button>
              </form>
            ) : (
              <Link href="/connexion.html" className="btn btn-outline">
                Se connecter
              </Link>
            )}
            {signedIn ? (
              <Link href="/compte.html" className="btn btn-primary">
                Mon compte <Icon name="arrow" />
              </Link>
            ) : (
              <Link href="/inscription.html" className="btn btn-primary">
                Essayer gratuitement <Icon name="arrow" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
