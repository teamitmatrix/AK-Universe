import type Stripe from "stripe";

/**
 * Stripe Checkout payment methods used by /paiement and deposit checkout.
 *
 * Apple Pay and Google Pay are NOT separate Checkout types — they ship with `card`.
 * They appear on Stripe's hosted Checkout when:
 *   1. Wallets are enabled in the Stripe Dashboard (Settings → Payment methods),
 *   2. The domain is registered for Apple Pay (Dashboard → Apple Pay),
 *   3. The shopper's device/browser supports the wallet and has a card saved.
 *
 * UI "wallet" / Apple Pay / Google Pay buttons therefore start a `card` Checkout Session.
 */
export const CHECKOUT_METHODS: Record<string, Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[]> = {
  card: ["card"],
  wallet: ["card"],
  apple_pay: ["card"],
  google_pay: ["card"],
  sepa: ["sepa_debit"],
  paypal: ["paypal"],
  revolut: ["revolut_pay"],
  satispay: ["satispay"],
};

/** Resolve UI method → Stripe allowed types (defaults to card, which includes wallets). */
export function allowedCheckoutMethods(
  method: string | null | undefined,
): Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] {
  const key = String(method ?? "card").trim().toLowerCase();
  return CHECKOUT_METHODS[key] ?? CHECKOUT_METHODS.card;
}

/** True when the shopper asked for a wallet (Apple Pay / Google Pay) or card. */
export function isCardOrWalletMethod(method: string | null | undefined): boolean {
  const key = String(method ?? "card").trim().toLowerCase();
  return key === "card" || key === "wallet" || key === "apple_pay" || key === "google_pay" || key === "carte";
}
