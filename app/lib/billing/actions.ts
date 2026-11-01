"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { PLAN, computeQuote, sanitizeSelection, toCents, type Selection } from "@/config/pricing";
import { checkoutLocale, getStripe } from "@/lib/stripe";
import { ensureProfile } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";

// Restricts Checkout to the method picked on paiement.html (it must also be enabled in Stripe).
const METHODS: Record<string, Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[]> = {
  card: ["card"],
  sepa: ["sepa_debit"],
  paypal: ["paypal"],
  revolut: ["revolut_pay"],
  satispay: ["satispay"],
};

export async function checkPromoCode(code: string) {
  const stripe = getStripe();
  if (!stripe || !code.trim()) return { valid: false as const };
  const { data } = await stripe.promotionCodes.list({ code: code.trim(), active: true, limit: 1 });
  return data[0] ? { valid: true as const, id: data[0].id } : { valid: false as const };
}

export async function startSubscriptionCheckout(input: {
  selection: Selection;
  email: string;
  method: string;
  promotionCodeId?: string;
  lang?: string;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return { success: false as const, code: "not_configured" as const };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion.html?redirectTo=/abonnement.html");
  await ensureProfile(auth.user);

  // Never trust client totals: recompute from the sanitized selection.
  const selection = sanitizeSelection(input.selection);
  const quote = computeQuote(selection);
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: subscription, error } = await admin
    .from("subscriptions")
    .insert({
      user_id: auth.user.id,
      organization_id: membership?.organization_id ?? null,
      plan: PLAN.id,
      cycle: selection.cycle,
      extra_users: selection.users,
      options: selection.options,
      monthly_total_cents: toCents(quote.monthly),
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !subscription) {
    console.error("subscription insert failed:", error?.message);
    return { success: false as const, code: "prepare_failed" as const };
  }

  const site = getSiteUrl();
  const annual = selection.cycle === "annuel";
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.email || auth.user.email,
      client_reference_id: auth.user.id,
      locale: checkoutLocale(input.lang),
      allowed_payment_method_types: METHODS[input.method] ?? METHODS.card,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: toCents(quote.due),
            recurring: { interval: annual ? "year" : "month" },
            product_data: {
              name: `${PLAN.name} — ${annual ? "annuel" : "mensuel"}`,
              description: `${selection.users} utilisateur(s) supplémentaire(s), ${selection.options.length} option(s)`,
            },
          },
        },
      ],
      discounts: input.promotionCodeId ? [{ promotion_code: input.promotionCodeId }] : undefined,
      metadata: { kind: "subscription", subscription_id: subscription.id, user_id: auth.user.id },
      subscription_data: { metadata: { subscription_id: subscription.id, user_id: auth.user.id } },
      success_url: `${site}/paiement.html?success=1`,
      cancel_url: `${site}/abonnement.html`,
    });
  } catch (cause) {
    console.error("Stripe checkout failed:", cause);
    return { success: false as const, code: "method_unavailable" as const };
  }

  await admin.from("subscriptions").update({ stripe_checkout_session_id: session.id }).eq("id", subscription.id);
  redirect(session.url!);
}

/** "Gérer mon abonnement" on compte.html: Stripe's customer portal (cancel, change card, invoices). */
export async function openBillingPortal() {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion.html?redirectTo=/compte.html");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", auth.user.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!stripe || !subscription?.stripe_customer_id) redirect("/compte.html?portal=unavailable");

  let url: string;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${getSiteUrl()}/compte.html`,
      locale: "auto",
    });
    url = session.url;
  } catch (cause) {
    console.error("Stripe billing portal failed:", cause);
    redirect("/compte.html?portal=unavailable");
  }
  redirect(url);
}
