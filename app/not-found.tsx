import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="section stars" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div className="container">
        <p className="eyebrow">{t("Erreur 404")}</p>
        <h1 className="section-title">{t.rich("Page <gold>introuvable</gold>")}</h1>
        <p className="section-sub">{t("La page que vous cherchez n'existe pas ou a été déplacée.")}</p>
        <Link href="/" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
          {t("Retour à l'accueil")} <Icon name="arrow" />
        </Link>
      </div>
    </main>
  );
}
