import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * Discount codes = Stripe promotion codes (the same ones /paiement already validates). No local copy:
 * Stripe holds the code, the reduction, the expiry, the usage cap and the live usage counter.
 * Our two extra rules live in the promotion code metadata and are enforced on the server at checkout
 * (lib/billing/actions.ts → validatePromotion):
 *   metadata.starts_at  unix seconds — not usable before (scheduled promotion)
 *   metadata.target     "tous" | "mensuel" | "annuel" | "video"
 *                       subscription cycle, or a video deposit ("video")
 *   metadata.name       admin label
 * Checkout (lib/billing/promotion.ts) refuses the code unless the cart, the dates and the cap match.
 */

export const PROMO_TARGETS = ["tous", "mensuel", "annuel", "video"] as const;
export type PromoTarget = (typeof PROMO_TARGETS)[number];
export type PromoStatus = "active" | "scheduled" | "expired" | "exhausted" | "disabled";

export type PromoRow = {
  id: string;
  code: string;
  name: string;
  target: PromoTarget;
  percentOff: number | null;
  amountOffCents: number | null;
  duration: "once" | "forever" | "repeating";
  startsAt: number | null;
  expiresAt: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  status: PromoStatus;
  livemode: boolean;
};

const couponOf = (p: Stripe.PromotionCode) => (typeof p.promotion.coupon === "object" ? p.promotion.coupon : null);

export function promoStatus(p: Pick<PromoRow, "active" | "startsAt" | "expiresAt" | "maxRedemptions" | "timesRedeemed">, now = Date.now() / 1000): PromoStatus {
  if (p.expiresAt && p.expiresAt <= now) return "expired";
  if (p.maxRedemptions && p.timesRedeemed >= p.maxRedemptions) return "exhausted";
  if (!p.active) return "disabled";
  if (p.startsAt && p.startsAt > now) return "scheduled";
  return "active";
}

export function toPromoRow(p: Stripe.PromotionCode): PromoRow {
  const c = couponOf(p);
  const meta = p.metadata ?? {};
  const startsAt = Number(meta.starts_at) || null;
  const target = (PROMO_TARGETS as readonly string[]).includes(meta.target ?? "") ? (meta.target as PromoTarget) : "tous";
  // A coupon that is no longer valid (deleted / redeem_by passed) makes the code unusable.
  const couponValid = c ? c.valid : true;
  const row = {
    id: p.id,
    code: p.code,
    name: meta.name || c?.name || p.code,
    target,
    percentOff: c?.percent_off ?? null,
    amountOffCents: c?.amount_off ?? null,
    duration: (c?.duration ?? "once") as PromoRow["duration"],
    startsAt,
    expiresAt: p.expires_at ?? c?.redeem_by ?? null,
    maxRedemptions: p.max_redemptions ?? c?.max_redemptions ?? null,
    timesRedeemed: p.times_redeemed,
    active: p.active && couponValid,
    livemode: p.livemode,
  };
  return { ...row, status: promoStatus(row) };
}

export async function loadPromotions() {
  const stripe = getStripe();
  if (!stripe) return { configured: false as const };
  try {
    const rows: PromoRow[] = [];
    for await (const p of stripe.promotionCodes.list({ limit: 100, expand: ["data.promotion.coupon"] })) {
      rows.push(toPromoRow(p));
      if (rows.length >= 500) break;
    }
    rows.sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || (b.startsAt ?? 0) - (a.startsAt ?? 0));
    return {
      configured: true as const,
      // From the key, so the "test mode" warning shows even before the first code exists.
      livemode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ?? false,
      rows,
      kpis: {
        active: rows.filter((r) => r.status === "active").length,
        scheduled: rows.filter((r) => r.status === "scheduled").length,
        redemptions: rows.reduce((s, r) => s + r.timesRedeemed, 0),
        total: rows.length,
      },
    };
  } catch (cause) {
    console.error("loadPromotions failed:", cause);
    return { configured: true as const, error: true as const };
  }
}
