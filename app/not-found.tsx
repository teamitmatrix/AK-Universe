import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main className="section stars" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div className="container">
        <p className="eyebrow">Erreur 404</p>
        <h1 className="section-title">
          Page <span className="gold">introuvable</span>
        </h1>
        <p className="section-sub">La page que vous cherchez n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
          Retour à l&apos;accueil <Icon name="arrow" />
        </Link>
      </div>
    </main>
  );
}
