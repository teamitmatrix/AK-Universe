"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { clearCart, readLast } from "./cart";
import { useMounted } from "./flow";

const NEXT = [
  "Analyse de votre projet",
  "Proposition d'un devis personnalisé",
  "Échange pour valider les détails",
  "Organisation du tournage",
  "Création et livraison des vidéos",
];

export function ConfirmationView() {
  const mounted = useMounted();
  const paid = useSearchParams().get("paid") === "1";
  const request = mounted ? readLast() : null;

  useEffect(() => {
    const saved = readLast();
    const isPaid = new URLSearchParams(window.location.search).get("paid") === "1";
    if (saved && (saved.type !== "acompte" || isPaid)) clearCart();
  }, []);

  return (
    <main className="flow stars" style={{ position: "relative" }}>
      <div className="container">
        {!mounted ? null : (
          <div className="confirm">
            <span className="confirm-ic">
              <Icon name="check" />
            </span>
            <h1>Votre projet est bien enregistré !</h1>
            <p>
              Nous vous remercions pour votre confiance.
              {request?.client?.email ? (
                <>
                  <br />
                  Un e-mail récapitulatif va être envoyé à <strong>{request.client.email}</strong>.
                </>
              ) : null}
            </p>
            {request && (
              <div className="confirm-ref">
                <span>
                  Référence <strong>{request.ref}</strong>
                </span>
                <span>
                  {request.type === "acompte" ? (
                    paid ? (
                      <>
                        Acompte réglé : <strong>{euro(request.acompte)} HT</strong>
                      </>
                    ) : (
                      <>
                        Acompte en attente : <strong>{euro(request.acompte)} HT</strong>
                      </>
                    )
                  ) : (
                    "Demande de devis"
                  )}
                </span>
                <span>
                  Estimation : <strong>{euro(request.total)} HT</strong>
                </span>
              </div>
            )}
            <div className="next-steps">
              <h2>
                <Icon name="calendar-o" /> Prochaines étapes
              </h2>
              <ol>
                {NEXT.map((step, index) => (
                  <li key={step}>
                    <span className="n">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <Link href="/marketing" className="btn btn-primary btn-lg">
              Retour à l&apos;accueil
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
