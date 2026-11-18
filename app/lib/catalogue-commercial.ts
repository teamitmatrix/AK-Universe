import "server-only";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Admin commercial meta for catalogue rows (cost prices + max authorized discounts).
 * Stored in site_settings "catalogue_commercial", keyed by catalogue row id.
 * Selling prices stay in video_pricing / agents_pricing / digital_pricing.
 */

export const CATALOGUE_COMMERCIAL_KEY = "catalogue_commercial";

export type CatalogueCommercialEntry = {
  costMonthly?: number;
  costSetup?: number;
  /** 0–100. Cap a sales rep may apply on the monthly / recurring selling price. */
  maxDiscountMonthly?: number;
  /** 0–100. Cap on the set-up / one-off selling price. */
  maxDiscountSetup?: number;
};

export type CatalogueCommercialMap = Record<string, CatalogueCommercialEntry>;

const isMoney = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1_000_000;
const isPct = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;

export function sanitizeCommercialMap(raw: unknown): CatalogueCommercialMap {
  if (!raw || typeof raw !== "object") return {};
  const out: CatalogueCommercialMap = {};
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!id || id.startsWith("_") || !entry || typeof entry !== "object") continue;
    const e = entry as CatalogueCommercialEntry;
    const clean: CatalogueCommercialEntry = {};
    if (isMoney(e.costMonthly)) clean.costMonthly = Math.round(e.costMonthly * 100) / 100;
    if (isMoney(e.costSetup)) clean.costSetup = Math.round(e.costSetup * 100) / 100;
    if (isPct(e.maxDiscountMonthly)) clean.maxDiscountMonthly = Math.round(e.maxDiscountMonthly * 100) / 100;
    if (isPct(e.maxDiscountSetup)) clean.maxDiscountSetup = Math.round(e.maxDiscountSetup * 100) / 100;
    if (Object.keys(clean).length) out[id] = clean;
  }
  return out;
}

export async function getCatalogueCommercial(): Promise<CatalogueCommercialMap> {
  try {
    const { data, error } = await createPublicClient()
      .from("site_settings")
      .select("value")
      .eq("key", CATALOGUE_COMMERCIAL_KEY)
      .maybeSingle();
    if (error) throw error;
    return sanitizeCommercialMap(data?.value);
  } catch (cause) {
    console.error("Could not load catalogue commercial meta:", cause);
    return {};
  }
}

export function marginEuro(sell: number, cost: number | null | undefined): number | null {
  if (cost == null || !Number.isFinite(cost) || !Number.isFinite(sell)) return null;
  return Math.round((sell - cost) * 100) / 100;
}

/** Margin rate (%) = margin € ÷ cost × 100. Null when cost is 0 / missing. */
export function marginRate(sell: number, cost: number | null | undefined): number | null {
  if (cost == null || !(cost > 0) || !Number.isFinite(sell)) return null;
  return Math.round(((sell - cost) / cost) * 10000) / 100;
}
