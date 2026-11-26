"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { clearCart, readLast } from "./cart";
import { useMounted } from "./flow";

const NEXT_MARKETING = [
  "Analyse de votre projet",
  "Proposition d'un devis personnalisé",
  "Échange pour valider les détails",
  "Organisation du tournage",
  "Création et livraison des vidéos",
];

const NEXT_AGENTS = [
  "Confirmation de votre paiement Agents IA",
  "Accès à l'espace client",
  "Activation et configuration de votre agent",
  "Onboarding avec notre équipe si besoin",
  "Suivi et support depuis votre espace",
];

export function ConfirmationView() {
  const mounted = useMounted();
  const params = useSearchParams();
  const paid = params.get("paid") === "1";
  const request = mounted ? readLast() : null;
  const universeParam = params.get("universe");
  // Prefer Stripe return URL (?universe=agents) — sessionStorage can be empty after Checkout.
  const isAgents = universeParam === "agents" || request?.universe === "agents";
  const notified = useRef(false);

  useEffect(() => {
    const saved = readLast();
    const isPaid = new URLSearchParams(window.location.search).get("paid") === "1";
    if (saved && (saved.type !== "acompte" || isPaid)) clearCart();
  }, []);

  // Fallback: if the webhook e-mail was missed, ask the server to send the paid confirmation once.
  useEffect(() => {
    if (!paid || notified.current) return;
    const ref = params.get("ref") || request?.ref;
    if (!ref) return;
    notified.current = true;
    void fetch("/api/projects/confirm-mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    }).catch(() => {
      /* best-effort — never block the confirmation page */
    });
  }, [paid, params, request?.ref]);

  const next = isAgents ? NEXT_AGENTS : NEXT_MARKETING;
  const homeHref = isAgents ? "/agents-ia" : "/marketing";
  const homeLabel = isAgents ? "Retour aux agents IA" : "Retour à l'accueil";

  return (
    <main className="flow stars" style={{ position: "relative" }}>
      <div className="container">
        {!mounted ? null : (
          <div className="confirm">
            <span className="confirm-ic">
              <Icon name="check" />
            </span>
            <h1>{isAgents ? "Votre commande Agents IA est enregistrée !" : "Votre projet est bien enregistré !"}</h1>
            <p>
              Nous vous remercions pour votre confiance.
              {request?.client?.email ? (
                <>
                  <br />
                  Un e-mail récapitulatif va être envoyé à <strong>{request.client.email}</strong>.
                </>
              ) : (
                <>
                  <br />
                  Un e-mail récapitulatif vous est envoyé à l&apos;adresse utilisée pour le paiement.
                </>
              )}
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
                        {isAgents ? "Paiement réglé" : "Acompte réglé"} : <strong>{euro(request.acompte)} HT</strong>
                      </>
                    ) : (
                      <>
                        {isAgents ? "Paiement en attente" : "Acompte en attente"} :{" "}
                        <strong>{euro(request.acompte)} HT</strong>
                      </>
                    )
                  ) : (
                    "Demande de devis"
                  )}
                </span>
                <span>
                  Estimation : <strong>{euro(request.total)} HT</strong>
                </span>
                {request.type === "acompte" && typeof request.earlyStartAccepted === "boolean" ? (
                  <span>
                    Démarrage anticipé :{" "}
                    <strong>{request.earlyStartAccepted ? "demandé" : "non demandé"}</strong>
                  </span>
                ) : null}
              </div>
            )}
            {!request && params.get("ref") ? (
              <div className="confirm-ref">
                <span>
                  Référence <strong>{params.get("ref")}</strong>
                </span>
              </div>
            ) : null}
            <div className="next-steps">
              <h2>
                <Icon name="calendar-o" /> Prochaines étapes
              </h2>
              <ol>
                {next.map((step, index) => (
                  <li key={step}>
                    <span className="n">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            {isAgents && paid ? (
              <Link href="/client/dashboard" className="btn btn-primary btn-lg">
                Ouvrir l&apos;espace client
              </Link>
            ) : (
              <Link href={homeHref} className="btn btn-primary btn-lg">
                {homeLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
