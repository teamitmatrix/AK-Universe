import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RATES, PRODUCT_TYPES, type DocKind, type DocStatus, type ProductType } from "./commission-rules";
import type { CommercialMe } from "./session";

/*
 * Quotes & invoices of the signed-in rep (migration 012). Filtered on the rep's id AND read with their session (RLS).
 * Totals, VAT and commission come from the database (recomputed by a trigger from the lines and commission_rates).
 */

export type DocLine = {
  catalogue_id: string | null;
  label: string;
  detail: string;
  product_type: ProductType;
  qty: number;
  unit_cents: number;
  rate: number;
  /** Flat fee for the line (cents); when set, replaces the percentage commission for that line. */
  fixed_commission_cents: number | null;
  total_cents: number;
};
export type SalesDoc = {
  id: string;
  number: string;
  kind: DocKind;
  status: DocStatus;
  clientName: string;
  clientEmail: string | null;
  clientSiret: string | null;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string | null;
  lines: DocLine[];
  vatRate: number;
  totalHtCents: number;
  totalTtcCents: number;
  commissionCents: number;
  /** HT already collected (partial or full). Migration 014. */
  amountPaidCents: number;
  notes: string | null;
  quoteId: string | null;
  paidAt: string | null;
  createdAt: string;
  /** PNG data URL — electronic acceptance of a devis (migration 023). */
  clientSignature: string | null;
  signerName: string | null;
  signedAt: string | null;
};

const COLUMNS_BASE =
  "id, number, kind, status, client_name, client_email, client_siret, client_address, issue_date, due_date, lines, vat_rate, total_ht_cents, total_ttc_cents, commission_cents, notes, quote_id, paid_at, created_at";
const COLUMNS = `${COLUMNS_BASE}, amount_paid_cents, client_signature, signer_name, signed_at`;

type Row = Record<string, unknown>;
const toLine = (l: Record<string, unknown>): DocLine => ({
  catalogue_id: (l.catalogue_id as string | null) ?? null,
  label: String(l.label ?? ""),
  detail: String(l.detail ?? ""),
  product_type: l.product_type as ProductType,
  qty: Number(l.qty ?? 0),
  unit_cents: Number(l.unit_cents ?? 0),
  rate: Number(l.rate ?? 0),
  fixed_commission_cents: l.fixed_commission_cents == null || l.fixed_commission_cents === "" ? null : Number(l.fixed_commission_cents),
  total_cents: Number(l.total_cents ?? 0),
});
export const toDoc = (r: Row): SalesDoc => ({
  id: r.id as string,
  number: (r.number as string) ?? "—",
  kind: r.kind as DocKind,
  status: r.status as DocStatus,
  clientName: r.client_name as string,
  clientEmail: (r.client_email as string | null) ?? null,
  clientSiret: (r.client_siret as string | null) ?? null,
  clientAddress: (r.client_address as string | null) ?? null,
  issueDate: r.issue_date as string,
  dueDate: (r.due_date as string | null) ?? null,
  lines: Array.isArray(r.lines) ? (r.lines as Record<string, unknown>[]).map(toLine) : [],
  vatRate: Number(r.vat_rate ?? 20),
  totalHtCents: Number(r.total_ht_cents ?? 0),
  totalTtcCents: Number(r.total_ttc_cents ?? 0),
  commissionCents: Number(r.commission_cents ?? 0),
  amountPaidCents: Number(r.amount_paid_cents ?? 0),
  notes: (r.notes as string | null) ?? null,
  quoteId: (r.quote_id as string | null) ?? null,
  paidAt: (r.paid_at as string | null) ?? null,
  createdAt: r.created_at as string,
  clientSignature: typeof r.client_signature === "string" && r.client_signature.startsWith("data:image/") ? r.client_signature : null,
  signerName: (r.signer_name as string | null) ?? null,
  signedAt: (r.signed_at as string | null) ?? null,
});

/** Rates applied by the database (commission_rates), with the handoff defaults before migration 012. */
export async function loadRates(): Promise<Record<ProductType, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("commission_rates").select("product_type, rate");
  const rates = { ...DEFAULT_RATES };
  if (!error) for (const r of data ?? []) if ((PRODUCT_TYPES as readonly string[]).includes(r.product_type)) rates[r.product_type as ProductType] = Number(r.rate);
  return rates;
}

export async function loadSalesDocs(me: CommercialMe) {
  const supabase = await createClient();
  const primary = await supabase.from("sales_documents").select(COLUMNS).eq("salesperson_id", me.id).order("created_at", { ascending: false }).limit(1000);
  // Before migration 014 / 023 some columns do not exist yet.
  const fallback =
    primary.error && /amount_paid_cents|client_signature|signer_name|signed_at/.test(primary.error.message)
      ? await supabase.from("sales_documents").select(COLUMNS_BASE).eq("salesperson_id", me.id).order("created_at", { ascending: false }).limit(1000)
      : null;
  const data = fallback?.data ?? primary.data;
  const error = fallback ? fallback.error : primary.error;
  if (error) return { ready: false as const };
  const docs = (data ?? []).map((r) => toDoc(r as Row));
  const quotes = docs.filter((d) => d.kind === "devis");
  const invoices = docs.filter((d) => d.kind === "facture");
  const openQuotes = quotes.filter((d) => d.status === "brouillon" || d.status === "en_attente");
  return {
    ready: true as const,
    docs,
    kpis: {
      openQuotes: openQuotes.length,
      potentialCents: openQuotes.reduce((s, d) => s + d.totalTtcCents, 0),
      toCollectCents: invoices.filter((d) => d.status === "en_attente").reduce((s, d) => s + d.totalTtcCents, 0),
      invoicedCents: invoices.filter((d) => d.status === "en_attente" || d.status === "payee").reduce((s, d) => s + d.totalTtcCents, 0),
    },
  };
}

/** One of the rep's documents, or null (not theirs / does not exist). */
export async function loadSalesDoc(me: CommercialMe, id: string) {
  const supabase = await createClient();
  let { data, error } = await supabase.from("sales_documents").select(COLUMNS).eq("id", id).eq("salesperson_id", me.id).maybeSingle();
  if (error && /amount_paid_cents|client_signature|signer_name|signed_at/.test(error.message)) {
    ({ data, error } = await supabase.from("sales_documents").select(COLUMNS_BASE).eq("id", id).eq("salesperson_id", me.id).maybeSingle());
  }
  return !error && data ? toDoc(data as Row) : null;
}

/**
 * One quote or invoice by id, for the admin preview. No salesperson filter: RLS returns the row to an admin
 * and only the owner's row to a commercial.
 */
export async function loadSalesDocById(id: string) {
  const supabase = await createClient();
  let { data, error } = await supabase.from("sales_documents").select(COLUMNS).eq("id", id).maybeSingle();
  if (error && /amount_paid_cents|client_signature|signer_name|signed_at/.test(error.message)) {
    ({ data, error } = await supabase.from("sales_documents").select(COLUMNS_BASE).eq("id", id).maybeSingle());
  }
  return !error && data ? toDoc(data as Row) : null;
}

/** The rep's customers (converted prospects / auto-registered from devis), offered to pre-fill the client block. */
export async function loadClientChoices(me: CommercialMe) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name, company, email, phone")
    .eq("salesperson_id", me.id)
    .order("created_at", { ascending: false })
    .limit(300);
  const seen = new Set<string>();
  const choices: { id: string; name: string; email: string; phone: string }[] = [];
  for (const c of data ?? []) {
    const name = ((c.company as string) || (c.name as string) || "").trim();
    const key = name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    choices.push({
      id: c.id as string,
      name,
      email: (c.email as string | null) ?? "",
      phone: (c.phone as string | null) ?? "",
    });
  }
  return choices;
}
