import { NextResponse } from "next/server";
import { readEarlyStartFromContact } from "@/config/withdrawal";
import { sendProjectEmails } from "@/lib/projects/emails";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * After Stripe Checkout returns to /confirmation?paid=1, ensure the client got the paid e-mail.
 * The webhook usually sends it; this covers delayed/missed webhooks. Resend Idempotency-Key
 * (project-client:deposit_paid:<ref>) prevents a duplicate when both paths run.
 */

type Body = { ref?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ref = String(body.ref ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
  if (!/^AKU-[A-Z0-9]+$/.test(ref)) return NextResponse.json({ ok: false }, { status: 400 });

  const db = createAdminClient();
  const { data: project } = await db
    .from("video_projects")
    .select("id, reference, kind, status, contact, items, total_cents, deposit_cents, stripe_checkout_session_id")
    .eq("reference", ref)
    .maybeSingle();
  if (!project) return NextResponse.json({ ok: true, sent: false });

  let paid = project.status === "acompte_paye";
  const stripe = getStripe();
  const sessionId = project.stripe_checkout_session_id as string | null;
  if (!paid && stripe && sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        await db.from("video_projects").update({ status: "acompte_paye" }).eq("id", project.id);
        paid = true;
      }
    } catch (cause) {
      console.error("confirm-mail Stripe retrieve failed:", cause);
    }
  }
  if (!paid) return NextResponse.json({ ok: true, sent: false });

  const contact = (project.contact ?? {}) as Record<string, string>;
  if (!contact.email) return NextResponse.json({ ok: true, sent: false });

  await sendProjectEmails(
    {
      reference: project.reference,
      kind: project.kind === "acompte" ? "acompte" : "devis",
      contact,
      items: (project.items ?? []) as { service: string; details: string; price: number }[],
      total: (project.total_cents ?? 0) / 100,
      deposit: (project.deposit_cents ?? 0) / 100,
      earlyStart: readEarlyStartFromContact(contact),
    },
    "deposit_paid",
  );

  return NextResponse.json({ ok: true, sent: true });
}
