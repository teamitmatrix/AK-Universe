"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useCart } from "./cart";
import { useVideo } from "./context";

const DESKTOP = "(min-width: 981px)";

export type VideoNav = "" | "services" | "realisations" | "projet";

/** Marketing / video header. Same links as renderHeader() in the static projet.js. */
export function VideoHeader({ active = "", currentSlug }: { active?: VideoNav; currentSlug?: string }) {
  const { config } = useVideo();
  const cart = useCart(config);
  const count = cart.items.length;
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const navRef = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target as Element).closest?.(".has-dropdown") || !navRef.current?.contains(event.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const isDesktop = () => window.matchMedia(DESKTOP).matches;
  const closeAll = () => {
    setServicesOpen(false);
    setMenuOpen(false);
  };

  return (
    <header className="site-header">
      <div className="container nav nav-video">
        <Link href="/" className="logo notranslate" aria-label="AK Universe — retour à l'accueil">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
          <img src="/assets/img/logo.svg" alt="" />
          <span>
            <span className="ak">AK</span> UNIVERSE
          </span>
        </Link>
        <Link href="/projet" className="projet-link projet-link-mobile" aria-label="Mon projet" title="Mon projet">
          <Icon name="clapper" />
          <span className="projet-badge" hidden={count === 0}>
            {count}
          </span>
        </Link>
        <button
          type="button"
          className="burger"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
        <div className={`nav-menu${menuOpen ? " open" : ""}`}>
          <ul className="nav-links" ref={navRef}>
            <li>
              <Link href="/" className="nav-link" onClick={closeAll}>
                Accueil
              </Link>
            </li>
            <li
              className={`has-dropdown${servicesOpen ? " open" : ""}`}
              onMouseEnter={() => {
                if (!isDesktop()) return;
                clearTimeout(closeTimer.current);
                setServicesOpen(true);
              }}
              onMouseLeave={() => {
                if (isDesktop()) closeTimer.current = setTimeout(() => setServicesOpen(false), 120);
              }}
              onKeyDown={(event) => event.key === "Escape" && setServicesOpen(false)}
            >
              <button
                type="button"
                className={`nav-link${active === "services" ? " active" : ""}`}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
                onClick={() => setServicesOpen((open) => !open)}
              >
                Services <Icon name="chev-down" className="chev" />
              </button>
              <div className="dropdown services-dd">
                <ul className="dropdown-list">
                  {config.services.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/services/${service.slug}`}
                        className={service.slug === currentSlug ? "current" : undefined}
                        aria-current={service.slug === currentSlug ? "page" : undefined}
                        onClick={closeAll}
                      >
                        {service.name} <Icon name="chev-right" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/services" className="dd-all" onClick={closeAll}>
                  Voir tous les services <Icon name="arrow" />
                </Link>
              </div>
            </li>
            <li>
              <Link
                href="/services#realisations"
                className={`nav-link${active === "realisations" ? " active" : ""}`}
                onClick={closeAll}
              >
                Réalisation
              </Link>
            </li>
          </ul>
          <div className="nav-actions">
            <Link href="/projet" className={`projet-link${active === "projet" ? " active" : ""}`} onClick={closeAll}>
              <Icon name="clapper" />
              <span className="projet-count-label">Mon projet</span>
              <span className="projet-badge" hidden={count === 0}>
                {count}
              </span>
            </Link>
            <Link href="/services" className="btn btn-primary" onClick={closeAll}>
              Devis gratuit <Icon name="arrow" />
            </Link>
            <a href="#" className="social" aria-label="LinkedIn">
              <Icon name="linkedin" />
            </a>
            <a href="#" className="social" aria-label="Instagram">
              <Icon name="instagram" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
