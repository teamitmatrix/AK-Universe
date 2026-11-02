import Link from "next/link";

export function VideoFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <Link href="/marketing" className="logo notranslate">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, same markup as the static site */}
          <img src="/assets/img/logo.svg" alt="" />
          <span>
            <span className="ak">AK</span> UNIVERSE
          </span>
        </Link>
        <nav className="footer-links" aria-label="Liens de pied de page">
          <Link href="/services">Services vidéo</Link>
          <Link href="/projet">Mon projet</Link>
          <Link href="/marketing/forfaits">Forfaits</Link>
          <Link href="/">Agents IA</Link>
        </nav>
        <span>© {new Date().getFullYear()} AK Universe</span>
        <nav className="footer-legal" aria-label="Informations légales">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/cgv">CGV</Link>
        </nav>
      </div>
    </footer>
  );
}
