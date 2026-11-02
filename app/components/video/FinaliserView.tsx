"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { readClient, submitProject, useCart } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, Stepper, useMounted } from "./flow";

export function FinaliserView() {
  const router = useRouter();
  const mounted = useMounted();
  const { config, toast } = useVideo();
  const cart = useCart(config);
  const [sending, setSending] = useState(false);
  const client = mounted ? readClient() : null;

  useEffect(() => {
    if (mounted && cart.items.length > 0 && !readClient().email) router.replace("/informations");
  }, [mounted, cart.items.length, router]);

  return (
    <main className="flow">
      <div className="container">
        <Stepper step={3} />
        {!mounted || !client ? null : cart.items.length === 0 ? (
          <EmptyProject />
        ) : (
          <>
            <h1 className="flow-title">Comment souhaitez-vous finaliser ?</h1>
            <p className="flow-sub">
              Estimation de votre projet : <strong className="gold">{euro(cart.total)} HT</strong>
            </p>
            <div className="choice-grid">
              <div className="choice">
                <span className="choice-ic">
                  <Icon name="file-text" />
                </span>
                <h2>Recevoir un devis personnalisé</h2>
                <ul className="gold-checks">
                  <li>
                    <Icon name="check-circle" />
                    Étude personnalisée du projet
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    Prix final adapté aux besoins
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    Réponse sous 24 à 48h
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    Aucun paiement immédiat
                  </li>
                </ul>
                <button
                  type="button"
                  className="btn btn-outline-gold btn-block btn-lg"
                  disabled={sending}
                  onClick={() => {
                    setSending(true);
                    submitProject(config, "devis", cart.items, client)
                      .then(() => router.push("/confirmation"))
                      .catch((error: Error) => {
                        toast(error.message);
                        setSending(false);
                      });
                  }}
                >
                  {sending ? (
                    "Envoi en cours…"
                  ) : (
                    <>
                      <Icon name="mail" /> Demander mon devis
                    </>
                  )}
                </button>
              </div>
              <div className="choice featured">
                <span className="choice-ic">
                  <Icon name="credit-card" />
                </span>
                <h2>Réserver avec un acompte</h2>
                <ul className="gold-checks">
                  <li>
                    <Icon name="check-circle" />
                    Réservation sécurisée de votre date
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    Acompte de {config.depositPercent} % : <strong>{euro(cart.deposit)} HT</strong>
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    Confirmation immédiate
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    Solde selon le devis final
                  </li>
                </ul>
                <Link href="/acompte" className="btn btn-primary btn-block btn-lg">
                  Payer un acompte <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
