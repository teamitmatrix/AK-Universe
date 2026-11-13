"use server";

import { audit } from "./audit";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";
import { PROMO_TARGETS, type PromoTarget } from "./promotions";

/**
 * Creates / enables / disables Stripe promotion codes from /admin/promotions.
 * Re-checks the admin role on every call; every value is validated here before reaching Stripe.
 * Stripe codes cannot be edited or deleted once used — "disable" is the safe, reversible equivalent.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notConfigured" | "duplicate" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });

export type NewPromotion = {
  name: string;
  code: string;
  kind: "percent" | "amount";
  value: number;
  target: PromoTarget;
  duration: "once" | "forever";
  startsOn: string | null; // YYYY-MM-DD
  endsOn: string | null; // YYYY-MM-DD (inclusive)
  maxRedemptions: number | null;
};

const day = (iso: string, endOfDay = false) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const t = Date.parse(`${iso}T${endOfDay ? "23:59:59" : "00:00:00"}`);
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
};

export async function createPromotion(input: NewPromotion): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const stripe = getStripe();
  if (!stripe) return fail("notConfigured");

  const name = String(input.name ?? "").trim().slice(0, 80);
  const code = String(input.code ?? "").trim().toUpperCase();
  const value = Number(input.value);
  const maxRedemptions = input.maxRedemptions === null ? null : Math.floor(Number(input.maxRedemptions));
  const startsAt = input.startsOn ? day(input.startsOn) : null;
  const expiresAt = input.endsOn ? day(input.endsOn, true) : null;
  const now = Math.floor(Date.now() / 1000);

  if (!name || !/^[A-Z0-9-]{3,40}$/.test(code)) return fail("invalid");
  if (input.kind !== "percent" && input.kind !== "amount") return fail("invalid");
  if (!Number.isFinite(value) || value <= 0 || (input.kind === "percent" ? value > 100 : value > 100_000)) return fail("invalid");
  if (!PROMO_TARGETS.includes(input.target) || (input.duration !== "once" && input.duration !== "forever")) return fail("invalid");
  if (maxRedemptions !== null && (!Number.isFinite(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1_000_000)) return fail("invalid");
  if ((input.startsOn && startsAt === null) || (input.endsOn && expiresAt === null)) return fail("invalid");
  if (expiresAt !== null && (expiresAt <= now || (startsAt !== null && expiresAt <= startsAt))) return fail("invalid");

  try {
    const existing = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    if (existing.data.length) return fail("duplicate");

    const coupon = await stripe.coupons.create({
      name,
      duration: input.duration,
      ...(input.kind === "percent" ? { percent_off: Math.round(value * 100) / 100 } : { amount_off: Math.round(value * 100), currency: "eur" }),
      metadata: { source: "admin-ak-universe" },
    });
    await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      ...(expiresAt ? { expires_at: expiresAt } : {}),
      ...(maxRedemptions ? { max_redemptions: maxRedemptions } : {}),
      metadata: { name, target: input.target, ...(startsAt ? { starts_at: String(startsAt) } : {}) },
    });
  } catch (cause) {
    console.error("createPromotion failed:", cause);
    return fail("failed");
  }
  revalidatePath("/admin/promotions");
  await audit("promotion.create", code, { kind: input.kind, value, target: input.target, duration: input.duration, startsOn: input.startsOn, endsOn: input.endsOn, maxRedemptions });
  return { success: true };
}

export async function setPromotionActive(id: string, active: boolean): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const stripe = getStripe();
  if (!stripe) return fail("notConfigured");
  if (!/^promo_[A-Za-z0-9]+$/.test(String(id)) || typeof active !== "boolean") return fail("invalid");
  try {
    await stripe.promotionCodes.update(id, { active });
  } catch (cause) {
    console.error("setPromotionActive failed:", cause);
    return fail("failed");
  }
  revalidatePath("/admin/promotions");
  await audit(active ? "promotion.enable" : "promotion.disable", id);
  return { success: true };
}
