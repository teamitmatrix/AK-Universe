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
          <Link href="/agents-ia">Agents IA</Link>
          <a href="/marketing">Marketing</a>
          <Link href="/digital">Digital</Link>
          <Link href="/agents-ia/tarifs">Tarifs</Link>
          <Link href="/connexion">Se connecter</Link>
        </nav>
        <span>© {new Date().getFullYear()} AK Universe</span>
        <nav className="footer-legal" aria-label="Informations légales">
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/confidentialite">Confidentialité</a>
          <a href="/cgv">CGV</a>
        </nav>
      </div>
    </footer>
  );
}
