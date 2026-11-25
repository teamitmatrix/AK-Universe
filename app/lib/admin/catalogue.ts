import "server-only";
import { AGENT_SUBSCRIPTIONS, agentAnnualFromMonthly } from "@/config/agent-subscriptions";
import { agents as staticAgents } from "@/config/agents";
import { DIGITAL_WEBSITES } from "@/config/digital";
import { AGENT_ADDON_LIST, isAddonId } from "@/config/agent-addons";
import { AGENT_TIERS, OPTIONS, PLAN, isRetiredOption } from "@/config/pricing";
import { getAgentsCatalog } from "@/lib/agents-catalog";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getCatalogueCommercial, type CatalogueCommercialEntry } from "@/lib/catalogue-commercial";
import { applyDigitalOverrides, getDigitalPricingOverrides } from "@/lib/digital-pricing";
import { applyOverrides, getPricingOverrides, loadDefaultConfig } from "@/lib/video-config";

/**
 * One row per priced item sold on the site, with its current (merged) and default values.
 * The prices themselves live where the site already reads them:
 *   video services, options, deposit, quantity discounts, marketing packages → site_settings "video_pricing"
 *   Agents IA tiers, solo, add-ons, subscription, options, annual discount → site_settings "agents_pricing"
 *   website setup and monthly running fees                                   → site_settings "digital_pricing"
 * Cost prices + max authorized discounts                                    → site_settings "catalogue_commercial"
 * Field keys are stable ids understood by saveCatalogue() (catalogue-actions.ts).
 */

export type CatalogueCategory = "agents" | "addons" | "abonnement" | "marketing" | "videos" | "options" | "digital" | "regles";
export type CatalogueField = {
  key: string;
  label: "price" | "setup" | "percent" | "monthly" | "annual";
  value: number;
  default: number;
  unit: "eur" | "eurMonth" | "eurYear" | "pct";
};

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
  // Monthly + annual share the "recurring" commercial caps (cost / max discount).
  const hasMonthly = fields.some((f) => f.label === "monthly" || f.label === "annual");
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

  // Solo Agents IA subscriptions (cards on /agents-ia).
  for (const agent of staticAgents) {
    const def = AGENT_SUBSCRIPTIONS[agent.id];
    if (!def) continue;
    const stored = agents.solo[agent.id];
    const livePrice = stored?.price ?? def.price;
    const liveAnnual = stored?.priceAnnual ?? def.priceAnnual;
    const liveSetup = stored?.setupFrom ?? def.setupFrom;
    const id = `solo:${agent.id}`;
    rows.push(
      row(
        {
          id,
          category: "agents",
          name: `Agent IA — ${agent.name}`,
          // Facts only — cycle prices are separate catalogue fields (mensuel / annuel / mise en place).
          detail: `${def.credits} · ${def.capacity}`,
          href: `/agents-ia/${agent.id}`,
          fields: [
            {
              key: `a:solo:${agent.id}:price`,
              label: "monthly",
              value: livePrice,
              default: def.price,
              unit: "eurMonth",
            },
            {
              key: `a:solo:${agent.id}:annual`,
              label: "annual",
              value: liveAnnual,
              default: def.priceAnnual,
              unit: "eurYear",
            },
            {
              key: `a:solo:${agent.id}:setup`,
              label: "setup",
              value: liveSetup,
              default: def.setupFrom,
              unit: "eur",
            },
          ],
        },
        meta(id),
      ),
    );
  }

  // Admin-created Agents IA services (Catalogue + button) — always under Agents IA.
  for (const agent of customAgents) {
    const id = `agent:${agent.id}`;
    const fields: CatalogueField[] = [];
    const monthly = agent.priceMonthly ?? 0;
    const annual = agentAnnualFromMonthly(monthly);
    const setup = agent.setupFrom ?? 199;
    fields.push({
      key: `s:agent:${agent.id}:price`,
      label: "monthly",
      value: monthly,
      default: monthly,
      unit: "eurMonth",
    });
    if (annual > 0) {
      fields.push({
        key: `s:agent:${agent.id}:annual`,
        label: "annual",
        value: annual,
        default: annual,
        unit: "eurYear",
      });
    }
    fields.push({
      key: `s:agent:${agent.id}:setup`,
      label: "setup",
      value: setup,
      default: setup,
      unit: "eur",
    });
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
    const setupValue = tier.setupFrom !== null ? (cur.setupFrom ?? tier.setupFrom) : null;
    const annualValue = "priceAnnual" in tier && tier.priceAnnual != null ? tier.priceAnnual : null;
    rows.push(
      row(
        {
          id,
          category: "agents",
          name: `Agents IA — ${tier.name}`,
          // Features only — mensuel / annuel / mise en place are separate lines in devis.
          detail: tier.features.slice(0, 3).join(" · "),
          href: "/agents-ia#tarifs",
          fields: [
            { key: `a:tier:${tier.name}:price`, label: "monthly", value: cur.price ?? 0, default: tier.price, unit: "eurMonth" },
            ...(annualValue != null
              ? [
                  {
                    key: `a:tier:${tier.name}:annual`,
                    label: "annual" as const,
                    value: annualValue,
                    default: annualValue,
                    unit: "eurYear" as const,
                  },
                ]
              : []),
            ...(setupValue != null
              ? [{ key: `a:tier:${tier.name}:setup`, label: "setup" as const, value: setupValue, default: tier.setupFrom!, unit: "eur" as const }]
              : []),
          ],
        },
        meta(id),
      ),
    );
  }

  // Pay-as-you-go packs + monthly AI add-ons (solo plans and packages).
  for (const addon of AGENT_ADDON_LIST) {
    const id = `addon:${addon.id}`;
    const live = (isAddonId(addon.id) ? agents.addons[addon.id] : undefined) ?? addon.price;
    const rangeNote =
      addon.priceMax != null && addon.priceMax > live
        ? ` · Fourchette jusqu'à ${addon.priceMax.toLocaleString("fr-FR")} € HT`
        : "";
    const monthly = addon.billing === "month";
    rows.push(
      row(
        {
          id,
          category: "addons",
          name: `Add-on — ${addon.label}`,
          detail: `${addon.detail}${rangeNote}`,
          href: "/agents-ia#addons",
          fields: [
            {
              key: `a:addon:${addon.id}`,
              label: monthly ? "monthly" : "price",
              value: live,
              default: addon.price,
              unit: monthly ? "eurMonth" : "eur",
            },
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
      href: "/agents-ia#tarifs",
      fields: [{ key: "a:plan", label: "monthly" as const, value: agents.planMonthly, default: PLAN.monthlyPrice, unit: "eurMonth" as const }],
    },
    {
      id: "sub:user",
      category: "abonnement" as const,
      name: "Utilisateur supplémentaire",
      detail: "Par utilisateur et par mois",
      href: "/agents-ia#tarifs",
      fields: [{ key: "a:user", label: "monthly" as const, value: agents.userPrice, default: 9.9, unit: "eurMonth" as const }],
    },
    ...OPTIONS.map((o) => ({
      id: `sub:opt:${o.id}`,
      category: "abonnement" as const,
      name: `Option — ${o.label}${isRetiredOption(o) ? " (plus proposée, abonnés existants)" : ""}`,
      detail: o.info,
      href: "/agents-ia#tarifs",
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
    const setupPrice = plan.setupPrice ?? null;
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
            ...(setupPrice != null
              ? [{ key: `v:plan:${plan.key}:setup`, label: "setup" as const, value: setupPrice, default: d?.setupPrice ?? setupPrice, unit: "eur" as const }]
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
          detail:
            site.runningFrom === null
              ? `Mise en place ${cur.price.toLocaleString("fr-FR")} € HT`
              : `Mise en place ${cur.price.toLocaleString("fr-FR")} € HT · Fonctionnement dès ${(cur.runningFrom ?? site.runningFrom!).toLocaleString("fr-FR")} € HT / mois`,
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
