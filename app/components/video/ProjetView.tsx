"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInBeforePayment } from "@/lib/auth/redirect";
import { euro } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { isAgent, isDigital, isForfait, itemName, itemPriceLines, itemSummary, serviceOf, useCart } from "./cart";
import { useVideo } from "./context";
import { EmptyProject, quantityLabel, Stepper, useMounted } from "./flow";
import { Mockup } from "./Mockup";

export function ProjetView({ signedIn = false }: { signedIn?: boolean }) {
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
                <h1>Mon projet</h1>
                <p>
                  {cart.items.length} prestation{cart.items.length > 1 ? "s" : ""} sélectionnée
                  {cart.items.length > 1 ? "s" : ""}
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
                  "Confirmer : tout vider ?"
                ) : (
                  <>
                    <Icon name="trash" /> Vider le projet
                  </>
                )}
              </button>
            </div>
            <ul className="projet-items">
              {cart.items.map((item) => {
                const name = itemName(config, item);
                const href = isForfait(item)
                  ? "/marketing/forfaits"
                  : isDigital(item)
                    ? `/digital#${item.key}`
                    : isAgent(item)
                      ? `/agents-ia/${item.key}`
                      : `/services/${item.slug}`;
                return (
                  <li key={item.id} className="projet-item">
                    <Link href={href}>
                      {isForfait(item) ? (
                        <Mockup mockup={null} region="thumb" className="projet-thumb" emptyIcon="crown" />
                      ) : isDigital(item) ? (
                        <Mockup mockup={null} region="thumb" className="projet-thumb" emptyIcon="grid" />
                      ) : isAgent(item) ? (
                        <Mockup mockup={null} region="thumb" className="projet-thumb" emptyIcon="sparkle" />
                      ) : (
                        <Mockup mockup={serviceOf(config, item.slug)?.mockup} region="thumb" className="projet-thumb" />
                      )}
                    </Link>
                    <div className="pi-info">
                      <h3>{name}</h3>
                      <p>{itemSummary(config, item)}</p>
                      <div className="pi-actions">
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => {
                            if (isForfait(item)) router.push("/marketing/forfaits");
                            else if (isDigital(item)) router.push(`/digital#${item.key}`);
                            else if (isAgent(item)) router.push(`/agents-ia/${item.key}`);
                            else openConfig(item.slug, { editId: item.id });
                          }}
                        >
                          <Icon name="edit" /> Modifier
                        </button>
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() => {
                            cart.remove(item.id);
                            toast("Service retiré de votre projet.");
                          }}
                        >
                          <Icon name="trash" /> Retirer
                        </button>
                      </div>
                    </div>
                    <div className="pi-qty" aria-label="Quantité">
                      {quantityLabel(item, config)}
                    </div>
                    <div className="pi-price">
                      {itemPriceLines(config, item).map((line) => (
                        <div key={`${line.label}-${line.amount}`} className="pi-price-line">
                          {line.label ? <span className="pi-price-label">{line.label}</span> : null}
                          <strong>
                            {euro(line.amount)}
                            {line.suffix ? <small> {line.suffix}</small> : null}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="pi-x"
                      aria-label={`Retirer ${name}`}
                      onClick={() => {
                        cart.remove(item.id);
                        toast("Service retiré de votre projet.");
                      }}
                    >
                      <Icon name="x" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <Link href="/services" className="add-more">
              <Icon name="plus" /> Ajouter un autre service
            </Link>
            <div className="estimate">
              <div className="estimate-row">
                <h2>Estimation de votre projet</h2>
                <div className="estimate-price">
                  <span>{cart.recurringMonthly > 0 ? "1er mois (mise en place + abonnement)" : "À partir de"}</span>
                  <strong>{euro(cart.total)}</strong> <small>HT</small>
                  {cart.recurringMonthly > 0 ? (
                    <em className="estimate-renew">
                      Puis {euro(cart.recurringMonthly)} HT / mois (abonnement seul)
                    </em>
                  ) : null}
                </div>
              </div>
              <ul className="estimate-badges">
                <li>
                  <Icon name="info" /> Prix indicatif
                </li>
                <li>
                  <Icon name="file-text" /> Devis personnalisé après échange
                </li>
                <li>
                  <Icon name="shield" /> Aucun engagement
                </li>
              </ul>
              <p className="muted-note">
                {cart.recurringMonthly > 0
                  ? "La mise en place est facturée une seule fois. Les renouvellements ne comprennent que l'abonnement. "
                  : ""}
                Cette estimation n&apos;est pas un devis définitif : le prix final est confirmé après étude de votre projet.
              </p>
              <div className="cta-row">
                <Link href="/projet/informations" className="btn btn-outline-gold btn-lg" style={{ flex: 1 }}>
                  <Icon name="mail" /> Demander un devis
                </Link>
                <Link
                  href={signedIn ? "/projet/informations" : signInBeforePayment()}
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1 }}
                >
                  <Icon name="lock" /> Réserver et payer un acompte
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
