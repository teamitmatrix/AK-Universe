"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addonsForAgent, formatAddonPrice, isAddonId, type AgentAddon } from "@/config/agent-addons";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { writeAgentsCycle } from "@/lib/agents-cycle";
import type { Cycle } from "@/config/pricing";

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Solo agent buy box on /agents-ia/[id].
 * Subscribes through /paiement (Stripe subscription → client dashboard), not the video project cart.
 */
export function AgentAddToCart({
  agentId,
  priceMonthly,
  priceAnnual,
  setupFrom,
  capacityLabel,
  addonPrices = {},
  hiddenAddonIds = [],
  signedIn = false,
}: {
  agentId: string;
  /** Kept for callers; display name lives on the agent page around this box. */
  name?: string;
  priceMonthly: number;
  priceAnnual: number | null;
  setupFrom?: number | null;
  capacityLabel?: string;
  addonPrices?: Record<string, number>;
  hiddenAddonIds?: string[];
  signedIn?: boolean;
}) {
  const router = useRouter();
  const [toast, toastNode] = useToast();
  const [cycle, setCycle] = useState<Cycle>("mensuel");
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

  const annual = cycle === "annuel" && priceAnnual != null;
  const planDue = annual ? priceAnnual! : priceMonthly;
  const firstCharge = planDue + (setupFrom ?? 0);

  const setBilling = (next: Cycle) => {
    setCycle(next);
    writeAgentsCycle(next);
  };

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const subscribe = () => {
    writeAgentsCycle(cycle);
    if (selected.length) {
      toast("Les add-ons sélectionnés ne sont pas inclus dans cet abonnement. Vous pourrez les commander séparément.");
    }
    const pay = `/paiement?plan=${encodeURIComponent(agentId)}&cycle=${cycle}`;
    router.push(signedIn ? pay : `/inscription?next=${encodeURIComponent(pay)}`);
  };

  return (
    <>
      <div className="agent-profile-buy" id="acheter">
        <div className="agent-profile-price">
          <strong>{euros(annual ? priceAnnual! : priceMonthly)} €</strong>
          <span>{annual ? "HT / an" : "HT / mois"}</span>
          {priceAnnual != null && !annual ? (
            <span className="agent-profile-price-annual">soit {euros(priceAnnual)} € / an</span>
          ) : null}
          {setupFrom != null ? (
            <span className="agent-profile-capacity">Mise en place {euros(setupFrom)} € HT (une fois)</span>
          ) : null}
          {capacityLabel ? <span className="agent-profile-capacity">{capacityLabel}</span> : null}
        </div>

        {priceAnnual != null ? (
          <div className="cycle agent-cfg-cycle" role="group" aria-label="Période de facturation">
            {(["mensuel", "annuel"] as const).map((c) => (
              <button key={c} type="button" data-cycle={c} aria-pressed={cycle === c} onClick={() => setBilling(c)}>
                {c === "mensuel" ? "Mensuel" : "Annuel"}
              </button>
            ))}
          </div>
        ) : null}

        {options.length > 0 ? (
          <div className="agent-cfg-options">
            <p className="agent-cfg-options-title">Add-ons (commande séparée)</p>
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

        <button type="button" className="btn btn-primary btn-lg" onClick={subscribe}>
          <Icon name="cart" /> S&apos;abonner – {euros(firstCharge)} € HT
        </button>
        {setupFrom != null && setupFrom > 0 ? (
          <p className="agent-cfg-note">
            1er règlement = mise en place + {annual ? "forfait annuel" : "abonnement mensuel"}
            {addonsOnce + addonsMonthly > 0 ? " (add-ons non inclus ici)" : ""}. Puis{" "}
            {euros(annual ? priceAnnual! : priceMonthly)} € HT / {annual ? "an" : "mois"}.
          </p>
        ) : null}
      </div>
      {toastNode}
    </>
  );
}
