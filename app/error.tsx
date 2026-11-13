"use client";

import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <main className="section stars" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div className="container">
        <h1 className="section-title">{t.rich("Une erreur est <gold>survenue</gold>")}</h1>
        <p className="section-sub">{t("Veuillez réessayer dans un instant.")}</p>
        <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 24 }} onClick={reset}>
          {t("Réessayer")} <Icon name="refresh" />
        </button>
      </div>
    </main>
  );
}
