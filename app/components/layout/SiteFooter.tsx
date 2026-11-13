"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";

const EXPERTISES = [
  { href: "/agents-ia", label: "Agents IA" },
  { href: "/marketing", label: "Marketing" },
  { href: "/digital", label: "Digital" },
] as const;

const ABOUT = [
  { href: "/agents-ia#tarifs", label: "Tarifs" },
  { href: "/connexion", label: "Se connecter" },
  { href: "/contact", label: "Contact" },
] as const;

/** Client component: also used inside the video shell. */
export function SiteFooter() {
  const t = useT();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <Link href="/" className="footer-brand" aria-label={t("AK Universe — accueil")}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
          <img src="/assets/img/logo.svg" alt="" />
          <span className="footer-brand-copy">
            <span className="footer-brand-name">
              <span className="ak">AK</span> UNIVERSE
            </span>
            <span className="footer-tagline">{t("L'intelligence au service de votre ambition.")}</span>
          </span>
        </Link>

        <div className="footer-cols" aria-label={t("Pied de page")}>
          <nav className="footer-col" aria-label={t("Expertises")}>
            <p className="footer-col-title">{t("Expertises")}</p>
            {EXPERTISES.map((link) => (
              <Link key={link.href} href={link.href}>
                {t(link.label)}
              </Link>
            ))}
          </nav>
          <nav className="footer-col" aria-label={t("À propos")}>
            <p className="footer-col-title">{t("À propos")}</p>
            {ABOUT.map((link) => (
              <Link key={link.href} href={link.href}>
                {t(link.label)}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span className="footer-copy">© {year} AK Universe</span>
          <nav className="footer-legal" aria-label={t("Informations légales")}>
            <Link href="/mentions-legales">{t("Mentions légales")}</Link>
            <Link href="/confidentialite">{t("Confidentialité")}</Link>
            <Link href="/cgv">{t("CGV")}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
