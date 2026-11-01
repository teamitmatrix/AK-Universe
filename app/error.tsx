"use client";

import { Icon } from "@/components/ui/Icon";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="section stars" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div className="container">
        <h1 className="section-title">
          Une erreur est <span className="gold">survenue</span>
        </h1>
        <p className="section-sub">Veuillez réessayer dans un instant.</p>
        <button type="button" className="btn btn-primary btn-lg" style={{ marginTop: 24 }} onClick={reset}>
          Réessayer <Icon name="refresh" />
        </button>
      </div>
    </main>
  );
}
