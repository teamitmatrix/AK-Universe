import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { markProjectProspectWon } from "@/lib/commercial/project-prospects";
import { notifyProjectPayment } from "@/lib/notify";
import { sendProjectEmails } from "@/lib/projects/emails";
import { notifyClient } from "@/lib/client/client-notify";
import { applyPendingChange } from "@/lib/client/subscription-sync";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Stripe → Supabase sync. Configure in the Stripe dashboard:
 *   endpoint  https://<domain>/api/stripe/webhook
 *             Use the host that matches the TLS certificate SANs (apex vs www). Stripe fails with
 *             a TLS error if the webhook host is not on the cert — deliveries never reach this route.
 *   events    checkout.session.completed, customer.subscription.updated,
 *             customer.subscription.deleted, invoice.paid, invoice.payment_failed
 * invoice.paid also applies client-space plan changes waiting for a renewal or a prorated payment (/client/dashboard/mon-offre).
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
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        // Period end is nice-to-have: never block activation if retrieve fails.
        let periodEnd: string | null = null;
        if (subscriptionId) {
          try {
            const end = (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0]?.current_period_end;
            if (end) periodEnd = new Date(end * 1000).toISOString();
          } catch (cause) {
            console.error("webhook: could not read subscription period end:", cause);
          }
        }
        const { error: activateErr } = await db
          .from("subscriptions")
          .update({
            status: "active",
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            current_period_end: periodEnd,
          })
          .eq("id", meta.subscription_id);
        if (activateErr) console.error("webhook: subscription activate failed:", activateErr.message);
        const { data: payment, error: payErr } = await db
          .from("payments")
          .insert({
            kind: "subscription",
            user_id: meta.user_id ?? null,
            subscription_id: meta.subscription_id,
            amount_cents: session.amount_total ?? 0,
            currency: session.currency ?? "eur",
            status: session.payment_status,
            stripe_event_id: event.id,
            stripe_object_id: session.id,
          })
          .select("id")
          .single();
        if (payErr) console.error("webhook: subscription payment insert failed:", payErr.message);
        // Recurring commission (Agents IA rate) when a sales rep is linked to the subscription / customer.
        if (payment?.id) await db.rpc("ensure_subscription_commission", { p_payment_id: payment.id });
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
          // Admin CRM + in-app / e-mail notifications (idempotent per Stripe session).
          after(() => markProjectProspectWon(meta.project_id!));
          after(() => notifyProjectPayment("quote_accepted", meta.project_id!, session.amount_total ?? 0, `deposit:${session.id}`));
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
                // Early-start consent is stored on contact jsonb at checkout.
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
      const status = SUBSCRIPTION_STATUS[sub.status] ?? "incomplete";
      const periodIso = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
      // Prefer Stripe id; if checkout.session.completed never ran, fall back to our row id in subscription metadata.
      let matched = (
        await db
          .from("subscriptions")
          .update({ status, current_period_end: periodIso })
          .eq("stripe_subscription_id", sub.id)
          .select("id")
      ).data;
      if (!matched?.length && sub.metadata?.subscription_id) {
        matched = (
          await db
            .from("subscriptions")
            .update({
              status,
              current_period_end: periodIso,
              stripe_subscription_id: sub.id,
              stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
            })
            .eq("id", sub.metadata.subscription_id)
            .select("id")
        ).data;
      }
      // Scheduled cancellation (client space or Stripe portal). Separate write: before migration 016 the column
      // does not exist and this update fails alone, without touching the status sync above.
      if (matched?.length) {
        const { error: cancelErr } = await db
          .from("subscriptions")
          .update({ cancel_at_period_end: Boolean(sub.cancel_at_period_end || sub.cancel_at) })
          .eq("id", matched[0].id);
        if (cancelErr && !/cancel_at_period_end/.test(cancelErr.message)) console.error("cancel_at_period_end sync failed:", cancelErr.message);
      }
      break;
    }

    case "invoice.paid": {
      // Renewals (and sometimes the first invoice): record a subscription payment + commission.
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
        parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
      };
      const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
      const stripeSubId = typeof subRef === "string" ? subRef : subRef?.id;
      // First invoice used to be skipped (checkout.session.completed only). If that event never landed,
      // activate from this paid invoice using the Stripe subscription metadata we set at checkout.
      if (invoice.billing_reason === "subscription_create" && stripeSubId) {
        try {
          const live = await stripe.subscriptions.retrieve(stripeSubId);
          const ourId = live.metadata?.subscription_id;
          if (ourId) {
            const end = live.items.data[0]?.current_period_end;
            await db
              .from("subscriptions")
              .update({
                status: "active",
                stripe_subscription_id: stripeSubId,
                stripe_customer_id: typeof live.customer === "string" ? live.customer : live.customer?.id ?? null,
                current_period_end: end ? new Date(end * 1000).toISOString() : null,
              })
              .eq("id", ourId);
          }
        } catch (cause) {
          console.error("webhook: subscription_create activate failed:", cause);
        }
        // Still record the payment below when we can resolve the row.
      }
      if (stripeSubId && invoice.billing_reason !== "subscription_create") {
        // Client-space plan changes (migration 016): a renewal applies the change scheduled for it; a paid prorated
        // invoice applies the upgrade that was waiting for its payment. No-op when nothing is pending.
        const { data: pendingRow } = await db
          .from("subscriptions")
          .select("id, pending_kind, pending_invoice_id")
          .eq("stripe_subscription_id", stripeSubId)
          .maybeSingle();
        const pend = pendingRow as { id: string; pending_kind: string | null; pending_invoice_id: string | null } | null;
        if (pend?.pending_kind === "renewal" && invoice.billing_reason === "subscription_cycle") await applyPendingChange(db, pend.id, "renewal");
        if (pend?.pending_kind === "payment" && pend.pending_invoice_id && pend.pending_invoice_id === invoice.id) await applyPendingChange(db, pend.id, "payment");
      }
      if (!stripeSubId || !invoice.amount_paid) break;
      let { data: subRow } = await db.from("subscriptions").select("id, user_id").eq("stripe_subscription_id", stripeSubId).maybeSingle();
      if (!subRow) {
        try {
          const live = await stripe.subscriptions.retrieve(stripeSubId);
          const ourId = live.metadata?.subscription_id;
          if (ourId) {
            const found = await db.from("subscriptions").select("id, user_id").eq("id", ourId).maybeSingle();
            subRow = found.data;
          }
        } catch {
          /* ignore */
        }
      }
      if (!subRow) break;
      const { data: payment, error: payErr } = await db
        .from("payments")
        .insert({
          kind: "subscription",
          user_id: subRow.user_id,
          subscription_id: subRow.id,
          amount_cents: invoice.amount_paid,
          currency: invoice.currency ?? "eur",
          status: "paid",
          stripe_event_id: event.id,
          stripe_object_id: invoice.id,
        })
        .select("id")
        .single();
      if (payErr || !payment?.id) {
        // Unique stripe_event_id → already processed; ignore.
        break;
      }
      await db.rpc("ensure_subscription_commission", { p_payment_id: payment.id });
      // "Factures et paiements" e-mail to the customer (only if they kept it on in Mon compte → Notifications).
      if (subRow.user_id) {
        const amount = (invoice.amount_paid / 100).toLocaleString("fr-FR", { style: "currency", currency: (invoice.currency ?? "eur").toUpperCase() });
        after(() =>
          notifyClient(subRow.user_id as string, "billing", "Paiement reçu — AK Universe", [
            `Nous avons bien reçu votre paiement de ${amount}${invoice.number ? ` (facture ${invoice.number})` : ""}.`,
            "Votre facture est disponible dans votre espace client, rubrique Facturation.",
          ])
        );
      }
      break;
    }

    case "invoice.payment_failed": {
      // Failed renewal / prorated payment: warn the customer ("Factures et paiements" preference).
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | { id: string } | null;
        parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
      };
      const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
      const stripeSubId = typeof subRef === "string" ? subRef : subRef?.id;
      if (!stripeSubId) break;
      // A repeated delivery of this event must not e-mail the customer twice (migration 020).
      const { error: seenErr } = await db.from("stripe_webhook_events").insert({ id: event.id, type: event.type });
      if (seenErr?.code === "23505") break;
      const { data: subRow } = await db.from("subscriptions").select("user_id").eq("stripe_subscription_id", stripeSubId).maybeSingle();
      if (subRow?.user_id) {
        after(() =>
          notifyClient(subRow.user_id as string, "billing", "Échec de paiement — AK Universe", [
            "Le prélèvement de votre abonnement AK Universe n'a pas pu être effectué.",
            "Mettez à jour votre moyen de paiement depuis votre espace client (Facturation → Moyen de paiement) pour conserver l'accès à vos agents.",
          ])
        );
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
