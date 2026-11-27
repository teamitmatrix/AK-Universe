"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, Euro } from "lucide-react";
import { confirmMyRateItem } from "@/lib/videaste/rate-actions";
import type { RateCard } from "@/lib/videaste/rates";

const money = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const ERRORS: Record<string, string> = {
  forbidden: "Action non autorisée.",
  invalid: "Tarif invalide.",
  notFound: "Tarif introuvable ou déjà confirmé.",
  notReady: "Les tarifs seront disponibles après la migration 026.",
  failed: "Confirmation impossible. Réessayez.",
};

/** Videographer: review proposed rates and confirm each price individually. */
export function RatesView({ cards }: { cards: RateCard[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm(id: string) {
    setError(null);
    setPendingId(id);
    start(async () => {
      const res = await confirmMyRateItem(id);
      setPendingId(null);
      if (!res.success) return setError(ERRORS[res.error] ?? ERRORS.failed);
      router.refresh();
    });
  }

  if (cards.length === 0) {
    return <p className="adm-empty vid-empty-card">Aucune grille tarifaire reçue pour le moment.</p>;
  }

  return (
    <>
      {error && (
        <p className="adm-error" role="alert">
          {error}
        </p>
      )}
      <ul className="vid-rate-cards">
        {cards.map((card) => (
          <li key={card.id} className="adm-card vid-rate-card">
            <header className="adm-card-head">
              <h2>
                <Euro size={17} aria-hidden="true" /> {card.title}
              </h2>
              <span className="adm-muted adm-small">
                Reçue le {new Date(card.createdAt).toLocaleDateString("fr-FR")} · {card.pendingCount} en attente
              </span>
            </header>
            {card.notes ? <p className="adm-muted">{card.notes}</p> : null}
            <ul className="vid-rate-items">
              {card.items.map((item) => (
                <li key={item.id}>
                  <span className="adm-stack">
                    <strong>{item.label}</strong>
                    {item.description ? <span className="adm-muted adm-small">{item.description}</span> : null}
                  </span>
                  <span className="vid-rate-amount">{money(item.amountCents)}</span>
                  {item.status === "confirmed" ? (
                    <span className="adm-badge is-ok">
                      <CheckCircle2 size={12} aria-hidden="true" /> Confirmé
                      {item.confirmedAt ? ` · ${new Date(item.confirmedAt).toLocaleDateString("fr-FR")}` : ""}
                    </span>
                  ) : (
                    <>
                      <span className="adm-badge is-warn">
                        <CircleDashed size={12} aria-hidden="true" /> En attente de confirmation
                      </span>
                      <button type="button" className="adm-btn sm" disabled={pending && pendingId === item.id} onClick={() => confirm(item.id)}>
                        {pending && pendingId === item.id ? "…" : "Confirmer ce prix"}
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
