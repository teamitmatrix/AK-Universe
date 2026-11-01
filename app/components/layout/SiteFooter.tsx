import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <Link href="/" className="logo notranslate">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
          <img src="/assets/img/logo.svg" alt="" />
          <span>
            <span className="ak">AK</span> UNIVERSE
          </span>
        </Link>
        <nav className="footer-links" aria-label="Liens de pied de page">
          <Link href="/#agents">Agents IA</Link>
          <a href="/marketing.html">Marketing</a>
          <a href="/agents-ia/tarifs.html">Tarifs</a>
          <Link href="/connexion.html">Se connecter</Link>
        </nav>
        <span>© {new Date().getFullYear()} AK Universe</span>
        <nav className="footer-legal" aria-label="Informations légales">
          <a href="/mentions-legales.html">Mentions légales</a>
          <a href="/confidentialite.html">Confidentialité</a>
          <a href="/cgv.html">CGV</a>
        </nav>
      </div>
    </footer>
  );
}
