"use server";

import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isCountry, taxTypeFor } from "./countries";
import { getClientMe } from "./session";

/*
 * "Informations de facturation" (/dashboard/facturation). Server action = public endpoint: it re-checks the caller,
 * validates every field, writes ONLY the caller's own billing_profiles row (service role, user_id from the verified
 * session) and mirrors the details to their Stripe customer, so the next invoices carry them.
 * Order: Stripe first (it validates the VAT number), then the database — a refused VAT number saves nothing.
 */

export type BillingInput = {
  fullName?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  taxId?: string;
  email?: string;
};

type Fail = { success: false; error: "forbidden" | "invalid" | "notReady" | "tax_invalid" | "failed"; field?: keyof BillingInput };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function saveBillingProfile(input: BillingInput): Promise<{ success: true } | Fail> {
  const me = await getClientMe();
  if (!me) return { success: false, error: "forbidden" };

  const v = {
    fullName: clean(input.fullName, 120),
    company: clean(input.company, 120),
    addressLine1: clean(input.addressLine1, 160),
    addressLine2: clean(input.addressLine2, 160),
    postalCode: clean(input.postalCode, 20),
    city: clean(input.city, 80),
    country: clean(input.country, 2).toUpperCase(),
    taxId: clean(input.taxId, 32).replace(/[\s.-]/g, "").toUpperCase(),
    email: clean(input.email, 254).toLowerCase(),
  };
  if (!v.fullName) return { success: false, error: "invalid", field: "fullName" };
  if (!v.addressLine1) return { success: false, error: "invalid", field: "addressLine1" };
  if (!v.postalCode) return { success: false, error: "invalid", field: "postalCode" };
  if (!v.city) return { success: false, error: "invalid", field: "city" };
  if (!isCountry(v.country)) return { success: false, error: "invalid", field: "country" };
  if (!EMAIL.test(v.email)) return { success: false, error: "invalid", field: "email" };
  if (v.taxId && !/^[A-Z0-9]{4,20}$/.test(v.taxId)) return { success: false, error: "invalid", field: "taxId" };

  // Table from migration 017 must exist before anything is sent to Stripe.
  const supabase = await createClient();
  const probe = await supabase.from("billing_profiles").select("user_id").eq("user_id", me.id).maybeSingle();
  if (probe.error) return { success: false, error: "notReady" };

  // Stripe customer of the caller's latest subscription (own rows only, RLS).
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", me.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const customerId = (sub?.stripe_customer_id as string | undefined) ?? null;
  const stripe = getStripe();

  if (stripe && customerId) {
    try {
      await stripe.customers.update(customerId, {
        // Invoices show the customer name: the company when there is one, else the person.
        name: v.company || v.fullName,
        email: v.email,
        address: { line1: v.addressLine1, line2: v.addressLine2 || undefined, postal_code: v.postalCode, city: v.city, country: v.country },
        metadata: { billing_contact: v.fullName, company: v.company },
      });

      // VAT number on the invoices: replace the customer's tax ids when it changed.
      const type = taxTypeFor(v.country);
      const existing = await stripe.customers.listTaxIds(customerId, { limit: 10 });
      const same = existing.data.length === (v.taxId && type ? 1 : 0) && (!v.taxId || existing.data[0]?.value.replace(/[\s.-]/g, "").toUpperCase() === v.taxId);
      if (!same) {
        if (v.taxId && type) {
          // Create first: if Stripe refuses the number, the previous one stays and nothing is saved.
          try {
            await stripe.customers.createTaxId(customerId, { type, value: v.taxId });
          } catch (cause) {
            if (cause instanceof Stripe.errors.StripeInvalidRequestError) return { success: false, error: "tax_invalid", field: "taxId" };
            throw cause;
          }
        }
        for (const t of existing.data) await stripe.customers.deleteTaxId(customerId, t.id);
      }
    } catch (cause) {
      console.error("Billing profile: Stripe sync failed:", cause);
      return { success: false, error: "failed" };
    }
  }

  const { error } = await createAdminClient()
    .from("billing_profiles")
    .upsert(
      {
        user_id: me.id,
        full_name: v.fullName,
        company: v.company || null,
        address_line1: v.addressLine1,
        address_line2: v.addressLine2 || null,
        postal_code: v.postalCode,
        city: v.city,
        country: v.country,
        tax_id: v.taxId || null,
        email: v.email,
      },
      { onConflict: "user_id" }
    );
  if (error) {
    console.error("Billing profile: save failed:", error.message);
    return { success: false, error: "failed" };
  }
  // Shown on Facturation and Mon compte (same record).
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
