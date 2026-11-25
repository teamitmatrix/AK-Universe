"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { euro, qtyWord } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import {
  isAgent,
  isDigital,
  isForfait,
  itemName,
  itemPriceLines,
  itemSummary,
  planOf,
  serviceOf,
  useCart,
  type CartItem,
} from "./cart";
import { useVideo } from "./context";
import { Mockup } from "./Mockup";

const STEPS = ["Mon panier", "Mes informations", "Validation"];

export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function Stepper({ step }: { step: number }) {
  return (
    <ol className="flow-steps" aria-label="Étapes">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const state = number < step ? "done" : number === step ? "current" : "";
        return (
          <li key={label} className={state} aria-current={number === step ? "step" : undefined}>
            <span className="n">{number < step ? <Icon name="check" /> : number}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyProject() {
  return (
    <div className="empty-state">
      <span className="icon-circle big">
        <Icon name="clapper" />
      </span>
      <h2>Votre panier est vide</h2>
      <p>Choisissez un abonnement IA, un forfait marketing ou un service au prix affiché.</p>
      <div className="cta-row" style={{ justifyContent: "center" }}>
        <Link href="/agents-ia#tarifs" className="btn btn-primary btn-lg">
          Abonnements IA <Icon name="arrow" />
        </Link>
        <Link href="/marketing/forfaits" className="btn btn-outline-gold btn-lg">
          Forfaits marketing
        </Link>
        <Link href="/services" className="btn btn-outline btn-lg">
          Services vidéo
        </Link>
      </div>
    </div>
  );
}

function Thumb({ item, className }: { item: CartItem; className: string }) {
  const { config } = useVideo();
  if (isForfait(item)) return <Mockup mockup={null} region="thumb" className={className} emptyIcon="crown" />;
  if (isDigital(item)) return <Mockup mockup={null} region="thumb" className={className} emptyIcon="grid" />;
  if (isAgent(item)) return <Mockup mockup={null} region="thumb" className={className} emptyIcon="sparkle" />;
  return <Mockup mockup={serviceOf(config, item.slug)?.mockup} region="thumb" className={className} />;
}

export function Summary({ editable = false }: { editable?: boolean }) {
  const { config } = useVideo();
  const cart = useCart(config);
  return (
    <>
      <div className="recap-head">
        <h2>Mon panier</h2>
        {editable && (
          <Link href="/projet" className="link-gold">
            Modifier
          </Link>
        )}
      </div>
      <ul className="recap-list">
        {cart.items.map((item) => (
          <li key={item.id}>
            <Thumb item={item} className="recap-thumb" />
            <div>
              <strong>{itemName(config, item)}</strong>
              <small>{itemSummary(config, item)}</small>
            </div>
            <div className="recap-price">
              {itemPriceLines(config, item).map((line) => (
                <b key={`${line.label}-${line.amount}`}>
                  {line.label ? <span>{line.label}</span> : null}
                  {euro(line.amount)}
                  {line.suffix ? <small> {line.suffix}</small> : null}
                </b>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="recap-total">
        <span>{cart.recurringMonthly > 0 ? "1er mois (mise en place + abonnement)" : "Estimation totale"}</span>
        <strong>
          {euro(cart.total)} <small>HT</small>
        </strong>
      </div>
      {cart.recurringMonthly > 0 ? (
        <div className="recap-total is-renew">
          <span>Puis chaque mois (abonnement seul)</span>
          <strong>
            {euro(cart.recurringMonthly)} <small>HT</small>
          </strong>
        </div>
      ) : null}
      <p className="muted-note">
        {cart.recurringMonthly > 0
          ? "Prix indicatif. La mise en place n'est payée qu'une fois."
          : "Prix indicatif, ajusté selon vos besoins."}
      </p>
    </>
  );
}

export function quantityLabel(item: CartItem, config: ReturnType<typeof useVideo>["config"]) {
  // Setup + subscription amounts are shown in the price column — keep qty for video services only.
  if (isForfait(item)) {
    const plan = planOf(config, item.key);
    return plan?.setupPrice ? "" : "Abonnement mensuel";
  }
  if (isDigital(item) || isAgent(item)) return "";
  const service = serviceOf(config, item.slug);
  return service ? qtyWord(service, item.qty) : "";
}
