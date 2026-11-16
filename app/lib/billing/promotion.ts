import type Stripe from "stripe";

/**
 * One promotion code, checked the same way at subscription checkout and at video-deposit checkout.
 * Stripe stores the code. We refuse it unless:
 *   - it is active, and its start (metadata.starts_at), expiry and redemption cap still allow a use
 *   - metadata.target matches this cart: "video" only for a video deposit; "tous" | "mensuel" | "annuel" only for that subscription cycle
 */

export type PromoCart = { kind: "subscription"; cycle: "mensuel" | "annuel" } | { kind: "video" };

const couponOf = (p: Stripe.PromotionCode) => (typeof p.promotion?.coupon === "object" ? p.promotion.coupon : null);

export function promotionMatches(p: Stripe.PromotionCode, cart: PromoCart, now = Date.now() / 1000) {
  if (!p.active) return false;
  const coupon = couponOf(p);
  if (coupon && coupon.valid === false) return false;
  const startsAt = Number(p.metadata?.starts_at) || 0;
  if (startsAt > now) return false;
  const expiresAt = p.expires_at ?? coupon?.redeem_by ?? null;
  if (expiresAt && expiresAt <= now) return false;
  const cap = p.max_redemptions ?? coupon?.max_redemptions ?? null;
  if (cap !== null && p.times_redeemed >= cap) return false;
  if (coupon?.max_redemptions != null && coupon.times_redeemed >= coupon.max_redemptions) return false;

  const target = p.metadata?.target || "tous";
  if (cart.kind === "video") return target === "video";
  return target === "tous" || target === cart.cycle;
}

/** Looks the customer-facing code up in Stripe and returns it only when this cart may use it. */
export async function findAllowedPromotion(stripe: Stripe, code: string, cart: PromoCart) {
  const trimmed = code.trim();
  if (!trimmed || trimmed.length > 40) return null;
  try {
    const { data } = await stripe.promotionCodes.list({ code: trimmed, active: true, limit: 1, expand: ["data.promotion.coupon"] });
    const promo = data[0];
    return promo && promotionMatches(promo, cart) ? promo : null;
  } catch (cause) {
    console.error("promotion lookup failed:", cause instanceof Error ? cause.message : cause);
    return null;
  }
}
