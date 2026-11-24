import "server-only";
import type Stripe from "stripe";
import { OFFERED_OPTIONS, OPTIONS, toCents, type Cycle } from "@/config/pricing";
import { getAgentsPricing } from "@/lib/agents-pricing";
import { getStripe } from "@/lib/stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { basePriceCents, planInfo, subscriptionBasis } from "./plans";
import type { ClientMe } from "./session";
import { applyPendingChange, clearPendingChange } from "./subscription-sync";

/*
 * Subscription data of the client space (/client/dashboard, /client/dashboard/mon-offre). Two sources, nothing hard-coded:
 *   1. Supabase `subscriptions` / `payments`, read with the customer's own session (RLS "read own") and filtered
 *      on their id — the rows the checkout, the plan-change actions and the Stripe webhook keep in sync;
 *   2. Stripe itself (subscription, upcoming invoice, invoices), looked up from the ids stored on that row, so
 *      the next payment, scheduled cancellation and invoice history are exact even before a webhook lands.
 * If Stripe is not configured or does not answer, the page still renders from the database alone.
 * A database failure throws: the segment's error boundary shows a retry screen instead of a false "no plan".
 */

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "incomplete";
export type HistoryStatus = "upcoming" | "paid" | "open" | "failed";

export type HistoryRow = {
  id: string;
  /** ISO date of the payment (or the planned payment). */
  date: string;
  amountCents: number;
  status: HistoryStatus;
  /** Stripe hosted invoice page (view / download PDF), when the billing provider has one. */
  invoiceUrl: string | null;
};

export type PendingChange = {
  kind: "renewal" | "payment";
  planId: string;
  planName: string;
  options: string[];
  monthlyCents: number;
  /** When a renewal change takes effect. */
  effectiveAt: string | null;
};

export type ClientPlan = {
  /** Short public reference of the subscription (contract, support). */
  reference: string;
  planId: string;
  name: string;
  status: SubscriptionStatus;
  cycle: Cycle;
  /** Price per billing period, excl. VAT. */
  priceCents: number;
  /** Monthly total stored for the subscription (after the annual discount), excl. VAT. */
  monthlyCents: number;
  /** Plan alone, per month before the cycle discount (price locked on the subscription), cents excl. VAT. */
  baseListCents: number;
  /** Extra users, per month before the cycle discount. */
  usersListCents: number;
  /** 0.2 on the annual cycle (configured discount), else 0. */
  cycleDiscount: number;
  interval: "month" | "year";
  /** When the subscription started (Stripe), else when it was created. */
  startedAt: string | null;
  /** Next renewal (or end of access once the cancellation is scheduled / done). */
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Amount of the next payment, excl. VAT — null when no further payment is planned. */
  nextAmountCents: number | null;
  agents: number | null;
  automations: string;
  features: string[];
  optionIds: string[];
  options: { id: string; label: string }[];
  extraUsers: number;
  /** Options of the catalogue the customer has not subscribed yet (upgrade paths). */
  availableOptions: number;
  /** A Stripe customer exists → the billing portal (invoices, card) can open. */
  manageable: boolean;
  /** Plan / options can be changed and the subscription cancelled from the client space right now. */
  changeable: boolean;
  pending: PendingChange | null;
  /** Fingerprint of the state the customer is looking at; a change is refused if it no longer matches. */
  basis: string;
};

export type ClientDashboard = { plan: ClientPlan | null; history: HistoryRow[]; live: boolean };

type SubscriptionRow = {
  id: string;
  plan: string;
  cycle: Cycle;
  extra_users: number;
  options: string[] | null;
  monthly_total_cents: number;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  // Migration 016 (undefined before it is applied).
  plan_price_cents?: number | null;
  cancel_at_period_end?: boolean;
  pending_plan?: string | null;
  pending_options?: string[] | null;
  pending_monthly_total_cents?: number | null;
  pending_kind?: "renewal" | "payment" | null;
  pending_effective_at?: string | null;
  pending_cycle?: Cycle | null;
};

/** Same mapping as the Stripe webhook (app/api/stripe/webhook/route.ts). */
const STRIPE_STATUS: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
};

const HISTORY_SIZE = 4;
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);
const toStatus = (s: string): SubscriptionStatus => (["active", "past_due", "canceled", "incomplete"].includes(s) ? (s as SubscriptionStatus) : "incomplete");

/** Excl. VAT amount of a Stripe invoice (AK Universe prices are HT; tax may be added by Stripe Tax). */
const invoiceHt = (inv: Stripe.Invoice) => inv.total_excluding_tax ?? inv.total;

async function loadStripe(row: SubscriptionRow, withHistory: boolean) {
  const stripe = getStripe();
  if (!stripe || !row.stripe_subscription_id) return null;
  try {
    const [sub, invoices, preview] = await Promise.all([
      stripe.subscriptions.retrieve(row.stripe_subscription_id),
      withHistory && row.stripe_customer_id
        ? stripe.invoices.list({ customer: row.stripe_customer_id, limit: HISTORY_SIZE + 4 })
        : Promise.resolve(null),
      // No upcoming invoice once the subscription is canceled / set to end: that is not an error.
      stripe.invoices.createPreview({ subscription: row.stripe_subscription_id }).catch(() => null),
    ]);
    return { sub, invoices: invoices?.data ?? [], preview };
  } catch (cause) {
    console.error("Client space: Stripe lookup failed, falling back to the database:", cause);
    return null;
  }
}

/** The customer's latest (non-pending) subscription row, read with their own session. */
async function readRow(meId: string) {
  const supabase = await createClient();
  // "*" so the page keeps working whether or not migration 016 has been applied.
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", meId)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Client space: subscription query failed: ${error.message}`);
  return data as SubscriptionRow | null;
}

/**
 * Safety net for the webhook: applies a pending change that is already due (renewal date passed, or prorated
 * invoice paid), or drops one whose payment will never complete. Returns true when the row changed.
 */
async function reconcilePending(row: SubscriptionRow, live: Awaited<ReturnType<typeof loadStripe>>) {
  if (!row.pending_kind) return false;
  try {
    const db = createAdminClient();
    if (row.pending_kind === "renewal" && row.pending_effective_at && new Date(row.pending_effective_at) <= new Date()) {
      return await applyPendingChange(db, row.id, "renewal");
    }
    if (row.pending_kind === "payment" && live && !live.sub.pending_update) {
      // Stripe applied the pending update (invoice paid) → item price = new period price; otherwise it expired.
      const unit = live.sub.items.data[0]?.price.unit_amount;
      // The annual price is rounded once on the yearly amount, so it can differ from 12 × the rounded monthly total
      // by up to 12 cents: compare within that margin (any real plan change differs by far more).
      const annual = (row.pending_cycle ?? row.cycle) === "annuel";
      const expected = row.pending_monthly_total_cents! * (annual ? 12 : 1);
      if (unit != null && Math.abs(unit - expected) <= (annual ? 12 : 1)) return await applyPendingChange(db, row.id, "payment");
      await clearPendingChange(db, row.id, "payment");
      return true;
    }
  } catch (cause) {
    console.error("Client space: could not reconcile the pending change:", cause);
  }
  return false;
}

export async function loadClientSubscription(me: ClientMe, opts: { history: boolean }): Promise<ClientDashboard> {
  let row = await readRow(me.id);
  if (!row) return { plan: null, history: [], live: false };

  const [pricing, liveFirst] = await Promise.all([getAgentsPricing(), loadStripe(row, opts.history)]);
  let live = liveFirst;
  if (await reconcilePending(row, live)) {
    row = (await readRow(me.id)) ?? row;
    live = await loadStripe(row, opts.history);
  }

  const item = live?.sub.items.data[0];
  const unit = item?.price.unit_amount;
  const interval: "month" | "year" = item?.price.recurring?.interval === "year" || (!item && row.cycle === "annuel") ? "year" : "month";

  const status = live ? (STRIPE_STATUS[live.sub.status] ?? "incomplete") : toStatus(row.status);
  const cancelAtPeriodEnd = live ? Boolean(live.sub.cancel_at_period_end || live.sub.cancel_at) : Boolean(row.cancel_at_period_end);
  const periodEnd = (live && (iso(live.sub.cancel_at) ?? iso(item?.current_period_end))) || row.current_period_end;
  // Per billing period: what Stripe actually charges, else the stored monthly total (×12 on the annual cycle).
  // A pending renewal change already lowered Stripe's price: show what the customer pays for the current period.
  const storedPeriod = interval === "year" ? row.monthly_total_cents * 12 : row.monthly_total_cents;
  const savedUnit = Number(live?.sub.metadata?.aku_restore_unit);
  const priceCents =
    unit != null && row.pending_kind !== "renewal"
      ? unit * (item?.quantity ?? 1)
      : row.pending_kind === "renewal" && Number.isInteger(savedUnit) && savedUnit > 0
        ? savedUnit
        : storedPeriod;
  const renews = status !== "canceled" && !cancelAtPeriodEnd;
  const nextAmountCents = !renews ? null : live?.preview ? invoiceHt(live.preview) : storedPeriod;

  const info = planInfo(row.plan, pricing);
  const chosen = new Set(row.options ?? []);
  const pending: PendingChange | null =
    row.pending_kind && row.pending_plan && row.pending_monthly_total_cents != null
      ? {
          kind: row.pending_kind,
          planId: row.pending_plan,
          planName: planInfo(row.pending_plan, pricing).name,
          options: row.pending_options ?? [],
          monthlyCents: row.pending_monthly_total_cents,
          effectiveAt: row.pending_effective_at ?? null,
        }
      : null;

  const plan: ClientPlan = {
    reference: `AKU-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    planId: row.plan,
    name: info.name,
    status,
    cycle: row.cycle,
    priceCents,
    monthlyCents: row.monthly_total_cents,
    baseListCents: basePriceCents(row, row.plan, pricing) ?? 0,
    usersListCents: toCents((row.extra_users ?? 0) * pricing.userPrice),
    cycleDiscount: row.cycle === "annuel" ? pricing.annualDiscount : 0,
    interval,
    startedAt: iso(live?.sub.start_date) ?? row.created_at,
    periodEnd,
    cancelAtPeriodEnd,
    nextAmountCents,
    agents: info.agents,
    automations: info.automations,
    features: info.features,
    optionIds: OPTIONS.filter((o) => chosen.has(o.id)).map((o) => o.id),
    options: OPTIONS.filter((o) => chosen.has(o.id)).map((o) => ({ id: o.id, label: o.label })),
    extraUsers: row.extra_users ?? 0,
    availableOptions: OFFERED_OPTIONS.filter((o) => !chosen.has(o.id)).length,
    manageable: Boolean(row.stripe_customer_id),
    changeable: Boolean(live && row.stripe_subscription_id && status === "active" && !live.sub.pending_update && "change_lock_until" in row && "pending_cycle" in row),
    pending,
    basis: subscriptionBasis(row),
  };

  // ---- Billing history: the next payment first, then the latest payments. ----
  const history: HistoryRow[] = [];
  if (!opts.history) return { plan, history, live: Boolean(live) };
  if (renews && periodEnd && nextAmountCents != null && status !== "incomplete") {
    history.push({ id: "upcoming", date: periodEnd, amountCents: nextAmountCents, status: "upcoming", invoiceUrl: null });
  }

  if (live && row.stripe_customer_id) {
    for (const inv of live.invoices) {
      if (history.length > HISTORY_SIZE) break;
      if (inv.status === "draft" || inv.status === "void" || !inv.id) continue;
      history.push({
        id: inv.id,
        date: iso(inv.status_transitions?.paid_at) ?? iso(inv.created)!,
        amountCents: invoiceHt(inv),
        status: inv.status === "paid" ? "paid" : inv.status === "uncollectible" ? "failed" : "open",
        invoiceUrl: inv.hosted_invoice_url ?? null,
      });
    }
  } else {
    // Stripe unreachable / not configured: the payments ledger written by the webhook (RLS "payments: read own").
    const supabase = await createClient();
    const { data: payments, error: payErr } = await supabase
      .from("payments")
      .select("id, amount_cents, status, created_at")
      .eq("user_id", me.id)
      .eq("kind", "subscription")
      .order("created_at", { ascending: false })
      .limit(HISTORY_SIZE);
    if (payErr) throw new Error(`Client space: payments query failed: ${payErr.message}`);
    for (const p of payments ?? []) {
      history.push({
        id: p.id as string,
        date: p.created_at as string,
        amountCents: p.amount_cents as number,
        status: p.status === "paid" ? "paid" : p.status === "unpaid" || p.status === "failed" ? "failed" : "open",
        invoiceUrl: null,
      });
    }
  }

  return { plan, history: history.slice(0, HISTORY_SIZE + 1), live: Boolean(live) };
}

/** Dashboard (/client/dashboard): subscription + billing history. */
export function loadClientDashboard(me: ClientMe) {
  return loadClientSubscription(me, { history: true });
}
