"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { euro, qtyWord } from "@/lib/projects/quote-math";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";
import type { T } from "@/i18n/translate";
import { isForfait, itemName, itemPrice, itemSummary, serviceOf, useCart, type CartItem } from "./cart";
import { useVideo } from "./context";
import { Mockup } from "./Mockup";

const STEPS = ["Mon projet", "Mes informations", "Validation"];

export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function Stepper({ step }: { step: number }) {
  const t = useT();
  return (
    <ol className="flow-steps" aria-label={t("Étapes")}>
      {STEPS.map((label, index) => {
        const number = index + 1;
        const state = number < step ? "done" : number === step ? "current" : "";
        return (
          <li key={label} className={state} aria-current={number === step ? "step" : undefined}>
            <span className="n">{number < step ? <Icon name="check" /> : number}</span>
            {t(label)}
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyProject() {
  const t = useT();
  return (
    <div className="empty-state">
      <span className="icon-circle big">
        <Icon name="clapper" />
      </span>
      <h2>{t("Votre projet est vide")}</h2>
      <p>{t("Choisissez un ou plusieurs services vidéo pour composer votre projet.")}</p>
      <Link href="/services" className="btn btn-primary btn-lg">
        {t("Choisir mes services")} <Icon name="arrow" />
      </Link>
    </div>
  );
}

function Thumb({ item, className }: { item: CartItem; className: string }) {
  const { config } = useVideo();
  if (isForfait(item)) return <Mockup mockup={null} region="thumb" className={className} emptyIcon="crown" />;
  return <Mockup mockup={serviceOf(config, item.slug)?.mockup} region="thumb" className={className} />;
}

export function Summary({ editable = false }: { editable?: boolean }) {
  const t = useT();
  const { config } = useVideo();
  const cart = useCart(config);
  return (
    <>
      <div className="recap-head">
        <h2>{t("Mon projet")}</h2>
        {editable && (
          <Link href="/projet" className="link-gold">
            {t("Modifier")}
          </Link>
        )}
      </div>
      <ul className="recap-list">
        {cart.items.map((item) => (
          <li key={item.id}>
            <Thumb item={item} className="recap-thumb" />
            <div>
              <strong>{itemName(config, item, t)}</strong>
              <small>{itemSummary(config, item, t)}</small>
            </div>
            <b>{euro(itemPrice(config, item))}</b>
          </li>
        ))}
      </ul>
      <div className="recap-total">
        <span>{t("Estimation totale")}</span>
        <strong>
          {euro(cart.total)} <small>{t("HT")}</small>
        </strong>
      </div>
      <p className="muted-note">{t("Prix indicatif, ajusté selon vos besoins.")}</p>
    </>
  );
}

export function quantityLabel(item: CartItem, config: ReturnType<typeof useVideo>["config"], t: T) {
  if (isForfait(item)) return t("Abonnement mensuel");
  const service = serviceOf(config, item.slug);
  return service ? qtyWord(service, item.qty) : "";
}
