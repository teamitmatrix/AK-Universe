"use client";

import Link from "next/link";
import { AGENT_ADDON_LIST, formatAddonPrice, isAddonId, type AgentAddon } from "@/config/agent-addons";
import { normalizeAgentsPricing, type AgentsPricing } from "@/config/pricing";
import { Icon } from "@/components/ui/Icon";

function AddonGrid({
  items,
  pricing,
}: {
  items: readonly AgentAddon[];
  pricing: AgentsPricing;
}) {
  const rates = normalizeAgentsPricing(pricing);
  const once = items.filter((a) => a.billing === "once");
  const monthly = items.filter((a) => a.billing === "month");

  const block = (title: string, list: AgentAddon[]) =>
    list.length === 0 ? null : (
      <div className="agent-addons-block">
        <h3>{title}</h3>
        <ul className="agent-addons-list">
          {list.map((addon) => {
            const live = (isAddonId(addon.id) ? rates.addons[addon.id] : undefined) ?? addon.price;
            return (
              <li key={addon.id}>
                <div>
                  <strong>{addon.label}</strong>
                  <span>{addon.detail}</span>
                </div>
                <em>
                  {formatAddonPrice(addon, live)}
                  <small>{addon.billing === "month" ? " HT / mois" : " HT"}</small>
                </em>
              </li>
            );
          })}
        </ul>
      </div>
    );

  return (
    <>
      {block("Packs à l'usage", once)}
      {block("Options mensuelles", monthly)}
    </>
  );
}

/** Full add-ons table under package tiers (/agents-ia#addons). */
export function AgentAddons({
  pricing,
  hiddenIds = [],
}: {
  pricing: AgentsPricing;
  hiddenIds?: string[];
}) {
  const hidden = new Set(hiddenIds);
  const items = AGENT_ADDON_LIST.filter((a) => !hidden.has(`addon:${a.id}`));

  return (
    <section className="agent-addons stars" id="addons">
      <div className="container">
        <div className="pricing-head">
          <p className="eyebrow eyebrow-lines">À la carte</p>
          <h2>
            Usage et <span className="gold">add-ons</span>
          </h2>
          <p>
            Choisissez ces options quand vous ajoutez un agent à votre projet (comme pour les services vidéo).
            <br />
            Les prix sont hors taxes ; certaines données tierces ou frais Meta restent en sus.
          </p>
        </div>
        <AddonGrid items={items} pricing={pricing} />
        <div className="agent-addons-cta">
          <Link href="/agents-ia#tous" className="btn btn-outline-gold btn-lg">
            Choisir un agent et ses options <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </section>
  );
}
