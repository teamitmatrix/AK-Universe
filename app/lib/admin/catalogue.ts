import "server-only";
import { DIGITAL_WEBSITES } from "@/config/digital";
import { AGENT_TIERS, OPTIONS, PLAN } from "@/config/pricing";
import { getAgentsCatalog } from "@/lib/agents-catalog";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getCatalogueCommercial, type CatalogueCommercialEntry } from "@/lib/catalogue-commercial";
import { applyDigitalOverrides, getDigitalPricingOverrides } from "@/lib/digital-pricing";
import { applyOverrides, getPricingOverrides, loadDefaultConfig } from "@/lib/video-config";

/**
 * One row per priced item sold on the site, with its current (merged) and default values.
 * The prices themselves live where the site already reads them:
 *   video services, options, deposit, quantity discounts, marketing packages → site_settings "video_pricing"
 *   Agents IA tiers, subscription, extra user, annual discount, options      → site_settings "agents_pricing"
 *   website setup and monthly running fees                                   → site_settings "digital_pricing"
 * Cost prices + max authorized discounts                                    → site_settings "catalogue_commercial"
 * Field keys are stable ids understood by saveCatalogue() (catalogue-actions.ts).
 */

export type CatalogueCategory = "agents" | "abonnement" | "marketing" | "videos" | "options" | "digital" | "regles";
export type CatalogueField = { key: string; label: "price" | "setup" | "percent" | "monthly"; value: number; default: number; unit: "eur" | "eurMonth" | "pct" };

/** Cost + discount caps for rows that sell in € (not percent rules). */
export type CatalogueCommercial = {
  hasMonthly: boolean;
  hasSetup: boolean;
  costMonthly: number | null;
  costSetup: number | null;
  maxDiscountMonthly: number;
  maxDiscountSetup: number;
};

export type CatalogueRow = {
  id: string;
  category: CatalogueCategory;
  name: string;
  detail: string;
  /** Config defaults (before admin name/detail overrides). */
  defaultName: string;
  defaultDetail: string;
  fields: CatalogueField[];
  href?: string;
  commercial: CatalogueCommercial | null;
  /** Soft-deleted in admin; still listed so it can be restored. */
  hidden: boolean;
  /** Name/detail may be edited (all rows). Soft-delete is blocked for pricing rules. */
  canDelete: boolean;
};

function withCommercial(id: string, fields: CatalogueField[], meta: CatalogueCommercialEntry | undefined): CatalogueCommercial | null {
  if (fields.every((f) => f.unit === "pct")) return null;
  const hasMonthly = fields.some((f) => f.label === "monthly");
  // One-off "price" sits in the set-up / mise-en-place column (same as explicit setup).
  const hasSetup = fields.some((f) => f.label === "setup" || f.label === "price");
  return {
    hasMonthly,
    hasSetup,
    costMonthly: hasMonthly ? (meta?.costMonthly ?? null) : null,
    costSetup: hasSetup ? (meta?.costSetup ?? null) : null,
    maxDiscountMonthly: hasMonthly ? (meta?.maxDiscountMonthly ?? 0) : 0,
    maxDiscountSetup: hasSetup ? (meta?.maxDiscountSetup ?? 0) : 0,
  };
}

function row(
  base: Omit<CatalogueRow, "commercial" | "defaultName" | "defaultDetail" | "hidden" | "canDelete">,
  meta: CatalogueCommercialEntry | undefined,
): CatalogueRow {
  return {
    ...base,
    defaultName: base.name,
    defaultDetail: base.detail,
    name: meta?.name?.trim() || base.name,
    detail: meta?.detail?.trim() || base.detail,
    hidden: meta?.hidden === true,
    canDelete: base.category !== "regles",
    commercial: withCommercial(base.id, base.fields, meta),
  };
}

export async function loadCatalogue() {
  // Use unfiltered catalogues so soft-deleted rows stay visible for restore in admin.
  const [pricingOverrides, agents, digitalOverrides, commercial, customAgents] = await Promise.all([
    getPricingOverrides(),
    getAgentsPricing(),
    getDigitalPricingOverrides(),
    getCatalogueCommercial(),
    getAgentsCatalog(),
  ]);
  const def = loadDefaultConfig();
  const cfg = applyOverrides(loadDefaultConfig(), pricingOverrides);
  const websites = applyDigitalOverrides(digitalOverrides);
  const rows: CatalogueRow[] = [];
  const meta = (id: string) => commercial[id];

  // Admin-created Agents IA services (Catalogue + button) — always under Agents IA.
  for (const agent of customAgents) {
    const id = `agent:${agent.id}`;
    const fields: CatalogueField[] = [];
    if (agent.priceMonthly != null) {
      fields.push({
        key: `s:agent:${agent.id}:price`,
        label: "monthly",
        value: agent.priceMonthly,
        default: agent.priceMonthly,
        unit: "eurMonth",
      });
    }
    if (agent.setupFrom != null) {
      fields.push({
        key: `s:agent:${agent.id}:setup`,
        label: "setup",
        value: agent.setupFrom,
        default: agent.setupFrom,
        unit: "eur",
      });
    }
    if (!fields.length) {
      fields.push({
        key: `s:agent:${agent.id}:price`,
        label: "monthly",
        value: 0,
        default: 0,
        unit: "eurMonth",
      });
    }
    const built = row(
      {
        id,
        category: "agents",
        name: `Agent IA — ${agent.name}`,
        detail: agent.published ? `${agent.role} · Publié` : `${agent.role} · Brouillon`,
        href: `/agents-ia/${agent.id}`,
        fields,
      },
      meta(id),
    );
    if (!agent.published) built.hidden = true;
    rows.push(built);
  }

  // Agents IA offers (/agents-ia#tarifs). "Sur devis" stays on quote.
  for (const tier of AGENT_TIERS) {
    const cur = agents.tiers[tier.name];
    if (!cur || tier.price === null) continue;
    const id = `tier:${tier.name}`;
    const annualNote =
      "priceAnnual" in tier && tier.priceAnnual != null
        ? ` · Annuel ${tier.priceAnnual.toLocaleString("fr-FR")} € HT`
        : "";
    rows.push(
      row(
        {
          id,
          category: "agents",
          name: `Agents IA — ${tier.name}`,
          detail: `${tier.features.slice(0, 3).join(" · ")}${annualNote}`,
          href: "/agents-ia#tarifs",
          fields: [
            { key: `a:tier:${tier.name}:price`, label: "monthly", value: cur.price ?? 0, default: tier.price, unit: "eurMonth" },
            ...(tier.setupFrom !== null
              ? [{ key: `a:tier:${tier.name}:setup`, label: "setup" as const, value: cur.setupFrom ?? 0, default: tier.setupFrom, unit: "eur" as const }]
              : []),
          ],
        },
        meta(id),
      ),
    );
  }

  // Online subscription (/abonnement → Stripe checkout).
  for (const base of [
    {
      id: "sub:plan",
      category: "abonnement" as const,
      name: PLAN.name,
      detail: PLAN.features.join(" · "),
      href: "/abonnement",
      fields: [{ key: "a:plan", label: "monthly" as const, value: agents.planMonthly, default: PLAN.monthlyPrice, unit: "eurMonth" as const }],
    },
    {
      id: "sub:user",
      category: "abonnement" as const,
      name: "Utilisateur supplémentaire",
      detail: "Par utilisateur et par mois",
      href: "/abonnement",
      fields: [{ key: "a:user", label: "monthly" as const, value: agents.userPrice, default: 9.9, unit: "eurMonth" as const }],
    },
    ...OPTIONS.map((o) => ({
      id: `sub:opt:${o.id}`,
      category: "abonnement" as const,
      name: `Option — ${o.label}`,
      detail: o.info,
      href: "/abonnement",
      fields: [{ key: `a:opt:${o.id}`, label: "monthly" as const, value: agents.options[o.id], default: o.price, unit: "eurMonth" as const }],
    })),
  ]) {
    rows.push(row(base, meta(base.id)));
  }

  // Marketing packages (/marketing/forfaits).
  for (const plan of cfg.marketing?.plans ?? []) {
    if (plan.price === null) continue;
    const d = def.marketing?.plans?.find((p) => p.key === plan.key);
    const id = `plan:${plan.key}`;
    rows.push(
      row(
        {
          id,
          category: "marketing",
          name: `Forfait Marketing — ${plan.name}`,
          detail: plan.tagline,
          href: "/marketing/forfaits",
          fields: [
            { key: `v:plan:${plan.key}:price`, label: "monthly", value: plan.price, default: d?.price ?? plan.price, unit: "eurMonth" },
            ...(plan.setupPrice != null
              ? [{ key: `v:plan:${plan.key}:setup`, label: "setup" as const, value: plan.setupPrice, default: d?.setupPrice ?? plan.setupPrice, unit: "eur" as const }]
              : []),
          ],
        },
        meta(id),
      ),
    );
  }

  // Video services ("à partir de" price; duration supplements stay in Prix → durées).
  for (const s of cfg.services) {
    const d = def.services.find((x) => x.slug === s.slug);
    const id = `svc:${s.slug}`;
    rows.push(
      row(
        {
          id,
          category: "videos",
          name: s.name,
          detail: s.unit ? `À partir de · ${s.unit}` : "À partir de",
          href: `/services/${s.slug}`,
          fields: [{ key: `v:svc:${s.slug}`, label: "price", value: s.price, default: d?.price ?? s.price, unit: "eur" }],
        },
        meta(id),
      ),
    );
  }

  // Video options.
  for (const [oid, o] of Object.entries(cfg.options)) {
    const id = `opt:${oid}`;
    rows.push(
      row(
        {
          id,
          category: "options",
          name: o.label,
          detail: o.per === "video" ? "Par vidéo" : "Par projet",
          fields: [{ key: `v:opt:${oid}`, label: "price", value: o.price, default: def.options[oid]?.price ?? o.price, unit: "eur" }],
        },
        meta(id),
      ),
    );
  }

  // Website setup and monthly running fees (/digital).
  const liveSite = new Map(websites.map((s) => [s.id, s]));
  for (const site of DIGITAL_WEBSITES) {
    const cur = liveSite.get(site.id) ?? site;
    const id = `site:${site.id}`;
    rows.push(
      row(
        {
          id,
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
        },
        meta(id),
      ),
    );
  }

  // Pricing rules (percent only — no cost / margin / max-discount columns).
  for (const base of [
    {
      id: "rule:deposit",
      category: "regles" as const,
      name: "Acompte vidéo",
      detail: "Pourcentage du devis payé à la réservation",
      fields: [{ key: "v:deposit", label: "percent" as const, value: cfg.depositPercent, default: def.depositPercent, unit: "pct" as const }],
    },
    ...Object.entries(cfg.qtyDiscounts).map(([qty, pct]) => ({
      id: `rule:qty:${qty}`,
      category: "regles" as const,
      name: `Remise ${qty} vidéo${Number(qty) > 1 ? "s" : ""}`,
      detail: "Remise sur quantité (services vidéo)",
      fields: [{ key: `v:qty:${qty}`, label: "percent" as const, value: pct, default: def.qtyDiscounts[qty] ?? pct, unit: "pct" as const }],
    })),
    {
      id: "rule:annual",
      category: "regles" as const,
      name: "Remise paiement annuel",
      detail: "Abonnement Agents IA, 12 mois payés d'avance",
      fields: [{ key: "a:annual", label: "percent" as const, value: Math.round(agents.annualDiscount * 100), default: 20, unit: "pct" as const }],
    },
  ]) {
    rows.push(row(base, undefined));
  }

  return { rows, customAgents };
}
