import type Stripe from "stripe";

/**
 * Subscription checkout VAT: France (and Monaco, same VAT system) → 20 %.
 * Everywhere else → 0 % (outside France).
 * Catalogue and devis amounts stay HT; VAT is added at paiement / Stripe Checkout.
 */
export const FRANCE_VAT_PERCENT = 20;

export function isFrenchCustomer(country: string | null | undefined): boolean {
  const c = String(country ?? "")
    .trim()
    .toUpperCase();
  return c === "FR" || c === "MC";
}

export function vatPercentForCountry(country: string | null | undefined): number {
  return isFrenchCustomer(country) ? FRANCE_VAT_PERCENT : 0;
}

/** VAT in cents from an HT amount in cents. */
export function vatCentsFromHt(htCents: number, country: string | null | undefined): number {
  const pct = vatPercentForCountry(country);
  if (!pct || !Number.isFinite(htCents) || htCents <= 0) return 0;
  return Math.round((htCents * pct) / 100);
}

/** Reuse or create a 20 % FR exclusive tax rate for Stripe Checkout line items. */
export async function frenchVatTaxRateId(stripe: Stripe): Promise<string> {
  const { data } = await stripe.taxRates.list({ active: true, limit: 100 });
  const existing = data.find(
    (r) => r.percentage === FRANCE_VAT_PERCENT && !r.inclusive && (r.country === "FR" || !r.country) && /tva|vat|france/i.test(`${r.display_name} ${r.description ?? ""}`),
  );
  if (existing) return existing.id;
  const created = await stripe.taxRates.create({
    display_name: "TVA",
    description: "TVA France 20 %",
    percentage: FRANCE_VAT_PERCENT,
    inclusive: false,
    country: "FR",
    jurisdiction: "FR",
  });
  return created.id;
}
