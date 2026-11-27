import "server-only";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * After Stripe Checkout, the webhook usually sets the subscription to active.
 * If that event is delayed or missed, the client portal would keep showing "no plan"
 * because pending rows are hidden. This looks up the customer's checkout sessions that
 * still need syncing (pending, or active without a Stripe subscription id) and applies
 * whatever Stripe already recorded as paid.
 */
export async function reconcilePaidCheckouts(userId: string): Promise<number> {
  const stripe = getStripe();
  if (!stripe) return 0;

  const db = createAdminClient();
  const { data: rows, error } = await db
    .from("subscriptions")
    .select("id, status, stripe_checkout_session_id, stripe_subscription_id")
    .eq("user_id", userId)
    .not("stripe_checkout_session_id", "is", null)
    .or("status.eq.pending,and(status.eq.active,stripe_subscription_id.is.null)")
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) {
    console.error("reconcilePaidCheckouts list failed:", error.message);
    return 0;
  }
  if (!rows?.length) return 0;

  let activated = 0;
  for (const row of rows) {
    const sessionId = row.stripe_checkout_session_id as string;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required" ||
        session.status === "complete";
      if (!paid) continue;

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      let periodEnd: string | null = null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const end = sub.items.data[0]?.current_period_end;
        if (end) periodEnd = new Date(end * 1000).toISOString();
      }

      const { error: updateError } = await db
        .from("subscriptions")
        .update({
          status: "active",
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? row.stripe_subscription_id,
          current_period_end: periodEnd,
        })
        .eq("id", row.id);
      if (updateError) {
        console.error("reconcilePaidCheckouts update failed:", updateError.message);
        continue;
      }
      activated += 1;
    } catch (cause) {
      console.error("reconcilePaidCheckouts Stripe retrieve failed:", cause);
    }
  }
  return activated;
}
