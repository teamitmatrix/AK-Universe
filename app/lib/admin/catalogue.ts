import "server-only";
import { DIGITAL_WEBSITES } from "@/config/digital";
import { AGENT_TIERS, OPTIONS, PLAN } from "@/config/pricing";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getDigitalWebsites } from "@/lib/digital-pricing";
import { getVideoConfig, loadDefaultConfig } from "@/lib/video-config";

/**
 * One row per priced item sold on the site, with its current (merged) and default values.
 * The prices themselves live where the site already reads them:
 *   video services, options, deposit, quantity discounts, marketing packages → site_settings "video_pricing"
 *   Agents IA tiers, subscription, extra user, annual discount, options      → site_settings "agents_pricing"
 *   website setup and monthly running fees                                   → site_settings "digital_pricing"
 * Field keys are stable ids understood by saveCatalogue() (catalogue-actions.ts).
 */

export type CatalogueCategory = "agents" | "abonnement" | "marketing" | "videos" | "options" | "digital" | "regles";
export type CatalogueField = { key: string; label: "price" | "setup" | "percent" | "monthly"; value: number; default: number; unit: "eur" | "eurMonth" | "pct" };
export type CatalogueRow = { id: string; category: CatalogueCategory; name: string; detail: string; fields: CatalogueField[]; href?: string };

export async function loadCatalogue() {
  const [cfg, agents, websites] = await Promise.all([getVideoConfig(), getAgentsPricing(), getDigitalWebsites()]);
  const def = loadDefaultConfig();
  const rows: CatalogueRow[] = [];

  // Agents IA offers (/agents-ia#tarifs). "Sur devis" stays on quote.
  for (const tier of AGENT_TIERS) {
    const cur = agents.tiers[tier.name];
    if (!cur || tier.price === null) continue;
    rows.push({
      id: `tier:${tier.name}`,
      category: "agents",
      name: `Agents IA — ${tier.name}`,
      detail: tier.desc,
      href: "/agents-ia#tarifs",
      fields: [
        { key: `a:tier:${tier.name}:price`, label: "monthly", value: cur.price ?? 0, default: tier.price, unit: "eurMonth" },
        ...(tier.setupFrom !== null ? [{ key: `a:tier:${tier.name}:setup`, label: "setup" as const, value: cur.setupFrom ?? 0, default: tier.setupFrom, unit: "eur" as const }] : []),
      ],
    });
  }

  // Online subscription (/abonnement → Stripe checkout).
  rows.push(
    { id: "sub:plan", category: "abonnement", name: PLAN.name, detail: PLAN.features.join(" · "), href: "/abonnement", fields: [{ key: "a:plan", label: "monthly", value: agents.planMonthly, default: PLAN.monthlyPrice, unit: "eurMonth" }] },
    { id: "sub:user", category: "abonnement", name: "Utilisateur supplémentaire", detail: "Par utilisateur et par mois", href: "/abonnement", fields: [{ key: "a:user", label: "monthly", value: agents.userPrice, default: 9.9, unit: "eurMonth" }] },
    ...OPTIONS.map((o) => ({
      id: `sub:opt:${o.id}`,
      category: "abonnement" as const,
      name: `Option — ${o.label}`,
      detail: o.info,
      href: "/abonnement",
      fields: [{ key: `a:opt:${o.id}`, label: "monthly" as const, value: agents.options[o.id], default: o.price, unit: "eurMonth" as const }],
    })),
  );

  // Marketing packages (/marketing/forfaits).
  for (const plan of cfg.marketing?.plans ?? []) {
    if (plan.price === null) continue;
    const d = def.marketing?.plans?.find((p) => p.key === plan.key);
    rows.push({
      id: `plan:${plan.key}`,
      category: "marketing",
      name: `Forfait Marketing — ${plan.name}`,
      detail: plan.tagline,
      href: "/marketing/forfaits",
      fields: [
        { key: `v:plan:${plan.key}:price`, label: "monthly", value: plan.price, default: d?.price ?? plan.price, unit: "eurMonth" },
        ...(plan.setupPrice != null ? [{ key: `v:plan:${plan.key}:setup`, label: "setup" as const, value: plan.setupPrice, default: d?.setupPrice ?? plan.setupPrice, unit: "eur" as const }] : []),
      ],
    });
  }

  // Video services ("à partir de" price; duration supplements stay in Prix → durées).
  for (const s of cfg.services) {
    const d = def.services.find((x) => x.slug === s.slug);
    rows.push({
      id: `svc:${s.slug}`,
      category: "videos",
      name: s.name,
      detail: s.unit ? `À partir de · ${s.unit}` : "À partir de",
      href: `/services/${s.slug}`,
      fields: [{ key: `v:svc:${s.slug}`, label: "price", value: s.price, default: d?.price ?? s.price, unit: "eur" }],
    });
  }

  // Video options.
  for (const [id, o] of Object.entries(cfg.options)) {
    rows.push({
      id: `opt:${id}`,
      category: "options",
      name: o.label,
      detail: o.per === "video" ? "Par vidéo" : "Par projet",
      fields: [{ key: `v:opt:${id}`, label: "price", value: o.price, default: def.options[id]?.price ?? o.price, unit: "eur" }],
    });
  }

  // Website setup and monthly running fees (/digital).
  const liveSite = new Map(websites.map((s) => [s.id, s]));
  for (const site of DIGITAL_WEBSITES) {
    const cur = liveSite.get(site.id) ?? site;
    rows.push({
      id: `site:${site.id}`,
      category: "digital",
      name: site.name,
      detail: site.runningFrom === null ? "Mise en place" : "Mise en place et frais de fonctionnement mensuels",
      href: "/digital#sites",
      fields: [
        { key: `d:site:${site.id}:price`, label: "setup", value: cur.price, default: site.price, unit: "eur" },
        ...(site.runningFrom !== null
          ? [{ key: `d:site:${site.id}:running`, label: "monthly" as const, value: cur.runningFrom ?? site.runningFrom, default: site.runningFrom, unit: "eurMonth" as const }]
          : []),
      ],
    });
  }

  // Pricing rules.
  rows.push(
    { id: "rule:deposit", category: "regles", name: "Acompte vidéo", detail: "Pourcentage du devis payé à la réservation", fields: [{ key: "v:deposit", label: "percent", value: cfg.depositPercent, default: def.depositPercent, unit: "pct" }] },
    ...Object.entries(cfg.qtyDiscounts).map(([qty, pct]) => ({
      id: `rule:qty:${qty}`,
      category: "regles" as const,
      name: `Remise ${qty} vidéo${Number(qty) > 1 ? "s" : ""}`,
      detail: "Remise sur quantité (services vidéo)",
      fields: [{ key: `v:qty:${qty}`, label: "percent" as const, value: pct, default: def.qtyDiscounts[qty] ?? pct, unit: "pct" as const }],
    })),
    { id: "rule:annual", category: "regles", name: "Remise paiement annuel", detail: "Abonnement Agents IA, 12 mois payés d'avance", fields: [{ key: "a:annual", label: "percent", value: Math.round(agents.annualDiscount * 100), default: 20, unit: "pct" }] },
  );

  return { rows };
}
