"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import Stripe from "stripe";
import { OPTIONS, type Cycle } from "@/config/pricing";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { basePriceCents, planInfo, sanitizeOptions, subscriptionBasis, subscriptionTotals } from "./plans";
import { notifyClient } from "./client-notify";
import { getClientMe } from "./session";
import { planProduct } from "./stripe-products";
import { CLEARED_PENDING } from "./subscription-sync";

/*
 * Plan / option / billing-cycle changes and cancellation, from "Mon offre" (/client/dashboard/mon-offre) and
 * "Facturation" (/client/dashboard/facturation, monthly ↔ annual).
 * Server actions are public endpoints, so every call:
 *   - re-checks the caller (active, non-staff customer) and reads THEIR subscription with their own session (RLS);
 *   - recomputes every amount here (catalogue prices + computeQuote) — the browser only sends a plan id and option
 *     ids, never a price — and asks Stripe for the prorated amount;
 *   - on confirm, refuses the change if the subscription is no longer in the state the customer reviewed
 *     (`basis`), takes a short database lock and sends Stripe an idempotency key, so a double click or two tabs
 *     can never apply the same change twice.
 * Billing rules:
 *   - higher plan, or higher total on the same plan → applied now; the prorated difference is invoiced and charged immediately, and
 *     Stripe only applies the change once that payment succeeds (payment_behavior "pending_if_incomplete");
 *   - lower plan, or lower total on the same plan → scheduled for the next renewal (no refund); the current plan stays until then;
 *   - monthly ↔ annual → applied now: Stripe restarts the billing period today, charges the new period and credits
 *     the unused time of the current one (a credit larger than the charge stays on the customer's balance);
 *   - cancellation → no renewal, access kept until the end of the paid period; account and data are kept.
 */

type Fail = {
  success: false;
  error:
    | "forbidden"
    | "invalid"
    | "unchanged"
    | "notAvailable"
    | "notReady"
    | "pending"
    | "stale"
    | "busy"
    | "payment_failed"
    | "payment_required"
    | "failed";
  invoiceUrl?: string | null;
};

export type ChangePreview = {
  success: true;
  mode: "immediate" | "renewal";
  planId: string;
  planName: string;
  options: string[];
  currentMonthlyCents: number;
  monthlyCents: number;
  periodCents: number;
  interval: "month" | "year";
  cycle: Cycle;
  /** Monthly ↔ annual switch: Stripe restarts the billing period today and credits the unused time. */
  cycleChange: boolean;
  /** Amount charged today (prorated, as computed by Stripe) for an immediate change. */
  dueNowCents: number | null;
  /** Unused time credited to the customer's balance and deducted from the next invoices. */
  creditCents: number;
  /** Date the change takes effect (renewal) — null for an immediate change. */
  effectiveAt: string | null;
  nextRenewalAt: string | null;
  prorationDate: number | null;
  basis: string;
};

type Row = {
  id: string;
  user_id: string;
  plan: string;
  cycle: Cycle;
  extra_users: number;
  options: string[] | null;
  monthly_total_cents: number;
  status: string;
  stripe_subscription_id: string | null;
  plan_price_cents?: number | null;
  cancel_at_period_end?: boolean;
  pending_kind?: string | null;
  change_lock_until?: string | null;
  pending_cycle?: string | null;
};

const PRORATION_MAX_AGE_S = 15 * 60;

/** Next billing date after a cycle switch (Stripe anchors the new period on the day of the change). */
function addInterval(from: Date, interval: "month" | "year") {
  const d = new Date(from);
  if (interval === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/** The caller's subscription + its live Stripe state, or why nothing can be changed. */
async function context() {
  const me = await getClientMe();
  if (!me) return { fail: { success: false, error: "forbidden" } as Fail };
  const stripe = getStripe();
  if (!stripe) return { fail: { success: false, error: "notAvailable" } as Fail };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", me.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { fail: { success: false, error: "failed" } as Fail };
  const row = data as Row | null;
  if (!row?.stripe_subscription_id) return { fail: { success: false, error: "notAvailable" } as Fail };
  // Migrations 016 / 017 not applied yet: the change could not be recorded, so do not touch Stripe.
  if (!("change_lock_until" in row) || !("pending_cycle" in row)) return { fail: { success: false, error: "notReady" } as Fail };

  let sub: Stripe.Subscription;
  try {
    sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
  } catch (cause) {
    console.error("Plan change: Stripe lookup failed:", cause);
    return { fail: { success: false, error: "failed" } as Fail };
  }
  const item = sub.items.data[0];
  if (!item || !item.price.recurring) return { fail: { success: false, error: "notAvailable" } as Fail };
  return { me, stripe, row, sub, item };
}

type Ctx = Exclude<Awaited<ReturnType<typeof context>>, { fail: Fail }>;

/** Can this subscription be changed at all right now? */
function blocked(ctx: Ctx): Fail | null {
  const { sub, row } = ctx;
  if (!["active", "trialing"].includes(sub.status) || sub.cancel_at_period_end || sub.cancel_at) return { success: false, error: "notAvailable" };
  if (sub.pending_update || row.pending_kind) return { success: false, error: "pending" };
  return null;
}

/**
 * Stripe line for a new price per period on the plan's active product (see stripe-products.ts), keeping the
 * current interval unless it changes.
 */
function itemsFor(ctx: Ctx, periodCents: number, product: string, interval?: "month" | "year") {
  const { item } = ctx;
  const recurring = interval
    ? { interval, interval_count: 1 }
    : { interval: item.price.recurring!.interval, interval_count: item.price.recurring!.interval_count };
  return [
    {
      id: item.id,
      quantity: 1,
      price_data: {
        currency: item.price.currency,
        product,
        unit_amount: periodCents,
        recurring,
      },
    },
  ];
}

/** Server-side plan of a change: target, new totals and whether it applies now or at renewal. */
async function plan(ctx: Ctx, input: { plan?: unknown; options?: unknown; cycle?: unknown }) {
  const pricing = await getAgentsPricing();
  const { row } = ctx;
  const planId = typeof input.plan === "string" ? input.plan : row.plan;
  // Not sent = keep the current options / cycle.
  const options = input.options === undefined ? sanitizeOptions(row.options, row.options) : sanitizeOptions(input.options, row.options);
  const cycle: Cycle = input.cycle === "annuel" || input.cycle === "mensuel" ? input.cycle : row.cycle;
  const cycleChange = cycle !== row.cycle;
  const base = basePriceCents(row, planId, pricing);
  if (base === null) return { fail: { success: false, error: "invalid" } as Fail };

  const current = [...(row.options ?? [])].filter((o) => OPTIONS.some((x) => x.id === o)).sort().join(",");
  if (planId === row.plan && !cycleChange && options.slice().sort().join(",") === current) return { fail: { success: false, error: "unchanged" } as Fail };

  const totals = subscriptionTotals({ cycle, users: row.extra_users ?? 0, options }, base, pricing);
  const rankDiff = planInfo(planId, pricing).rank - planInfo(row.plan, pricing).rank;
  // Billing rules:
  //   - monthly ↔ annual: the billing interval changes, Stripe restarts the period today and credits the unused
  //     time → always immediate (charge or credit);
  //   - higher plan: immediate, prorated (a credit if that plan happens to cost less than the current price);
  //   - lower plan: at the next renewal;
  //   - same plan (options): immediate when the total goes up or stays equal, at the renewal when it goes down.
  const mode: "immediate" | "renewal" =
    cycleChange || rankDiff > 0 || (rankDiff === 0 && totals.monthlyCents >= row.monthly_total_cents) ? "immediate" : "renewal";
  const interval: "month" | "year" = cycle === "annuel" ? "year" : "month";
  return { pricing, planId, options, cycle, cycleChange, interval, base, totals, mode, planName: planInfo(planId, pricing).name };
}

/** Active product of the subscription's current plan. */
async function currentPlanProduct(ctx: Ctx) {
  const pricing = await getAgentsPricing();
  return planProduct(ctx.stripe, ctx.row.plan, planInfo(ctx.row.plan, pricing).name);
}

/** Price per period before a scheduled (renewal) change: saved on the Stripe subscription, else rebuilt from the row. */
function restoreUnit(ctx: Ctx) {
  const saved = Number(ctx.sub.metadata?.aku_restore_unit);
  return Number.isInteger(saved) && saved > 0 ? saved : ctx.row.monthly_total_cents * (ctx.row.cycle === "annuel" ? 12 : 1);
}

function failFromStripe(cause: unknown): Fail {
  if (cause instanceof Stripe.errors.StripeCardError) return { success: false, error: "payment_failed" };
  console.error("Plan change: Stripe update failed:", cause);
  return { success: false, error: "failed" };
}

/** Short exclusive lock on the subscription row (service role, scoped to the caller's own row). */
async function lock(row: Row) {
  const db = createAdminClient();
  const now = new Date();
  const { data, error } = await db
    .from("subscriptions")
    .update({ change_lock_until: new Date(now.getTime() + 90_000).toISOString() })
    .eq("id", row.id)
    .eq("user_id", row.user_id)
    .or(`change_lock_until.is.null,change_lock_until.lt.${now.toISOString()}`)
    .select("id");
  if (error) {
    console.error("Plan change: lock failed:", error.message);
    return null;
  }
  return data?.length ? db : null;
}

async function unlock(db: ReturnType<typeof createAdminClient>, row: Row) {
  await db.from("subscriptions").update({ change_lock_until: null }).eq("id", row.id);
}

function done() {
  revalidatePath("/client/dashboard", "layout");
}

const eurFr = (cents: number) => (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "");

/** "Alertes sur mon abonnement" e-mail, after the response (respects the customer's preference). */
function notifySubscription(userId: string, subject: string, lines: string[]) {
  after(() => notifyClient(userId, "subscription", subject, lines));
}

/* ------------------------------------------------------------------ */

/** Review step: new totals, prorated amount due today or the date the change takes effect. Changes nothing. */
export async function previewPlanChange(input: { plan?: string; options?: string[]; cycle?: Cycle }): Promise<ChangePreview | Fail> {
  const ctx = await context();
  if ("fail" in ctx) return ctx.fail!;
  const stop = blocked(ctx);
  if (stop) return stop;
  const p = await plan(ctx, input);
  if ("fail" in p) return p.fail!;

  const periodEnd = iso(ctx.item.current_period_end);
  let dueNowCents: number | null = null;
  let creditCents = 0;
  let prorationDate: number | null = null;
  if (p.mode === "immediate") {
    prorationDate = Math.floor(Date.now() / 1000);
    try {
      const preview = await ctx.stripe.invoices.createPreview({
        customer: typeof ctx.sub.customer === "string" ? ctx.sub.customer : ctx.sub.customer.id,
        subscription: ctx.sub.id,
        subscription_details: {
          items: itemsFor(ctx, p.totals.periodCents, await planProduct(ctx.stripe, p.planId, p.planName), p.cycleChange ? p.interval : undefined),
          proration_behavior: "always_invoice",
          proration_date: prorationDate,
        },
      });
      dueNowCents = Math.max(0, preview.amount_due);
      // Negative total: the unused time is worth more than the new period → credit on the customer's balance.
      creditCents = preview.total < 0 ? -preview.total : 0;
    } catch (cause) {
      console.error("Plan change: proration preview failed:", cause);
      return { success: false, error: "failed" };
    }
  }

  return {
    success: true,
    mode: p.mode,
    planId: p.planId,
    planName: p.planName,
    options: p.options,
    currentMonthlyCents: ctx.row.monthly_total_cents,
    monthlyCents: p.totals.monthlyCents,
    periodCents: p.totals.periodCents,
    interval: p.cycleChange ? p.interval : ctx.item.price.recurring!.interval === "year" ? "year" : "month",
    cycle: p.cycle,
    cycleChange: p.cycleChange,
    dueNowCents,
    creditCents,
    effectiveAt: p.mode === "renewal" ? periodEnd : null,
    nextRenewalAt: p.cycleChange ? addInterval(new Date(), p.interval) : periodEnd,
    prorationDate,
    basis: subscriptionBasis(ctx.row),
  };
}

/** Confirm step. Applies (or schedules) exactly the change reviewed, after payment when something is due. */
export async function confirmPlanChange(input: {
  plan?: string;
  options?: string[];
  cycle?: Cycle;
  basis?: string;
  prorationDate?: number | null;
}): Promise<{ success: true; mode: "immediate" | "renewal"; effectiveAt: string | null } | Fail> {
  const ctx = await context();
  if ("fail" in ctx) return ctx.fail!;
  if (input.basis !== subscriptionBasis(ctx.row)) return { success: false, error: "stale" };
  const stop = blocked(ctx);
  if (stop) return stop;
  const p = await plan(ctx, input);
  if ("fail" in p) return p.fail!;

  const now = Math.floor(Date.now() / 1000);
  const prorationDate = Number(input.prorationDate);
  if (p.mode === "immediate" && (!Number.isInteger(prorationDate) || prorationDate > now + 60 || now - prorationDate > PRORATION_MAX_AGE_S)) {
    // The amount shown is too old to be guaranteed: review again.
    return { success: false, error: "stale" };
  }

  const db = await lock(ctx.row);
  if (!db) return { success: false, error: "busy" };
  const key = createHash("sha256")
    .update([ctx.row.id, input.basis, p.planId, p.options.join(","), p.cycle, p.mode, p.mode === "immediate" ? prorationDate : ""].join("|"))
    .digest("hex");
  let product: string;
  try {
    product = await planProduct(ctx.stripe, p.planId, p.planName);
  } catch (cause) {
    await unlock(db, ctx.row);
    return failFromStripe(cause);
  }
  const items = itemsFor(ctx, p.totals.periodCents, product, p.cycleChange ? p.interval : undefined);
  const periodEnd = iso(ctx.item.current_period_end);

  try {
    if (p.mode === "immediate") {
      let updated: Stripe.Subscription;
      try {
        updated = await ctx.stripe.subscriptions.update(
          ctx.sub.id,
          { items, proration_behavior: "always_invoice", proration_date: prorationDate, payment_behavior: "pending_if_incomplete", expand: ["latest_invoice"] },
          { idempotencyKey: `plan-change-${key}` }
        );
      } catch (cause) {
        return failFromStripe(cause);
      }

      if (updated.pending_update) {
        // Payment not completed (declined, or 3-D Secure needed): Stripe keeps the old plan. The change is recorded as
        // waiting for that invoice; the webhook applies it if the customer pays it, otherwise it expires.
        const invoice = typeof updated.latest_invoice === "object" ? updated.latest_invoice : null;
        await db
          .from("subscriptions")
          .update({
            pending_plan: p.planId,
            pending_options: p.options,
            pending_plan_price_cents: p.base,
            pending_monthly_total_cents: p.totals.monthlyCents,
            pending_kind: "payment",
            pending_effective_at: null,
            pending_invoice_id: invoice?.id ?? null,
            pending_cycle: p.cycleChange ? p.cycle : null,
          })
          .eq("id", ctx.row.id);
        done();
        return { success: false, error: "payment_required", invoiceUrl: invoice?.hosted_invoice_url ?? null };
      }

      const { error } = await db
        .from("subscriptions")
        .update({
          plan: p.planId,
          options: p.options,
          cycle: p.cycle,
          plan_price_cents: p.base,
          monthly_total_cents: p.totals.monthlyCents,
          ...CLEARED_PENDING,
          // A new billing period starts today on a cycle switch.
          ...(p.cycleChange ? { current_period_end: iso(updated.items.data[0]?.current_period_end) } : {}),
        })
        .eq("id", ctx.row.id);
      if (error) console.error("Plan change applied in Stripe but not saved in the database:", ctx.row.id, error.message);
      done();
      notifySubscription(ctx.me.id, "Votre abonnement AK Universe a été mis à jour", [
        `Votre offre est désormais : ${p.planName}${p.options.length ? ` (${p.options.length} option${p.options.length > 1 ? "s" : ""})` : ""}.`,
        `Nouveau montant : ${eurFr(p.totals.periodCents)} HT par ${p.interval === "year" ? "an" : "mois"}.`,
      ]);
      return { success: true, mode: "immediate", effectiveAt: null };
    }

    // Renewal: Stripe bills the new price from the next period (no proration, no refund); the plan shown and
    // included stays the current one until then.
    try {
      await ctx.stripe.subscriptions.update(
        ctx.sub.id,
        // The exact current price is kept on the subscription so cancelling the scheduled change restores it to the cent.
        { items, proration_behavior: "none", metadata: { aku_restore_unit: String(ctx.item.price.unit_amount ?? "") } },
        { idempotencyKey: `plan-change-${key}` }
      );
    } catch (cause) {
      return failFromStripe(cause);
    }
    const { error } = await db
      .from("subscriptions")
      .update({
        pending_plan: p.planId,
        pending_options: p.options,
        pending_plan_price_cents: p.base,
        pending_monthly_total_cents: p.totals.monthlyCents,
        pending_kind: "renewal",
        pending_effective_at: periodEnd,
        pending_invoice_id: null,
      })
      .eq("id", ctx.row.id);
    if (error) console.error("Scheduled plan change set in Stripe but not saved in the database:", ctx.row.id, error.message);
    done();
    notifySubscription(ctx.me.id, "Changement d'abonnement programmé", [
      `À partir du ${dateFr(periodEnd)}, votre offre sera : ${p.planName}, pour ${eurFr(p.totals.periodCents)} HT par ${p.interval === "year" ? "an" : "mois"}.`,
      "Votre offre actuelle reste active jusqu'à cette date.",
    ]);
    return { success: true, mode: "renewal", effectiveAt: periodEnd };
  } finally {
    await unlock(db, ctx.row);
  }
}

/** Back to the current plan: cancels a change scheduled for the next renewal. */
export async function cancelScheduledChange(): Promise<{ success: true } | Fail> {
  const ctx = await context();
  if ("fail" in ctx) return ctx.fail!;
  if (ctx.row.pending_kind !== "renewal") return { success: false, error: "unchanged" };
  const db = await lock(ctx.row);
  if (!db) return { success: false, error: "busy" };
  try {
    const current = restoreUnit(ctx);
    try {
      const product = await currentPlanProduct(ctx);
      await ctx.stripe.subscriptions.update(ctx.sub.id, { items: itemsFor(ctx, current, product), proration_behavior: "none", metadata: { aku_restore_unit: "" } });
    } catch (cause) {
      return failFromStripe(cause);
    }
    await db.from("subscriptions").update(CLEARED_PENDING).eq("id", ctx.row.id);
    done();
    return { success: true };
  } finally {
    await unlock(db, ctx.row);
  }
}

/**
 * Cancellation: no renewal, access kept until the end of the period already paid. Nothing is deleted.
 * A change scheduled for the renewal is dropped (Stripe's price restored to the current one).
 */
export async function cancelSubscription(input: { basis?: string }): Promise<{ success: true; endsAt: string | null } | Fail> {
  const ctx = await context();
  if ("fail" in ctx) return ctx.fail!;
  if (input.basis !== subscriptionBasis(ctx.row)) return { success: false, error: "stale" };
  if (!["active", "trialing", "past_due"].includes(ctx.sub.status)) return { success: false, error: "notAvailable" };
  if (ctx.sub.cancel_at_period_end) return { success: false, error: "unchanged" };
  const db = await lock(ctx.row);
  if (!db) return { success: false, error: "busy" };
  try {
    const restore =
      ctx.row.pending_kind === "renewal"
        ? { items: itemsFor(ctx, restoreUnit(ctx), await currentPlanProduct(ctx)), proration_behavior: "none" as const, metadata: { aku_restore_unit: "" } }
        : {};
    let updated: Stripe.Subscription;
    try {
      updated = await ctx.stripe.subscriptions.update(
        ctx.sub.id,
        { cancel_at_period_end: true, ...restore },
        { idempotencyKey: `cancel-${ctx.row.id}-${ctx.item.current_period_end}` }
      );
    } catch (cause) {
      return failFromStripe(cause);
    }
    const endsAt = iso(updated.cancel_at) ?? iso(updated.items.data[0]?.current_period_end);
    const { error } = await db
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        current_period_end: endsAt,
        ...(ctx.row.pending_kind === "renewal" ? CLEARED_PENDING : {}),
      })
      .eq("id", ctx.row.id);
    if (error) console.error("Cancellation set in Stripe but not saved in the database:", ctx.row.id, error.message);
    done();
    notifySubscription(ctx.me.id, "Résiliation de votre abonnement confirmée", [
      `Votre abonnement ne sera pas renouvelé. Votre accès reste actif jusqu'au ${dateFr(endsAt)}.`,
      "Vous pouvez le réactiver à tout moment avant cette date depuis votre espace client.",
    ]);
    return { success: true, endsAt };
  } finally {
    await unlock(db, ctx.row);
  }
}

/** Undo a scheduled cancellation (before the end of the period): the subscription renews again. */
export async function resumeSubscription(): Promise<{ success: true } | Fail> {
  const ctx = await context();
  if ("fail" in ctx) return ctx.fail!;
  if (!ctx.sub.cancel_at_period_end || ctx.sub.status === "canceled") return { success: false, error: "unchanged" };
  const db = await lock(ctx.row);
  if (!db) return { success: false, error: "busy" };
  try {
    try {
      await ctx.stripe.subscriptions.update(ctx.sub.id, { cancel_at_period_end: false });
    } catch (cause) {
      return failFromStripe(cause);
    }
    await db.from("subscriptions").update({ cancel_at_period_end: false, canceled_at: null }).eq("id", ctx.row.id);
    done();
    notifySubscription(ctx.me.id, "Votre abonnement AK Universe est réactivé", ["La résiliation programmée a été annulée : votre abonnement sera renouvelé normalement."]);
    return { success: true };
  } finally {
    await unlock(db, ctx.row);
  }
}
