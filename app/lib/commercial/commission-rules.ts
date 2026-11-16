/*
 * Product types and commission rules (handoff page 04). The rates actually applied are those of the
 * commission_rates table (migration 012): the database recomputes every quote / invoice from it, so the values
 * below are only labels and the defaults shown before the table exists.
 *   commission = amount actually collected (HT) × rate of the product type (else the rep's own rate)
 */
export const PRODUCT_TYPES = ["agents", "abonnements", "marketing", "videos", "options", "prestations"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];
export const isProductType = (v: unknown): v is ProductType => PRODUCT_TYPES.includes(v as ProductType);

export const DEFAULT_RATES: Record<ProductType, number> = {
  agents: 15,
  abonnements: 10,
  marketing: 12,
  videos: 10,
  options: 10,
  prestations: 12,
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  agents: "Agents IA (mise en place)",
  abonnements: "Abonnements IA (récurrent)",
  marketing: "Marketing",
  videos: "Vidéos",
  options: "Options supplémentaires",
  prestations: "Prestations ponctuelles",
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
