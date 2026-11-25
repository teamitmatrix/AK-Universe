import "server-only";
import { loadCatalogue, type CatalogueField, type CatalogueRow } from "@/lib/admin/catalogue";
import type { ProductType } from "./commission-rules";

/*
 * Catalogue offered in the "Nouveau devis / facture" modal — the SAME prices the site sells at
 * (lib/admin/catalogue.ts: site_settings "video_pricing" / "agents_pricing"). Each priced field becomes one line
 * choice, tagged with its product type for the commission rule:
 *   Agents IA (mensuel / annuel / mise en place) → agents · marketing → marketing · digital / vidéos → digital
 *
 * Monthly and annual are NEVER mixed on the same line: each cycle is its own catalogue entry so the devis
 * shows either « Mensuel X € HT / mois » or « Annuel Y € HT / an », not both.
 */

export type SalesCatalogueItem = {
  id: string;
  label: string;
  detail: string;
  productType: ProductType;
  unitCents: number;
  recurring: boolean;
  /** Billing cycle for subscription lines (setup / one-off → null). */
  cycle: "mensuel" | "annuel" | null;
  /** Admin-authorized max discount % (0 = price locked at list). */
  maxDiscountPercent: number;
};

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Strip any embedded cycle prices from the row blurb so we can append only the chosen cycle. */
function baseDetail(detail: string) {
  return detail
    .replace(/\s*·\s*Annuel\s+[\d\s.,]+\s*€\s*HT(?:\s*\/\s*an)?/gi, "")
    .replace(/\s*·\s*Mensuel\s+[\d\s.,]+\s*€\s*HT(?:\s*\/\s*mois)?/gi, "")
    .replace(/\s*·\s*Mise en place\s+[\d\s.,]+\s*€\s*HT/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s·\s·/g, " · ")
    .trim();
}

function lineSuffix(field: CatalogueField): string {
  if (field.label === "monthly") return " — abonnement mensuel";
  if (field.label === "annual") return " — abonnement annuel";
  if (field.label === "setup" || field.label === "price") return " — mise en place";
  return "";
}

function lineDetail(row: CatalogueRow, field: CatalogueField): string {
  const base = baseDetail(row.detail);
  if (field.label === "monthly") {
    return [base, `Mensuel ${euros(field.value)} € HT / mois`].filter(Boolean).join(" · ");
  }
  if (field.label === "annual") {
    return [base, `Annuel ${euros(field.value)} € HT / an`].filter(Boolean).join(" · ");
  }
  if (field.label === "setup" || field.label === "price") {
    return [base, `Mise en place ${euros(field.value)} € HT`].filter(Boolean).join(" · ");
  }
  return base || row.detail;
}

function productTypeFor(row: CatalogueRow): ProductType {
  if (row.category === "agents" || row.category === "abonnement" || row.category === "addons") return "agents";
  if (row.category === "marketing") return "marketing";
  return "digital";
}

export async function loadSalesCatalogue(): Promise<SalesCatalogueItem[]> {
  const { rows } = await loadCatalogue();
  const items: SalesCatalogueItem[] = [];
  for (const row of rows) {
    if (row.hidden || row.category === "regles") continue;
    for (const field of row.fields) {
      if (field.unit === "pct" || !(field.value > 0)) continue;
      const monthly = field.label === "monthly";
      const annual = field.label === "annual";
      const recurring = monthly || annual;
      const cycle = monthly ? "mensuel" : annual ? "annuel" : null;
      const needsSuffix =
        row.fields.length > 1 || row.category === "agents" || monthly || annual || field.label === "setup";
      const maxDiscountPercent = recurring
        ? (row.commercial?.maxDiscountMonthly ?? 0)
        : (row.commercial?.maxDiscountSetup ?? 0);
      items.push({
        id: `${row.id}#${field.key}`,
        label: `${row.name}${needsSuffix ? lineSuffix(field) : ""}`,
        detail: lineDetail(row, field).slice(0, 300),
        productType: productTypeFor(row),
        unitCents: Math.round(field.value * 100),
        recurring,
        cycle,
        maxDiscountPercent: Math.min(100, Math.max(0, maxDiscountPercent)),
      });
    }
  }
  return items;
}

export async function catalogueItemById(id: string) {
  return (await loadSalesCatalogue()).find((i) => i.id === id) ?? null;
}
