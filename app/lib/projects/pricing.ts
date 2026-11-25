import "server-only";
import { AGENT_ADDON_LIST, isAddonId } from "@/config/agent-addons";
import { DIGITAL_WEBSITES, digitalWebsiteOf } from "@/config/digital";
import { getAgentOffers } from "@/lib/agent-offers";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getDigitalWebsites } from "@/lib/digital-pricing";
import { getVideoConfig } from "@/lib/video-config";
import { durationsOf, qtyChoicesOf, resolvedOptions, videoPrice, videoSummary } from "@/lib/projects/quote-math";

/*
 * Prices a visitor's cart with the catalogue the pages use (defaults + admin prices).
 * The math lives in quote-math.ts so the pages and this API stay in step.
 */

export type ProjectItemInput = {
  type?: string;
  key?: string;
  slug?: string;
  qty?: number;
  dur?: number;
  opts?: string[];
  /** Selected AI add-on ids (agent cart lines). */
  addons?: string[];
};

/** Validates the client's cart items and prices them. Unknown items are dropped. */
export async function priceProject(rawItems: ProjectItemInput[]) {
  const [cfg, websites, agentOffers, agentsPricing] = await Promise.all([
    getVideoConfig(),
    getDigitalWebsites(),
    getAgentOffers(),
    getAgentsPricing(),
  ]);
  const plans = cfg.marketing?.plans ?? [];
  const digitalCatalog = websites.length ? websites : DIGITAL_WEBSITES;
  const addonPrices = agentsPricing.addons;

  let unpriced = false;
  const items = rawItems.slice(0, 30).flatMap((item) => {
    if (item.type === "forfait") {
      const plan = plans.find((p) => p.key === item.key);
      if (!plan || plan.onQuote || plan.price == null) {
        unpriced = true;
        return [];
      }
      const lines = [];
      if (plan.setupPrice != null && plan.setupPrice > 0) {
        lines.push({
          service: `Forfait ${plan.name} — mise en place`,
          details: `${plan.tagline} · une seule fois`,
          price: plan.setupPrice,
        });
      }
      lines.push({
        service: `Forfait ${plan.name} — abonnement`,
        details: `HT / mois • ${plan.tagline}`,
        price: plan.price,
      });
      return lines;
    }

    if (item.type === "digital") {
      const site = item.key ? digitalCatalog.find((s) => s.id === item.key) ?? digitalWebsiteOf(item.key) : undefined;
      if (!site) {
        unpriced = true;
        return [];
      }
      const details =
        site.runningFrom != null
          ? `Mise en place ${site.price.toLocaleString("fr-FR")} € HT (une fois) · Fonctionnement dès ${site.runningFrom.toLocaleString("fr-FR")} € HT / mois`
          : "Mise en place HT · une seule fois";
      // Only the set-up is billed in the project quote; running fees are indicative ("dès").
      return [{ service: site.name, details, price: site.price }];
    }

    if (item.type === "agent") {
      const offer = item.key ? agentOffers.find((o) => o.id === item.key) : undefined;
      if (!offer) {
        unpriced = true;
        return [];
      }
      const lines = [
        {
          service: `Agent IA — ${offer.name} — mise en place`,
          details: `${offer.capacity} · une seule fois`,
          price: offer.setupFrom,
        },
        {
          service: `Agent IA — ${offer.name} — abonnement`,
          details: `HT / mois · ${offer.capacity}`,
          price: offer.price,
        },
      ];
      const chosen = new Set((item.addons ?? []).filter(isAddonId));
      for (const addon of AGENT_ADDON_LIST) {
        if (!isAddonId(addon.id) || !chosen.has(addon.id)) continue;
        const price = addonPrices[addon.id] ?? addon.price;
        lines.push({
          service: `Add-on — ${addon.label}`,
          details: `${addon.detail}${addon.billing === "month" ? " · HT / mois" : " · une fois"}`,
          price,
        });
      }
      return lines;
    }

    const s = cfg.services.find((x) => x.slug === item.slug);
    if (!s) {
      unpriced = true;
      return [];
    }
    const qtyChoices = qtyChoicesOf(cfg, s);
    const qty = qtyChoices.includes(Number(item.qty)) ? Number(item.qty) : qtyChoices[0];
    const durations = durationsOf(cfg, s);
    const durIndex = durations[Number(item.dur)] ? Number(item.dur) : 0;
    const draft = { qty, dur: durIndex, opts: item.opts ?? [] };
    const known = new Set(resolvedOptions(cfg, s).map((option) => option.id));
    draft.opts = draft.opts.filter((id) => known.has(id));
    return [{ service: s.name, details: videoSummary(cfg, s, draft), price: videoPrice(cfg, s, draft) }];
  });

  const total = items.reduce((a, i) => a + i.price, 0);
  const fixed = items.length > 0 && !unpriced;
  const deposit = Math.round((total * cfg.depositPercent) / 100);
  return {
    items,
    total,
    deposit,
    depositPercent: cfg.depositPercent,
    /** Every line has a listed price, so the customer pays that total now. */
    fixed,
    charge: fixed ? total : deposit,
  };
}
