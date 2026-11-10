"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EARLY_START_CONSENT, EARLY_START_HINT } from "@/config/withdrawal";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { readClient, submitProject, useCart } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, Stepper, Summary, useMounted } from "./flow";

function formatShootDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return ` · ${date.toLocaleDateString("fr-FR")}`;
  } catch {
    return "";
  }
}

export function AcompteView() {
  const router = useRouter();
  const mounted = useMounted();
  const { config, toast } = useVideo();
  const cart = useCart(config);
  const [method, setMethod] = useState("carte");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("Le formulaire de paiement sécurisé Stripe s'affichera ici.");
  const [alert, setAlert] = useState(false);
  const [earlyStart, setEarlyStart] = useState(false);
  const client = mounted ? readClient() : null;

  useEffect(() => {
    if (mounted && cart.items.length > 0 && !readClient().email) router.replace("/projet/informations");
  }, [mounted, cart.items.length, router]);

  const fail = (message: string) => {
    setNotice(message);
    setAlert(true);
    setSending(false);
    toast(message);
  };

  return (
    <main className="flow">
      <div className="container">
        <Stepper step={3} />
        {!mounted || !client ? null : cart.items.length === 0 ? (
          <EmptyProject />
        ) : !client.email ? null : (
          <>
            <h1 className="flow-title">Paiement de l&apos;acompte</h1>
            <div className="flow-grid">
              <aside className="stack-dark">
                <div className="dark-card recap">
                  <Summary editable />
                  <div className="deposit-box">
                    <span>Acompte ({config.depositPercent} %) à régler aujourd&apos;hui</span>
                    <strong>
                      {euro(cart.deposit)} <small>HT</small>
                    </strong>
                  </div>
                  <p className="muted-note">Le solde sera réglé selon le devis final, après validation des détails.</p>
                </div>
                <div className="dark-card">
                  <div className="recap-head">
                    <h2>Vos informations</h2>
                    <Link href="/projet/informations" className="link-gold">
                      Modifier
                    </Link>
                  </div>
                  <dl className="client-dl">
                    <dt>Nom</dt>
                    <dd>
                      {client.prenom} {client.nom}
                      {client.entreprise ? ` — ${client.entreprise}` : ""}
                    </dd>
                    <dt>Contact</dt>
                    <dd>
                      {client.email} · {client.tel}
                    </dd>
                    <dt>Tournage</dt>
                    <dd>
                      {client.lieu}
                      {client.date ? formatShootDate(client.date) : ""}
                    </dd>
                  </dl>
                </div>
              </aside>
              <form
                className="dark-card"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!event.currentTarget.reportValidity()) return;
                  setSending(true);
                  const payment = method === "virement" ? "virement" : undefined;
                  submitProject(config, "acompte", cart.items, client, payment, {
                    earlyStartAccepted: earlyStart,
                  })
                    .then((data) => {
                      if (payment === "virement") {
                        router.push("/confirmation");
                        return;
                      }
                      if (!data.checkoutUrl) throw new Error("Le paiement en ligne n'est pas encore configuré. Aucun paiement n'a été effectué.");
                      window.location.href = data.checkoutUrl;
                    })
                    .catch((error: Error) => fail(error.message));
                }}
              >
                <h2>Moyen de paiement</h2>
                <div className="pay-methods" role="radiogroup" aria-label="Moyen de paiement">
                  <label className="pay-method">
                    <input type="radio" name="pm" value="carte" checked={method === "carte"} onChange={() => setMethod("carte")} />
                    <Icon name="credit-card" />
                    <span>Carte bancaire</span>
                    <small>Visa, Mastercard, CB, Amex</small>
                  </label>
                  <label className="pay-method">
                    <input type="radio" name="pm" value="wallet" checked={method === "wallet"} onChange={() => setMethod("wallet")} />
                    <Icon name="smartphone" />
                    <span>Apple Pay / Google Pay</span>
                  </label>
                  <label className="pay-method">
                    <input type="radio" name="pm" value="virement" checked={method === "virement"} onChange={() => setMethod("virement")} />
                    <Icon name="file-text" />
                    <span>Virement bancaire</span>
                    <small>Réservation confirmée à réception</small>
                  </label>
                </div>
                <div className="stripe-slot" id="stripe-element">
                  <Icon name="lock" />
                  <p role={alert ? "alert" : undefined}>{notice}</p>
                </div>
                <p className="withdrawal-note">
                  Le contrat est formé à l&apos;acceptation des{" "}
                  <a href="/cgv" target="_blank" rel="noopener">
                    conditions générales
                  </a>{" "}
                  et au paiement de l&apos;acompte (ou à la confirmation du virement). Les clients particuliers disposent
                  en principe de 14 jours pour se rétracter ; détails dans les{" "}
                  <a href="/cgv#retractation" target="_blank" rel="noopener">
                    CGV
                  </a>
                  .
                </p>
                <label className="cgv">
                  <input
                    type="checkbox"
                    checked={earlyStart}
                    onChange={(event) => setEarlyStart(event.target.checked)}
                  />{" "}
                  <span>{EARLY_START_CONSENT.wording}</span>
                </label>
                {!earlyStart ? <p className="withdrawal-hint">{EARLY_START_HINT}</p> : null}
                <label className="cgv">
                  <input type="checkbox" required />{" "}
                  <span>
                    J&apos;accepte les{" "}
                    <a href="/cgv" target="_blank" rel="noopener">
                      conditions générales de vente
                    </a>{" "}
                    et je comprends que l&apos;acompte réserve ma date.
                  </span>
                </label>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={sending}>
                  {sending ? (
                    "Paiement en cours…"
                  ) : (
                    <>
                      <Icon name="lock" /> Payer {euro(cart.deposit)} d&apos;acompte
                    </>
                  )}
                </button>
                <p className="secure-dark">
                  <Icon name="shield" />
                  <span>
                    Paiement 100 % sécurisé par <b>Stripe</b>. Vos données bancaires ne transitent jamais par nos serveurs.
                  </span>
                </p>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
