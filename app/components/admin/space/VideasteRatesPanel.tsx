"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, CircleDashed, Euro, Plus, Send, Trash2 } from "lucide-react";
import { sendVideasteRateCard } from "@/lib/admin/videaste-actions";
import type { RateCard } from "@/lib/videaste/rates";

type DraftItem = { key: string; label: string; description: string; amount: string };

const money = (cents: number) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const emptyItem = (): DraftItem => ({ key: `${Date.now()}-${Math.random()}`, label: "", description: "", amount: "" });

const ERRORS: Record<string, string> = {
  forbidden: "Action non autorisée.",
  invalid: "Vérifiez le titre et au moins un tarif valide (libellé + montant).",
  notFound: "Vidéaste introuvable.",
  notReady: "Les tarifs seront disponibles après la migration 026.",
  failed: "Envoi impossible. Réessayez.",
};

/** Admin: propose a rate card to a videographer and track Pending / Confirmed per line. */
export function VideasteRatesPanel({ videasteId, cards, ready }: { videasteId: string; cards: RateCard[]; ready: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("Grille tarifaire");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await sendVideasteRateCard(videasteId, {
        title,
        notes,
        items: items.map((it) => ({ label: it.label, description: it.description, amountEuros: it.amount })),
      });
      if (!res.success) return setError(ERRORS[res.error] ?? ERRORS.failed);
      setTitle("Grille tarifaire");
      setNotes("");
      setItems([emptyItem()]);
      router.refresh();
    });
  }

  return (
    <section className="adm-card" aria-labelledby="adm-vid-rates">
      <header className="adm-card-head">
        <h2 id="adm-vid-rates">
          <Euro size={17} aria-hidden="true" /> Tarifs
        </h2>
      </header>

      {!ready ? (
        <p className="adm-note">Les tarifs seront disponibles après l&apos;application de la migration 026.</p>
      ) : (
        <>
          <form className="vid-rate-form" onSubmit={submit}>
            <p className="adm-muted adm-small">Proposez une grille. Le vidéaste confirme chaque prix individuellement.</p>
            <label className="adm-field">
              <span>Titre</span>
              <input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="adm-field">
              <span>Notes (optionnel)</span>
              <textarea maxLength={2000} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <ul className="vid-rate-drafts">
              {items.map((it, i) => (
                <li key={it.key}>
                  <label className="adm-field">
                    <span>Libellé {i + 1}</span>
                    <input required maxLength={160} placeholder="Tournage demi-journée" value={it.label} onChange={(e) => updateItem(it.key, { label: e.target.value })} />
                  </label>
                  <label className="adm-field">
                    <span>Montant (€)</span>
                    <input required inputMode="decimal" placeholder="450" value={it.amount} onChange={(e) => updateItem(it.key, { amount: e.target.value })} />
                  </label>
                  <label className="adm-field is-wide">
                    <span>Description (optionnel)</span>
                    <input maxLength={1000} value={it.description} onChange={(e) => updateItem(it.key, { description: e.target.value })} />
                  </label>
                  {items.length > 1 && (
                    <button type="button" className="adm-icon-btn" aria-label="Retirer cette ligne" onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="adm-row-actions">
              <button type="button" className="adm-btn is-ghost sm" onClick={() => setItems((list) => [...list, emptyItem()])}>
                <Plus size={14} aria-hidden="true" /> Ajouter un tarif
              </button>
              <button type="submit" className="adm-btn sm" disabled={pending}>
                <Send size={14} aria-hidden="true" /> {pending ? "Envoi…" : "Envoyer au vidéaste"}
              </button>
            </div>
            {error && (
              <p className="adm-error" role="alert">
                {error}
              </p>
            )}
          </form>

          {cards.length === 0 ? (
            <p className="adm-empty">Aucune grille envoyée pour le moment.</p>
          ) : (
            <ul className="vid-rate-cards">
              {cards.map((card) => (
                <li key={card.id} className="vid-rate-card">
                  <header>
                    <div>
                      <strong>{card.title}</strong>
                      <span className="adm-muted adm-small">
                        {new Date(card.createdAt).toLocaleDateString("fr-FR")} · {card.confirmedCount}/{card.items.length} confirmé
                        {card.items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                  </header>
                  {card.notes ? <p className="adm-muted adm-small">{card.notes}</p> : null}
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
                          </span>
                        ) : (
                          <span className="adm-badge is-warn">
                            <CircleDashed size={12} aria-hidden="true" /> En attente de confirmation
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
