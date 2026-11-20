import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { loadClientSubscription, type ClientPlan } from "./dashboard";
import type { ClientMe } from "./session";

/*
 * Data of "Facturation" (/dashboard/facturation). Invoices, payment method and customer details come from Stripe,
 * looked up from the Stripe customer stored on the caller's own subscription row (read with their session, RLS).
 * Invoice documents are never linked directly: the page links to /dashboard/facturation/facture/<id>, which
 * re-checks that the invoice belongs to the signed-in customer before redirecting to Stripe's document.
 * No card data is stored or handled here: only the brand / last digits Stripe returns for display.
 */

export type InvoiceStatus = "upcoming" | "paid" | "open" | "uncollectible";

export type InvoiceRow = {
  /** Stripe invoice id — null for the upcoming payment (no document yet). */
  id: string | null;
  number: string | null;
  /** ISO date the invoice was issued (or the planned payment date). */
  date: string;
  periodStart: string | null;
  periodEnd: string | null;
  amountCents: number;
  status: InvoiceStatus;
  hasPdf: boolean;
};

export type PaymentMethodInfo = { kind: string; label: string; detail: string | null };

export type BillingProfile = {
  fullName: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  taxId: string;
  email: string;
};

export type ClientBilling = {
  plan: ClientPlan | null;
  invoices: InvoiceRow[];
  hasMore: boolean;
  paymentMethod: PaymentMethodInfo | null;
  /** Unpaid invoice to settle (status open, past due). */
  openInvoiceId: string | null;
  profile: BillingProfile;
  /** billing_profiles exists (migration 017) — the form can be saved. */
  profileReady: boolean;
  stripeCustomer: boolean;
  live: boolean;
};

const PAGE_SIZE = 12;
const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);
const invoiceHt = (inv: Stripe.Invoice) => inv.total_excluding_tax ?? inv.total;

const BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cartes_bancaires: "Carte Bancaire",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  unionpay: "UnionPay",
};

function describe(pm: Stripe.PaymentMethod | null): PaymentMethodInfo | null {
  if (!pm) return null;
  switch (pm.type) {
    case "card": {
      const c = pm.card!;
      const brand = BRANDS[c.display_brand ?? c.brand] ?? BRANDS[c.brand] ?? "Carte";
      return { kind: "card", label: `${brand} •••• ${c.last4}`, detail: `Expire le ${String(c.exp_month).padStart(2, "0")}/${String(c.exp_year).slice(-2)}` };
    }
    case "sepa_debit":
      return { kind: "sepa", label: `SEPA •••• ${pm.sepa_debit?.last4 ?? ""}`.trim(), detail: "Prélèvement SEPA" };
    case "paypal":
      return { kind: "paypal", label: "PayPal", detail: pm.paypal?.payer_email ?? null };
    case "revolut_pay":
      return { kind: "revolut", label: "Revolut Pay", detail: null };
    case "link":
      return { kind: "link", label: "Link", detail: pm.link?.email ?? null };
    default:
      return { kind: pm.type, label: pm.type, detail: null };
  }
}

const asPm = (v: string | Stripe.PaymentMethod | null | undefined) => (v && typeof v === "object" ? v : null);

function invoicePeriod(inv: Stripe.Invoice) {
  // The subscription line carries the period actually billed (the invoice's own period is the previous one).
  const line = inv.lines?.data.find((l) => l.amount > 0) ?? inv.lines?.data[0];
  return { start: iso(line?.period?.start ?? inv.period_start), end: iso(line?.period?.end ?? inv.period_end) };
}

function toRow(inv: Stripe.Invoice): InvoiceRow {
  const period = invoicePeriod(inv);
  return {
    id: inv.id ?? null,
    number: inv.number ?? null,
    date: iso(inv.status_transitions?.finalized_at ?? inv.created)!,
    periodStart: period.start,
    periodEnd: period.end,
    amountCents: invoiceHt(inv),
    status: inv.status === "paid" ? "paid" : inv.status === "uncollectible" ? "uncollectible" : "open",
    hasPdf: Boolean(inv.invoice_pdf),
  };
}

/** Billing details: the saved profile, else what Stripe / the account already knows. One rule for every page. */
function buildBillingProfile(r: Record<string, string | null> | null, customer: Stripe.Customer | null, me: ClientMe): BillingProfile {
  const addr = customer?.address;
  return {
    fullName: r?.full_name ?? (customer?.metadata?.billing_contact || me.name),
    company: r?.company ?? (customer?.metadata?.company || ""),
    addressLine1: r?.address_line1 ?? addr?.line1 ?? "",
    addressLine2: r?.address_line2 ?? addr?.line2 ?? "",
    postalCode: r?.postal_code ?? addr?.postal_code ?? "",
    city: r?.city ?? addr?.city ?? "",
    country: r?.country ?? addr?.country ?? "FR",
    taxId: r?.tax_id ?? "",
    email: r?.email ?? customer?.email ?? me.email,
  };
}

/**
 * Billing details only (Mon compte): the same values as the Billing page. Stripe is asked only when nothing is
 * saved yet, to prefill from the checkout details.
 */
export async function loadBillingProfile(me: ClientMe): Promise<{ profile: BillingProfile; ready: boolean }> {
  const read = await readProfile(me.id);
  let customer: Stripe.Customer | null = null;
  const stripe = getStripe();
  if (!read.row && stripe) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", me.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const id = data?.stripe_customer_id as string | undefined;
    if (id) {
      try {
        const c = await stripe.customers.retrieve(id);
        customer = "deleted" in c && c.deleted ? null : (c as Stripe.Customer);
      } catch (cause) {
        console.error("Billing profile: Stripe lookup failed:", cause);
      }
    }
  }
  return { profile: buildBillingProfile(read.row, customer, me), ready: read.ready };
}

/** The customer's billing profile row (null when none / table missing), read with their own session. */
async function readProfile(meId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("billing_profiles").select("*").eq("user_id", meId).maybeSingle();
  if (error) return { ready: false, row: null };
  return { ready: true, row: data as Record<string, string | null> | null };
}

/** All Stripe customer ids of the caller (own rows only, RLS) — used to authorize invoice access. */
export async function myStripeCustomerIds(meId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", meId).not("stripe_customer_id", "is", null);
  if (error) throw new Error(`Billing: customer lookup failed: ${error.message}`);
  return [...new Set((data ?? []).map((r) => r.stripe_customer_id as string))];
}

export async function loadClientBilling(me: ClientMe, opts: { before?: string } = {}): Promise<ClientBilling> {
  const [{ plan, live: planLive }, profileRead] = await Promise.all([loadClientSubscription(me, { history: false }), readProfile(me.id)]);

  // Latest customer = the one on the newest subscription.
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", me.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const customerId = (latest?.stripe_customer_id as string | undefined) ?? null;
  const subscriptionId = (latest?.stripe_subscription_id as string | undefined) ?? null;

  const stripe = getStripe();
  let invoices: InvoiceRow[] = [];
  let hasMore = false;
  let paymentMethod: PaymentMethodInfo | null = null;
  let customer: Stripe.Customer | null = null;
  let live = false;

  if (stripe && customerId) {
    try {
      // A "before" cursor must be one of this customer's invoices (ids from the URL are untrusted).
      const before = opts.before && /^in_[A-Za-z0-9]+$/.test(opts.before) ? opts.before : undefined;
      const [cust, sub, list] = await Promise.all([
        stripe.customers.retrieve(customerId, { expand: ["invoice_settings.default_payment_method"] }),
        subscriptionId ? stripe.subscriptions.retrieve(subscriptionId, { expand: ["default_payment_method"] }).catch(() => null) : Promise.resolve(null),
        stripe.invoices.list({ customer: customerId, limit: PAGE_SIZE, ...(before ? { starting_after: before } : {}) }),
      ]);
      customer = "deleted" in cust && cust.deleted ? null : (cust as Stripe.Customer);
      let pm = asPm(sub?.default_payment_method) ?? asPm(customer?.invoice_settings?.default_payment_method);
      if (!pm && customer) pm = (await stripe.customers.listPaymentMethods(customerId, { limit: 1 })).data[0] ?? null;
      paymentMethod = describe(pm);
      invoices = list.data.filter((inv) => inv.status !== "draft" && inv.status !== "void" && inv.id).map(toRow);
      hasMore = list.has_more;
      live = true;
    } catch (cause) {
      console.error("Billing: Stripe lookup failed:", cause);
    }
  }

  // Upcoming payment first (first page only): no document until Stripe issues the invoice.
  if (!opts.before && plan && plan.nextAmountCents != null && plan.periodEnd && plan.status !== "canceled" && !plan.cancelAtPeriodEnd) {
    const end = new Date(plan.periodEnd);
    const next = new Date(end);
    if (plan.interval === "year") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
    invoices.unshift({
      id: null,
      number: null,
      date: plan.periodEnd,
      periodStart: plan.periodEnd,
      periodEnd: next.toISOString(),
      amountCents: plan.nextAmountCents,
      status: "upcoming",
      hasPdf: false,
    });
  }

  const profile = buildBillingProfile(profileRead.row, customer, me);

  return {
    plan,
    invoices,
    hasMore,
    paymentMethod,
    openInvoiceId: invoices.find((i) => i.status === "open" && i.id)?.id ?? null,
    profile,
    profileReady: profileRead.ready,
    stripeCustomer: Boolean(customerId),
    live: live || planLive,
  };
}
