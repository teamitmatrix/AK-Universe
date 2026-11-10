import "server-only";
import { digitalWebsiteOf } from "@/config/digital";
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
};

/** Validates the client's cart items and prices them. Unknown items are dropped. */
export async function priceProject(rawItems: ProjectItemInput[]) {
  const cfg = await getVideoConfig();
  const plans = cfg.marketing?.plans ?? [];

  const items = rawItems.slice(0, 30).flatMap((item) => {
    if (item.type === "forfait") {
      const plan = plans.find((p) => p.key === item.key);
      if (!plan || plan.onQuote || plan.price == null) return [];
      return [{ service: `Forfait ${plan.name}`, details: `Abonnement mensuel • ${plan.tagline}`, price: plan.price }];
    }

    if (item.type === "digital") {
      const site = item.key ? digitalWebsiteOf(item.key) : undefined;
      if (!site) return [];
      const details =
        site.runningFrom != null
          ? `Mise en place HT • Fonctionnement dès ${site.runningFrom.toLocaleString("fr-FR")} € HT / mois`
          : "Mise en place HT";
      return [{ service: site.name, details, price: site.price }];
    }

    const s = cfg.services.find((x) => x.slug === item.slug);
    if (!s) return [];
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
  return { items, total, deposit: Math.round((total * cfg.depositPercent) / 100), depositPercent: cfg.depositPercent };
}
