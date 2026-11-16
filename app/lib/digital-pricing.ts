import "server-only";
import { DIGITAL_WEBSITES, type DigitalWebsite } from "@/config/digital";
import { createPublicClient } from "@/lib/supabase/server";

/**
 * Website prices on /digital = config/digital.ts (defaults) merged with the overrides saved from
 * the admin catalogue (site_settings "digital_pricing"). One edit changes the public page and the chatbot.
 */

export const DIGITAL_PRICING_KEY = "digital_pricing";

export type DigitalPriceOverride = { price?: number; runningFrom?: number | null };
export type DigitalPricingOverrides = { websites?: Record<string, DigitalPriceOverride> };

const isPrice = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function applyDigitalOverrides(o: DigitalPricingOverrides | null | undefined): DigitalWebsite[] {
  return DIGITAL_WEBSITES.map((site) => {
    const over = o?.websites?.[site.id];
    if (!over) return site;
    const price = isPrice(over.price) ? over.price : site.price;
    // A site with no running fee (landing page) stays that way. A saved monthly fee replaces the default.
    let runningFrom = site.runningFrom;
    if (site.runningFrom !== null && isPrice(over.runningFrom)) runningFrom = over.runningFrom;
    return { ...site, price, runningFrom };
  });
}

export async function getDigitalPricingOverrides(): Promise<DigitalPricingOverrides | null> {
  try {
    const { data, error } = await createPublicClient().from("site_settings").select("value").eq("key", DIGITAL_PRICING_KEY).maybeSingle();
    if (error) throw error;
    return (data?.value as DigitalPricingOverrides) ?? null;
  } catch (cause) {
    console.error("Could not load digital pricing overrides:", cause);
    return null;
  }
}

export async function getDigitalWebsites() {
  return applyDigitalOverrides(await getDigitalPricingOverrides());
}
