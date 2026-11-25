import "server-only";
import { loadCatalogue } from "@/lib/admin/catalogue";
import type { ProductType } from "./commission-rules";

/*
 * Catalogue offered in the "Nouveau devis / facture" modal — the SAME prices the site sells at
 * (lib/admin/catalogue.ts: site_settings "video_pricing" / "agents_pricing"). Each priced field becomes one line
 * choice, tagged with its product type for the commission rule:
 *   Agents IA (setup + mensuel) → agents · marketing packages → marketing · digital / vidéos / options → digital
 * Line prices are re-read here on the server when a document is saved; the browser may send a discounted
 * unit price that must stay within the admin max-discount cap for that field.
 */

export type SalesCatalogueItem = {
  id: string;
  label: string;
  detail: string;
  productType: ProductType;
  unitCents: number;
  recurring: boolean;
  /** Admin-authorized max discount % (0 = price locked at list). */
  maxDiscountPercent: number;
};

export async function loadSalesCatalogue(): Promise<SalesCatalogueItem[]> {
  const { rows } = await loadCatalogue();
  const items: SalesCatalogueItem[] = [];
  for (const row of rows) {
    if (row.hidden || row.category === "regles") continue;
    for (const field of row.fields) {
      if (field.unit === "pct" || !(field.value > 0)) continue;
      const monthly = field.label === "monthly";
      const type: ProductType =
        row.category === "agents" || row.category === "abonnement" || row.category === "addons"
          ? "agents"
          : row.category === "marketing"
            ? "marketing"
            : "digital";
      const suffix =
        row.fields.length > 1 || row.category === "agents" ? (monthly ? " — abonnement mensuel" : " — mise en place") : "";
      const maxDiscountPercent = monthly
        ? (row.commercial?.maxDiscountMonthly ?? 0)
        : (row.commercial?.maxDiscountSetup ?? 0);
      items.push({
        id: `${row.id}#${field.key}`,
        label: `${row.name}${suffix}`,
        detail: row.detail,
        productType: type,
        unitCents: Math.round(field.value * 100),
        recurring: monthly,
        maxDiscountPercent: Math.min(100, Math.max(0, maxDiscountPercent)),
      });
    }
  }
  return items;
}

export async function catalogueItemById(id: string) {
  return (await loadSalesCatalogue()).find((i) => i.id === id) ?? null;
}
