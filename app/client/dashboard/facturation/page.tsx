import type { Metadata } from "next";
import { BillingView } from "@/components/client/BillingView";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { loadClientBilling } from "@/lib/client/billing";
import { COUNTRIES, countryLabel } from "@/lib/client/countries";
import { requireClient } from "@/lib/client/session";

export const metadata: Metadata = { title: { absolute: "Facturation — AK Universe" } };

/**
 * "Facturation": next payment, amount and billing cycle, payment method (Stripe), invoices, contract and billing
 * details. `?avant=<invoice id>` = older invoices. `?portal=unavailable` = the Stripe portal could not open.
 */
export default async function BillingPage({ searchParams }: { searchParams: Promise<{ avant?: string; portal?: string }> }) {
  const me = await requireClient("/dashboard/facturation");
  const { avant, portal } = await searchParams;
  const [data, pricing] = await Promise.all([loadClientBilling(me, { before: avant }), getAgentsPricing()]);
  const discount = Math.round(pricing.annualDiscount * 100);
  return (
    <BillingView
      data={data}
      countries={COUNTRIES}
      countryName={countryLabel(data.profile.country)}
      discountLabel={discount > 0 ? `-${discount} %` : null}
      portalUnavailable={portal === "unavailable"}
      before={avant && /^in_[A-Za-z0-9]+$/.test(avant) ? avant : null}
    />
  );
}
