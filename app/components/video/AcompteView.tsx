"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { readClient, submitProject, useCart } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, Stepper, Summary, useMounted } from "./flow";

function formatShootDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return ` · ${date.toLocaleDateString(locale)}`;
  } catch {
    return "";
  }
}

export function AcompteView() {
  const t = useT();
  const router = useRouter();
  const mounted = useMounted();
  const { config, toast } = useVideo();
  const cart = useCart(config);
  const [method, setMethod] = useState("carte");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [alert, setAlert] = useState(false);
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
            <h1 className="flow-title">{t("Paiement de l'acompte")}</h1>
            <div className="flow-grid">
              <aside className="stack-dark">
                <div className="dark-card recap">
                  <Summary editable />
                  <div className="deposit-box">
                    <span>{t("Acompte ({percent} %) à régler aujourd'hui", { percent: config.depositPercent })}</span>
                    <strong>
                      {euro(cart.deposit)} <small>{t("HT")}</small>
                    </strong>
                  </div>
                  <p className="muted-note">{t("Le solde sera réglé selon le devis final, après validation des détails.")}</p>
                </div>
                <div className="dark-card">
                  <div className="recap-head">
                    <h2>{t("Vos informations")}</h2>
                    <Link href="/projet/informations" className="link-gold">
                      {t("Modifier")}
                    </Link>
                  </div>
                  <dl className="client-dl">
                    <dt>{t("Nom")}</dt>
                    <dd>
                      {client.prenom} {client.nom}
                      {client.entreprise ? ` — ${client.entreprise}` : ""}
                    </dd>
                    <dt>{t("Contact")}</dt>
                    <dd>
                      {client.email} · {client.tel}
                    </dd>
                    <dt>{t("Tournage")}</dt>
                    <dd>
                      {client.lieu}
                      {client.date ? formatShootDate(client.date, t.locale) : ""}
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
                  submitProject(t, config, "acompte", cart.items, client, payment)
                    .then((data) => {
                      if (payment === "virement") {
                        router.push("/confirmation");
                        return;
                      }
                      if (!data.checkoutUrl) {
                        throw new Error(t("Le paiement en ligne n'est pas encore configuré. Aucun paiement n'a été effectué."));
                      }
                      window.location.href = data.checkoutUrl;
                    })
                    .catch((error: Error) => fail(error.message));
                }}
              >
                <h2>{t("Moyen de paiement")}</h2>
                <div className="pay-methods" role="radiogroup" aria-label={t("Moyen de paiement")}>
                  <label className="pay-method">
                    <input type="radio" name="pm" value="carte" checked={method === "carte"} onChange={() => setMethod("carte")} />
                    <Icon name="credit-card" />
                    <span>{t("Carte bancaire")}</span>
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
                    <span>{t("Virement bancaire")}</span>
                    <small>{t("Réservation confirmée à réception")}</small>
                  </label>
                </div>
                <div className="stripe-slot" id="stripe-element">
                  <Icon name="lock" />
                  <p role={alert ? "alert" : undefined}>{notice || t("Le formulaire de paiement sécurisé Stripe s'affichera ici.")}</p>
                </div>
                <label className="cgv">
                  <input type="checkbox" required />{" "}
                  <span>
                    {t.rich(
                      "J'accepte les <link>conditions générales de vente</link> et je comprends que l'acompte réserve ma date.",
                      {
                        link: (c) => (
                          <a href="/cgv" target="_blank" rel="noopener">
                            {c}
                          </a>
                        ),
                      },
                    )}
                  </span>
                </label>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={sending}>
                  {sending ? (
                    t("Paiement en cours…")
                  ) : (
                    <>
                      <Icon name="lock" /> {t("Payer {amount} d'acompte", { amount: euro(cart.deposit) })}
                    </>
                  )}
                </button>
                <p className="secure-dark">
                  <Icon name="shield" />
                  <span>
                    {t.rich("Paiement 100 % sécurisé par <b>Stripe</b>. Vos données bancaires ne transitent jamais par nos serveurs.")}
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
