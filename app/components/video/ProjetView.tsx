"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import { isForfait, itemName, itemPrice, itemSummary, useCart } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, quantityLabel, Stepper, useMounted } from "./flow";
import { Mockup } from "./Mockup";
import { serviceOf } from "./cart";

export function ProjetView() {
  const t = useT();
  const router = useRouter();
  const mounted = useMounted();
  const { config, openConfig, toast } = useVideo();
  const cart = useCart(config);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  return (
    <main className="flow">
      <div className="container">
        <Stepper step={1} />
        {!mounted ? null : cart.items.length === 0 ? (
          <EmptyProject />
        ) : (
          <div className="projet-card">
            <div className="projet-head">
              <div>
                <h1>{t("Mon projet")}</h1>
                <p>
                  {cart.items.length > 1
                    ? t("{n} prestations sélectionnées", { n: cart.items.length })
                    : t("{n} prestation sélectionnée", { n: cart.items.length })}
                </p>
              </div>
              <button
                type="button"
                className="text-btn"
                onClick={() => {
                  if (!armed) {
                    setArmed(true);
                    return;
                  }
                  cart.clear();
                }}
              >
                {armed ? (
                  t("Confirmer : tout vider ?")
                ) : (
                  <>
                    <Icon name="trash" /> {t("Vider le projet")}
                  </>
                )}
              </button>
            </div>
            <ul className="projet-items">
              {cart.items.map((item) => {
                const name = itemName(config, item, t);
                const href = isForfait(item) ? "/marketing/forfaits" : `/services/${item.slug}`;
                return (
                  <li key={item.id} className="projet-item">
                    <Link href={href}>
                      {isForfait(item) ? (
                        <Mockup mockup={null} region="thumb" className="projet-thumb" emptyIcon="crown" />
                      ) : (
                        <Mockup mockup={serviceOf(config, item.slug)?.mockup} region="thumb" className="projet-thumb" />
                      )}
                    </Link>
                    <div className="pi-info">
                      <h3>{name}</h3>
                      <p>{itemSummary(config, item, t)}</p>
                      <div className="pi-actions">
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => {
                            if (isForfait(item)) router.push("/marketing/forfaits");
                            else openConfig(item.slug, { editId: item.id });
                          }}
                        >
                          <Icon name="edit" /> {t("Modifier")}
                        </button>
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => {
                            cart.remove(item.id);
                            toast(t("Service retiré de votre projet."));
                          }}
                        >
                          <Icon name="trash" /> {t("Retirer")}
                        </button>
                      </div>
                    </div>
                    <div className="pi-qty" aria-label={t("Quantité")}>
                      {quantityLabel(item, config, t)}
                    </div>
                    <strong className="pi-price">{euro(itemPrice(config, item))}</strong>
                    <button
                      type="button"
                      className="pi-x"
                      aria-label={t("Retirer {name}", { name })}
                      onClick={() => {
                        cart.remove(item.id);
                        toast(t("Service retiré de votre projet."));
                      }}
                    >
                      <Icon name="x" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <Link href="/services" className="add-more">
              <Icon name="plus" /> {t("Ajouter un autre service")}
            </Link>
            <div className="estimate">
              <div className="estimate-row">
                <h2>{t("Estimation de votre projet")}</h2>
                <div className="estimate-price">
                  <span>{t("À partir de")}</span>
                  <strong>{euro(cart.total)}</strong> <small>{t("HT")}</small>
                </div>
              </div>
              <ul className="estimate-badges">
                <li>
                  <Icon name="info" /> {t("Prix indicatif")}
                </li>
                <li>
                  <Icon name="file-text" /> {t("Devis personnalisé après échange")}
                </li>
                <li>
                  <Icon name="shield" /> {t("Aucun engagement")}
                </li>
              </ul>
              <p className="muted-note">
                {t("Cette estimation n'est pas un devis définitif : le prix final est confirmé après étude de votre projet.")}
              </p>
              <div className="cta-row">
                <Link href="/projet/informations" className="btn btn-outline-gold btn-lg" style={{ flex: 1 }}>
                  <Icon name="mail" /> {t("Demander un devis")}
                </Link>
                <Link href="/projet/informations" className="btn btn-primary btn-lg" style={{ flex: 1 }}>
                  <Icon name="lock" /> {t("Réserver et payer un acompte")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
