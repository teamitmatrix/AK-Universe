/*
 * Product types and commission rules (handoff page 04). The rates actually applied are those of the
 * commission_rates table (migration 012): the database recomputes every quote / invoice from it, so the values
 * below are only labels and the defaults shown before the table exists.
 *   commission = amount actually collected (HT) × rate of the product type (else the rep's own rate)
 *   optional fixed_commission_cents on a line replaces the % for that line (migration 014)
 *
 * Three business lines only (aligned with the site universes):
 *   agents    — Agents IA (setup + recurring subscriptions)
 *   marketing — Marketing
 *   digital   — Digital (sites, vidéos, options, prestations)
 */
export const PRODUCT_TYPES = ["agents", "marketing", "digital"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const isProductType = (v: unknown): v is ProductType => PRODUCT_TYPES.includes(v as ProductType);

/** Legacy product_type values still present on older devis lines / commission_rates rows. */
export const LEGACY_PRODUCT_TYPES = ["abonnements", "videos", "options", "prestations", "consulting"] as const;

/** When saving Agents IA / Marketing / Digital rates, keep legacy rows in sync for old documents. */
export const RATE_SYNC_ALIASES: Record<ProductType, readonly string[]> = {
  agents: ["abonnements"],
  marketing: [],
  digital: ["videos", "options", "prestations", "consulting"],
};

/** Map a stored / submitted product_type onto the three-line model. */
export function normalizeProductType(v: unknown): ProductType | null {
  if (isProductType(v)) return v;
  if (v === "abonnements") return "agents";
  if (v === "videos" || v === "options" || v === "prestations" || v === "consulting") return "digital";
  return null;
}

export const DEFAULT_RATES: Record<ProductType, number> = {
  agents: 15,
  marketing: 12,
  digital: 10,
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  agents: "Agents IA",
  marketing: "Marketing",
  digital: "Digital",
};

/** Document statuses (quotes: brouillon → en attente → validée / annulée; invoices: brouillon → en attente → payée). */
export const DOC_STATUSES = ["brouillon", "en_attente", "validee", "payee", "annulee"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];
export type DocKind = "devis" | "facture";

/** Next statuses a rep may set, per kind and current status. "payée" creates the commission (pending admin validation). */
export const DOC_TRANSITIONS: Record<DocKind, Partial<Record<DocStatus, DocStatus[]>>> = {
  devis: { brouillon: ["en_attente", "annulee"], en_attente: ["validee", "annulee", "brouillon"] },
  facture: { brouillon: ["en_attente"], en_attente: ["payee", "brouillon"] },
};

export const DOC_STATUS_LABELS: Record<DocKind, Record<DocStatus, string>> = {
  devis: { brouillon: "Brouillon", en_attente: "Envoyé", validee: "Accepté", payee: "—", annulee: "Refusé" },
  facture: { brouillon: "Brouillon", en_attente: "À encaisser", validee: "—", payee: "Payée", annulee: "Annulée" },
};

export const VAT_RATE = 20;
