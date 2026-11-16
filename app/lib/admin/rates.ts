import "server-only";
import { DEFAULT_RATES, isProductType, type ProductType } from "@/lib/commercial/commission-rules";
import { createClient } from "@/lib/supabase/server";

/** Rates the database applies to the next saved quote or invoice. `ready` is false when the table is missing. */
export async function loadCommissionRates(): Promise<{ ready: boolean; rates: Record<ProductType, number> }> {
  const rates = { ...DEFAULT_RATES };
  const { data, error } = await (await createClient()).from("commission_rates").select("product_type, rate");
  if (error) return { ready: false, rates };
  for (const row of data ?? []) {
    if (isProductType(row.product_type)) rates[row.product_type] = Number(row.rate);
  }
  return { ready: true, rates };
}
