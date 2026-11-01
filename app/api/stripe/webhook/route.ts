import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendProjectEmails } from "@/lib/projects/emails";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Stripe → Supabase sync. Configure in the Stripe dashboard:
 *   endpoint  https://<domain>/api/stripe/webhook
 *   events    checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */

const SUBSCRIPTION_STATUS: Partial<Record<Stripe.Subscription.Status, string>> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
};

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") ?? "",
      secret
    );
  } catch (cause) {
    console.error("Invalid Stripe webhook signature:", cause);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const db = createAdminClient();

  // Idempotency: Stripe may deliver the same event more than once.
  const { data: seen } = await db.from("payments").select("id").eq("stripe_event_id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const meta = session.metadata ?? {};

      if (meta.kind === "subscription" && meta.subscription_id) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        // The renewal date shown on compte.html comes from the subscription itself.
        const periodEnd = subscriptionId
          ? (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0]?.current_period_end
          : undefined;
        await db
          .from("subscriptions")
          .update({
            status: "active",
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripe_subscription_id: subscriptionId,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
          })
          .eq("id", meta.subscription_id);
        await db.from("payments").insert({
          kind: "subscription",
          user_id: meta.user_id ?? null,
          subscription_id: meta.subscription_id,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          status: session.payment_status,
          stripe_event_id: event.id,
          stripe_object_id: session.id,
        });
      }

      if (meta.kind === "deposit" && meta.project_id && session.payment_status === "paid") {
        const { data: project } = await db
          .from("video_projects")
          .update({ status: "acompte_paye" })
          .eq("id", meta.project_id)
          .select("reference, kind, contact, items, total_cents, deposit_cents")
          .single();
        const { error: duplicate } = await db.from("payments").insert({
          kind: "deposit",
          project_id: meta.project_id,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          status: session.payment_status,
          stripe_event_id: event.id,
          stripe_object_id: session.id,
        });
        // A failed insert means a parallel delivery of the same event already recorded (and e-mailed) it.
        if (project && !duplicate) {
          after(() =>
            sendProjectEmails(
              {
                reference: project.reference,
                kind: project.kind,
                contact: project.contact,
                items: project.items,
                total: project.total_cents / 100,
                deposit: project.deposit_cents / 100,
                lang: meta.lang,
              },
              "deposit_paid"
            )
          );
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const periodEnd = sub.items.data[0]?.current_period_end;
      await db
        .from("subscriptions")
        .update({
          status: SUBSCRIPTION_STATUS[sub.status] ?? "incomplete",
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
