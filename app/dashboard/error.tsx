"use client";

import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useEffect } from "react";

/** Shown when the subscription data cannot be read: never a false "no plan" — a clear retry instead. */
export default function ClientDashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="cs-page">
      <header className="cs-hello">
        <p className="cs-eyebrow">Espace client</p>
      </header>
      <section className="cs-card cs-error" role="alert">
        <CircleAlert size={28} strokeWidth={1.8} aria-hidden="true" />
        <h1 className="cs-card-title">Impossible de charger vos informations</h1>
        <p>Vos données d&apos;abonnement et de facturation sont momentanément indisponibles. Veuillez réessayer dans un instant.</p>
        <div className="cs-error-actions">
          <button type="button" className="cs-act is-primary" onClick={() => retry()}>
            <RefreshCw className="cs-act-icon" size={20} aria-hidden="true" />
            <span>Réessayer</span>
          </button>
          <Link href="/contact" className="cs-btn-outline">
            Contacter le support
          </Link>
        </div>
      </section>
    </main>
  );
}
