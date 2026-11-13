"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { readClient, submitProject, useCart } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, Stepper, useMounted } from "./flow";

export function FinaliserView() {
  const t = useT();
  const router = useRouter();
  const mounted = useMounted();
  const { config, toast } = useVideo();
  const cart = useCart(config);
  const [sending, setSending] = useState(false);
  const client = mounted ? readClient() : null;

  useEffect(() => {
    if (mounted && cart.items.length > 0 && !readClient().email) router.replace("/projet/informations");
  }, [mounted, cart.items.length, router]);

  return (
    <main className="flow">
      <div className="container">
        <Stepper step={3} />
        {!mounted || !client ? null : cart.items.length === 0 ? (
          <EmptyProject />
        ) : (
          <>
            <h1 className="flow-title">{t("Comment souhaitez-vous finaliser ?")}</h1>
            <p className="flow-sub">
              {t("Estimation de votre projet :")}{" "}
              <strong className="gold">
                {euro(cart.total)} {t("HT")}
              </strong>
            </p>
            <div className="choice-grid">
              <div className="choice">
                <span className="choice-ic">
                  <Icon name="file-text" />
                </span>
                <h2>{t("Recevoir un devis personnalisé")}</h2>
                <ul className="gold-checks">
                  <li>
                    <Icon name="check-circle" />
                    {t("Étude personnalisée du projet")}
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    {t("Prix final adapté aux besoins")}
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    {t("Réponse sous 24 à 48h")}
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    {t("Aucun paiement immédiat")}
                  </li>
                </ul>
                <button
                  type="button"
                  className="btn btn-outline-gold btn-block btn-lg"
                  disabled={sending}
                  onClick={() => {
                    setSending(true);
                    submitProject(t, config, "devis", cart.items, client)
                      .then(() => router.push("/confirmation"))
                      .catch((error: Error) => {
                        toast(error.message);
                        setSending(false);
                      });
                  }}
                >
                  {sending ? (
                    t("Envoi en cours…")
                  ) : (
                    <>
                      <Icon name="mail" /> {t("Demander mon devis")}
                    </>
                  )}
                </button>
              </div>
              <div className="choice featured">
                <span className="choice-ic">
                  <Icon name="credit-card" />
                </span>
                <h2>{t("Réserver avec un acompte")}</h2>
                <ul className="gold-checks">
                  <li>
                    <Icon name="check-circle" />
                    {t("Réservation sécurisée de votre date")}
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    {t.rich("Acompte de {percent} % : <strong>{amount}</strong>", {}, {
                      percent: config.depositPercent,
                      amount: `${euro(cart.deposit)} ${t("HT")}`,
                    })}
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    {t("Confirmation immédiate")}
                  </li>
                  <li>
                    <Icon name="check-circle" />
                    {t("Solde selon le devis final")}
                  </li>
                </ul>
                <Link href="/acompte" className="btn btn-primary btn-block btn-lg">
                  {t("Payer un acompte")} <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
