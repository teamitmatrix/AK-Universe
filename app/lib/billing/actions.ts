"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { checkoutPlan, quoteCheckout, sanitizeSelection, toCents, type Selection } from "@/config/pricing";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { allowedCheckoutMethods } from "@/lib/billing/payment-methods";
import { frenchVatTaxRateId, isFrenchCustomer } from "@/lib/billing/vat";
import { isCountry } from "@/lib/client/countries";
import { checkoutLocale, getStripe } from "@/lib/stripe";
import { ensureProfile } from "@/lib/auth/session";
import { requireClient } from "@/lib/client/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/supabase/env";
import { getPrivacy } from "@/lib/privacy";
import { getTerms } from "@/lib/terms";
import { recordSubscriptionTermsAcceptance } from "@/lib/terms-acceptance";

export async function checkPromoCode(code: string) {
  const stripe = getStripe();
  if (!stripe || !code.trim()) return { valid: false as const };
  const { data } = await stripe.promotionCodes.list({ code: code.trim(), active: true, limit: 1 });
  return data[0] ? { valid: true as const, id: data[0].id } : { valid: false as const };
}

export async function startSubscriptionCheckout(input: {
  planId: string;
  selection: Selection;
  email: string;
  method: string;
  promotionCodeId?: string;
  lang?: string;
  /** ISO country of the bill-to customer — FR/MC → 20 % TVA, else 0 %. */
  country?: string;
  /** Mandatory CGV checkbox — must be true or the checkout is refused. */
  termsAccepted?: boolean;
  /** Mandatory privacy-policy checkbox — must be true or the checkout is refused. */
  privacyAccepted?: boolean;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return { success: false as const, code: "not_configured" as const };
  }
  if (input.termsAccepted !== true || input.privacyAccepted !== true) {
    return { success: false as const, code: "legal_required" as const };
  }

  const selection = sanitizeSelection(input.selection);
  const resume = `/paiement?plan=${encodeURIComponent(input.planId)}&cycle=${selection.cycle}`;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/connexion?redirectTo=${encodeURIComponent(resume)}`);
  await ensureProfile(auth.user);

  // Never trust client totals: recompute from the chosen plan + live catalogue prices.
  const [quoteRates, terms, privacy] = await Promise.all([getAgentsPricing(), getTerms(), getPrivacy()]);
  const plan = checkoutPlan(input.planId, quoteRates);
  if (!plan) return { success: false as const, code: "prepare_failed" as const };
  const quote = quoteCheckout(plan, selection, quoteRates);
  const admin = createAdminClient();
  const termsAcceptedAt = new Date().toISOString();

  // One running subscription per customer: a second checkout would charge twice. Plan / option / cycle changes
  // go through the client space (/client/dashboard/mon-offre) instead.
  const { data: running } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", auth.user.id)
    .in("status", ["active", "past_due"])
    .limit(1);
  if (running?.length) return { success: false as const, code: "already_subscribed" as const };

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
      plan: plan.id,
      cycle: selection.cycle,
      extra_users: selection.users,
      options: selection.options,
      monthly_total_cents: toCents(quote.monthly),
      status: "pending",
      terms_accepted: true,
      terms_version: terms.version,
      terms_label: terms.label,
      terms_accepted_at: termsAcceptedAt,
      privacy_accepted: true,
      privacy_version: privacy.version,
      privacy_label: privacy.label,
      privacy_accepted_at: termsAcceptedAt,
    })
    .select("id")
    .single();
  if (error || !subscription) {
    console.error("subscription insert failed:", error?.message);
    return { success: false as const, code: "prepare_failed" as const };
  }

  const recorded = await recordSubscriptionTermsAcceptance({
    userId: auth.user.id,
    subscriptionId: subscription.id,
    plan: plan.id,
    cycle: selection.cycle,
    extraUsers: selection.users,
    options: selection.options,
    acceptedAt: termsAcceptedAt,
    termsVersion: terms.version,
    termsLabel: terms.label,
    privacyVersion: privacy.version,
    privacyLabel: privacy.label,
  });
  if (!recorded) {
    await admin.from("subscriptions").delete().eq("id", subscription.id);
    return { success: false as const, code: "prepare_failed" as const };
  }

  const site = getSiteUrl();
  const annual = selection.cycle === "annuel";
  const country = isCountry(input.country) ? input.country.toUpperCase() : "FR";
  const applyFrVat = isFrenchCustomer(country);
  const taxRates = applyFrVat ? [await frenchVatTaxRateId(stripe)] : undefined;
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: input.email || auth.user.email,
      client_reference_id: auth.user.id,
      locale: checkoutLocale(input.lang),
      // `card` also enables Apple Pay / Google Pay on Stripe Checkout when wallets are on in the Dashboard.
      allowed_payment_method_types: allowedCheckoutMethods(input.method),
      billing_address_collection: "required",
      line_items: [
        {
          quantity: 1,
          tax_rates: taxRates,
          price_data: {
            currency: "eur",
            unit_amount: toCents(quote.due),
            tax_behavior: "exclusive",
            recurring: { interval: annual ? "year" : "month" },
            product_data: {
              name: `${plan.name} — ${annual ? "annuel" : "mensuel"}`,
              description: plan.features.slice(0, 3).join(" · "),
            },
          },
        },
        ...(quote.setup > 0
          ? [
              {
                quantity: 1,
                tax_rates: taxRates,
                price_data: {
                  currency: "eur" as const,
                  unit_amount: toCents(quote.setup),
                  tax_behavior: "exclusive" as const,
                  product_data: { name: `${plan.name} — mise en place` },
                },
              },
            ]
          : []),
      ],
      discounts: input.promotionCodeId ? [{ promotion_code: input.promotionCodeId }] : undefined,
      metadata: {
        kind: "subscription",
        subscription_id: subscription.id,
        user_id: auth.user.id,
        billing_country: country,
        vat_percent: String(applyFrVat ? 20 : 0),
      },
      subscription_data: { metadata: { subscription_id: subscription.id, user_id: auth.user.id } },
      success_url: `${site}/paiement?success=1`,
      cancel_url: `${site}${resume}`,
    });
  } catch (cause) {
    console.error("Stripe checkout failed:", cause);
    return { success: false as const, code: "method_unavailable" as const };
  }

  await admin.from("subscriptions").update({ stripe_checkout_session_id: session.id }).eq("id", subscription.id);
  redirect(session.url!);
}

/**
 * Stripe's customer portal for the signed-in user's own latest subscription. `returnPath` is a fixed path chosen
 * by the calling action (never by the browser). `flow: "cancel"` opens the portal straight on the cancellation
 * screen of that subscription; if the portal configuration refuses it, the regular portal opens instead.
 */
async function redirectToBillingPortal(returnPath: "/compte" | "/client/dashboard" | "/client/dashboard/facturation", flow?: "cancel" | "payment_method") {
  // Client space: same gate as its pages (active customer, two-factor passed when enabled).
  if (returnPath.startsWith("/client/dashboard")) await requireClient(returnPath);
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/connexion?redirectTo=${returnPath}`);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", auth.user.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!stripe || !subscription?.stripe_customer_id) redirect(`${returnPath}?portal=unavailable`);

  const returnUrl = `${getSiteUrl()}${returnPath}`;
  const base = { customer: subscription.stripe_customer_id, return_url: returnUrl, locale: "auto" as const };
  let url: string;
  try {
    let session: Stripe.BillingPortal.Session | null = null;
    const flowData: Stripe.BillingPortal.SessionCreateParams.FlowData | null =
      flow === "cancel" && subscription.stripe_subscription_id
        ? {
            type: "subscription_cancel",
            subscription_cancel: { subscription: subscription.stripe_subscription_id },
            after_completion: { type: "redirect", redirect: { return_url: returnUrl } },
          }
        : flow === "payment_method"
          ? { type: "payment_method_update", after_completion: { type: "redirect", redirect: { return_url: returnUrl } } }
          : null;
    if (flowData) {
      session = await stripe.billingPortal.sessions.create({ ...base, flow_data: flowData }).catch((cause) => {
        console.error(`Stripe portal flow "${flow}" unavailable, opening the regular portal:`, cause);
        return null;
      });
    }
    session ??= await stripe.billingPortal.sessions.create(base);
    url = session.url;
  } catch (cause) {
    console.error("Stripe billing portal failed:", cause);
    redirect(`${returnPath}?portal=unavailable`);
  }
  redirect(url);
}

/** "Gérer mon abonnement" on compte.html: Stripe's customer portal (cancel, change card, invoices). */
export async function openBillingPortal() {
  await redirectToBillingPortal("/compte");
}

/**
 * "Moyen de paiement → Modifier" on /client/dashboard/facturation: Stripe's secure payment-method screen (add a card /
 * SEPA mandate, replace it, make it the default). Card details never reach this application.
 */
export async function openClientPaymentMethodPortal() {
  await redirectToBillingPortal("/client/dashboard/facturation", "payment_method");
}

/**
 * Client dashboard (/client/dashboard) buttons: manage the plan, invoices (`flow` empty) or cancel (`flow=cancel`).
 * Comes back to /client/dashboard, which re-reads the subscription from Stripe on every request.
 */
export async function openClientBillingPortal(formData: FormData) {
  await redirectToBillingPortal("/client/dashboard", formData.get("flow") === "cancel" ? "cancel" : undefined);
}
