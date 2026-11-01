import "server-only";
import { getVideoConfig, type OptionDef } from "@/lib/video-config";

/*
 * Server-side port of the price calculation in public/assets/js/projet.js,
 * using the same catalogue the browser receives (defaults + admin prices).
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
      if (!plan) return [];
      return [{ service: `Forfait ${plan.name}`, details: `Abonnement mensuel • ${plan.tagline}`, price: plan.price }];
    }

    const s = cfg.services.find((x) => x.slug === item.slug);
    if (!s) return [];
    const discounts = s.qtyDiscounts ?? cfg.qtyDiscounts;
    const qtyChoices = s.qtyChoices ?? Object.keys(discounts).map(Number);
    const qty = qtyChoices.includes(Number(item.qty)) ? Number(item.qty) : qtyChoices[0];
    const durations = s.durations ?? cfg.defaultDurations;
    const dur = durations[Number(item.dur)] ?? durations[0];
    const options = (s.options ?? [])
      .map((o) => {
        const ref = typeof o === "string" ? { id: o } : o;
        const base = cfg.options[ref.id] ?? {};
        return { ...base, ...ref, per: ref.per ?? base.per ?? "projet" } as { id: string } & OptionDef;
      })
      .filter((o) => o.label && item.opts?.includes(o.id));

    const perVideo = options.filter((o) => o.per === "video").reduce((a, o) => a + o.price, 0);
    const perProject = options.filter((o) => o.per !== "video").reduce((a, o) => a + o.price, 0);
    const discount = discounts[String(qty)] ?? 0;
    const price = Math.round((s.price + (dur?.extra ?? 0) + perVideo) * qty * (1 - discount / 100) + perProject);

    const unit = (s.qtyLabel ?? "Nombre de vidéos").replace(/^Nombre de /, "");
    const qtyWord = qty > 1 ? `${qty} ${unit}` : `${qty} ${unit.replace(/^(\S+?)s\b/, "$1")}`;
    const details = [qtyWord, dur.label, ...options.map((o) => o.label.replace(/ \(.*\)$/, ""))].join(" • ");
    return [{ service: s.name, details, price }];
  });

  const total = items.reduce((a, i) => a + i.price, 0);
  return { items, total, deposit: Math.round((total * cfg.depositPercent) / 100), depositPercent: cfg.depositPercent };
}
