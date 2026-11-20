import { NextResponse } from "next/server";
import { myStripeCustomerIds } from "@/lib/client/billing";
import { getClientMe } from "@/lib/client/session";
import { getStripe } from "@/lib/stripe";
import { redirectToPath } from "@/lib/supabase/env";

/*
 * Invoice preview / download for the client space: /dashboard/facturation/facture/<stripe invoice id>?format=pdf
 * The invoice is fetched from Stripe on the server and served only if it belongs to one of the signed-in
 * customer's own Stripe customers (subscriptions rows read with their session, RLS). Anyone else gets a 404 —
 * the same answer as for an id that does not exist, so ids cannot be probed.
 *   (default)   → Stripe's hosted invoice page (view, pay if open, download)
 *   format=pdf  → the invoice PDF
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getClientMe();
  if (!me) return redirectToPath("/connexion?redirectTo=/dashboard/facturation", 303);

  const { id } = await params;
  const notFound = () => new NextResponse("Facture introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!/^in_[A-Za-z0-9]{8,64}$/.test(id)) return notFound();

  const stripe = getStripe();
  if (!stripe) return redirectToPath("/dashboard/facturation?portal=unavailable", 303);

  let invoice;
  try {
    invoice = await stripe.invoices.retrieve(id);
  } catch {
    return notFound();
  }
  const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const mine = await myStripeCustomerIds(me.id);
  if (!customer || !mine.includes(customer)) return notFound();

  const pdf = new URL(request.url).searchParams.get("format") === "pdf";
  const target = pdf ? invoice.invoice_pdf : invoice.hosted_invoice_url;
  if (!target) return notFound();
  const res = NextResponse.redirect(target, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
