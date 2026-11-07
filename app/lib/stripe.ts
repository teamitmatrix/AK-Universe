import "server-only";
import Stripe from "stripe";
import { isLang } from "@/config/languages";

let client: Stripe | null = null;

/** Null while STRIPE_SECRET_KEY is not configured, so pages can show a clear message. */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

/** Stripe Checkout locales overlap the site switch; Irish / Hindi / Urdu fall back to English. */
export function checkoutLocale(lang: unknown): Stripe.Checkout.SessionCreateParams.Locale {
  if (!isLang(lang)) return "fr";
  if (lang === "ga" || lang === "hi" || lang === "ur") return "en";
  return lang;
}
