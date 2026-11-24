import { NextResponse } from "next/server";
import { getClientMe } from "@/lib/client/session";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { redirectToPath } from "@/lib/supabase/env";

export const runtime = "nodejs";

/*
 * "Exporter mes données" (GDPR art. 15 / 20): a JSON file with the personal data AK Universe holds about the
 * signed-in customer. Every table is read with THEIR session, so RLS returns only their own rows; internal
 * technical fields (locks, pending-change bookkeeping) are left out. Generated on demand, never stored, no cache.
 */

const INTERNAL = new Set(["change_lock_until", "pending_invoice_id", "stripe_checkout_session_id", "code_hash"]);
const strip = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([k]) => !INTERNAL.has(k)));

export async function GET() {
  const me = await getClientMe();
  if (!me) return redirectToPath("/connexion?redirectTo=/client/dashboard/mon-compte", 303);

  const supabase = await createClient();
  const [{ data: auth }, profile, billing, memberships, subscriptions, payments, projects, notifications] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("*").eq("id", me.id).maybeSingle(),
    supabase.from("billing_profiles").select("*").eq("user_id", me.id).maybeSingle(),
    supabase.from("organization_members").select("role, created_at, organizations (name, sector, size, created_at)").eq("user_id", me.id),
    supabase.from("subscriptions").select("*").eq("user_id", me.id).order("created_at", { ascending: true }),
    supabase.from("payments").select("kind, amount_cents, currency, status, created_at").eq("user_id", me.id).order("created_at", { ascending: true }),
    supabase.from("video_projects").select("reference, kind, status, contact, items, total_cents, deposit_cents, created_at").eq("user_id", me.id).order("created_at", { ascending: true }),
    supabase.from("notifications").select("type, data, created_at, read_at").eq("user_id", me.id).order("created_at", { ascending: true }),
  ]);

  // Invoices issued by the payment provider for this customer's own Stripe customers.
  const invoices: Record<string, unknown>[] = [];
  const stripe = getStripe();
  const customers = [...new Set((subscriptions.data ?? []).map((s) => s.stripe_customer_id as string | null).filter(Boolean) as string[])];
  if (stripe) {
    for (const customer of customers) {
      try {
        const list = await stripe.invoices.list({ customer, limit: 100 });
        for (const inv of list.data) {
          if (inv.status === "draft") continue;
          invoices.push({ number: inv.number, status: inv.status, total_cents: inv.total, currency: inv.currency, created_at: new Date(inv.created * 1000).toISOString() });
        }
      } catch (cause) {
        console.error("Data export: invoices unavailable:", cause);
      }
    }
  }

  const user = auth.user;
  const payload = {
    generated_at: new Date().toISOString(),
    account: user && {
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      sign_in_methods: [...new Set((user.identities ?? []).map((i) => i.provider))],
      two_factor_enabled: Boolean(user.factors?.some((f) => f.status === "verified")),
    },
    profile: profile.data ? strip(profile.data as Record<string, unknown>) : null,
    billing_details: billing.data ? strip(billing.data as Record<string, unknown>) : null,
    organizations: memberships.data ?? [],
    subscriptions: (subscriptions.data ?? []).map((s) => strip(s as Record<string, unknown>)),
    payments: payments.data ?? [],
    invoices,
    video_projects: projects.data ?? [],
    notifications: notifications.data ?? [],
  };

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ak-universe-mes-donnees-${day}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
