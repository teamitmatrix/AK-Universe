"use client";

import { useMemo, useState } from "react";
import { addonsForAgent, formatAddonPrice, isAddonId, type AgentAddon } from "@/config/agent-addons";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { saveAgentSubscription } from "@/components/video/cart";

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Price + selectable add-ons (video-style options) + add-to-cart for /agents-ia/[id]. */
export function AgentAddToCart({
  agentId,
  name,
  priceMonthly,
  priceAnnual,
  setupFrom,
  capacityLabel,
  addonPrices = {},
  hiddenAddonIds = [],
}: {
  agentId: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  setupFrom?: number | null;
  capacityLabel?: string;
  addonPrices?: Record<string, number>;
  hiddenAddonIds?: string[];
}) {
  const [toast, toastNode] = useToast();
  const [selected, setSelected] = useState<string[]>([]);

  const options = useMemo(() => {
    const hidden = new Set(hiddenAddonIds);
    return addonsForAgent(agentId).filter((a) => !hidden.has(`addon:${a.id}`));
  }, [agentId, hiddenAddonIds]);

  const livePrice = (addon: AgentAddon) =>
    (isAddonId(addon.id) ? addonPrices[addon.id] : undefined) ?? addon.price;

  const addonsOnce = selected
    .map((id) => options.find((o) => o.id === id))
    .filter((a): a is AgentAddon => !!a && a.billing === "once")
    .reduce((sum, a) => sum + livePrice(a), 0);
  const addonsMonthly = selected
    .map((id) => options.find((o) => o.id === id))
    .filter((a): a is AgentAddon => !!a && a.billing === "month")
    .reduce((sum, a) => sum + livePrice(a), 0);

  const firstMonth =
    priceMonthly + (setupFrom ?? 0) + addonsOnce + addonsMonthly;

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <>
      <div className="agent-profile-buy" id="acheter">
        <div className="agent-profile-price">
          <strong>{euros(priceMonthly)} €</strong>
          <span>HT / mois</span>
          {priceAnnual != null ? <span className="agent-profile-price-annual">soit {euros(priceAnnual)} € / an</span> : null}
          {setupFrom != null ? (
            <span className="agent-profile-capacity">Mise en place {euros(setupFrom)} € HT (une fois)</span>
          ) : null}
          {capacityLabel ? <span className="agent-profile-capacity">{capacityLabel}</span> : null}
        </div>

        {options.length > 0 ? (
          <div className="agent-cfg-options">
            <p className="agent-cfg-options-title">Options / add-ons</p>
            <ul className="cfg-options agent-cfg-list">
              {options.map((addon) => {
                const price = livePrice(addon);
                return (
                  <li key={addon.id}>
                    <label className="cfg-opt">
                      <Icon name="sparkle" />
                      <span>
                        {addon.label}
                        <small className="agent-cfg-detail">{addon.detail}</small>
                      </span>
                      <span className="cfg-price">
                        + {formatAddonPrice(addon, price)}
                        {addon.billing === "month" ? " / mois" : ""}
                      </span>
                      <span className="switch dark">
                        <input
                          type="checkbox"
                          checked={selected.includes(addon.id)}
                          onChange={() => toggle(addon.id)}
                        />
                        <span />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => {
            saveAgentSubscription(agentId, selected);
            toast(`${name} ajouté à mon projet`);
          }}
        >
          <Icon name="cart" /> Ajouter au panier – {euros(firstMonth)} € HT
        </button>
        {selected.length > 0 || (setupFrom != null && setupFrom > 0) ? (
          <p className="agent-cfg-note">
            1er mois = mise en place + abonnement
            {selected.length ? " + add-ons" : ""}. Puis {euros(priceMonthly + addonsMonthly)} € HT / mois.
          </p>
        ) : null}
      </div>
      {toastNode}
    </>
  );
}
