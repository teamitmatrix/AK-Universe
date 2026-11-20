import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/*
 * Applies a plan / option / billing-cycle change recorded in subscriptions.pending_* (migration 016) once it is due:
 *   - kind "renewal": a downgrade / lower total, due at the next renewal (Stripe already bills the new price);
 *   - kind "payment": an upgrade whose prorated invoice was waiting for payment (Stripe pending update).
 * Called by the Stripe webhook (invoice.paid) and, as a safety net, when the client space reads a change that is
 * already due. Service-role client only. Idempotent: the update is conditioned on the pending change still being
 * the one read, so two concurrent callers cannot apply it twice.
 */

type PendingRow = {
  id: string;
  pending_plan: string | null;
  pending_options: string[] | null;
  pending_plan_price_cents: number | null;
  pending_monthly_total_cents: number | null;
  pending_kind: string | null;
  /** Migration 017: cycle of a monthly ↔ annual switch waiting for its payment. */
  pending_cycle?: string | null;
};

export const CLEARED_PENDING = {
  pending_plan: null,
  pending_options: null,
  pending_plan_price_cents: null,
  pending_monthly_total_cents: null,
  pending_kind: null,
  pending_effective_at: null,
  pending_invoice_id: null,
  pending_cycle: null,
};

export async function applyPendingChange(db: SupabaseClient, subscriptionId: string, kind?: "renewal" | "payment") {
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .maybeSingle();
  // Before migration 016 the columns do not exist: nothing can be pending.
  if (error || !data) return false;
  const row = data as PendingRow;
  if (!row.pending_kind || !row.pending_plan || row.pending_monthly_total_cents == null) return false;
  if (kind && row.pending_kind !== kind) return false;

  const { data: done, error: updErr } = await db
    .from("subscriptions")
    .update({
      plan: row.pending_plan,
      options: row.pending_options ?? [],
      plan_price_cents: row.pending_plan_price_cents,
      monthly_total_cents: row.pending_monthly_total_cents,
      ...(row.pending_cycle === "mensuel" || row.pending_cycle === "annuel" ? { cycle: row.pending_cycle } : {}),
      ...CLEARED_PENDING,
    })
    .eq("id", row.id)
    .eq("pending_kind", row.pending_kind)
    .select("id");
  if (updErr) console.error("applyPendingChange failed:", updErr.message);
  return Boolean(done?.length);
}

/** Drops a pending change that will never complete (e.g. its prorated invoice was not paid). */
export async function clearPendingChange(db: SupabaseClient, subscriptionId: string, kind: "renewal" | "payment") {
  const { error } = await db.from("subscriptions").update(CLEARED_PENDING).eq("id", subscriptionId).eq("pending_kind", kind);
  if (error) console.error("clearPendingChange failed:", error.message);
}
