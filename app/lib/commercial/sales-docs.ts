import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RATES, PRODUCT_TYPES, type DocKind, type DocStatus, type ProductType } from "./commission-rules";
import type { CommercialMe } from "./session";

/*
 * Quotes & invoices of the signed-in rep (migration 012). Filtered on the rep's id AND read with their session (RLS).
 * Totals, VAT and commission come from the database (recomputed by a trigger from the lines and commission_rates).
 */

export type DocLine = { catalogue_id: string | null; label: string; detail: string; product_type: ProductType; qty: number; unit_cents: number; rate: number; total_cents: number };
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
  notes: string | null;
  quoteId: string | null;
  paidAt: string | null;
  createdAt: string;
};

const COLUMNS =
  "id, number, kind, status, client_name, client_email, client_siret, client_address, issue_date, due_date, lines, vat_rate, total_ht_cents, total_ttc_cents, commission_cents, notes, quote_id, paid_at, created_at";

type Row = Record<string, unknown>;
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
  lines: (r.lines as DocLine[]) ?? [],
  vatRate: Number(r.vat_rate ?? 20),
  totalHtCents: Number(r.total_ht_cents ?? 0),
  totalTtcCents: Number(r.total_ttc_cents ?? 0),
  commissionCents: Number(r.commission_cents ?? 0),
  notes: (r.notes as string | null) ?? null,
  quoteId: (r.quote_id as string | null) ?? null,
  paidAt: (r.paid_at as string | null) ?? null,
  createdAt: r.created_at as string,
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
  const { data, error } = await supabase.from("sales_documents").select(COLUMNS).eq("salesperson_id", me.id).order("created_at", { ascending: false }).limit(1000);
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
  const { data } = await supabase.from("sales_documents").select(COLUMNS).eq("id", id).eq("salesperson_id", me.id).maybeSingle();
  return data ? toDoc(data as Row) : null;
}

/**
 * One quote or invoice by id, for the admin preview. No salesperson filter: RLS returns the row to an admin
 * and only the owner's row to a commercial.
 */
export async function loadSalesDocById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sales_documents").select(COLUMNS).eq("id", id).maybeSingle();
  return data ? toDoc(data as Row) : null;
}

/** The rep's customers (converted prospects), offered to pre-fill the client block. */
export async function loadClientChoices(me: CommercialMe) {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id, name, company, email").eq("salesperson_id", me.id).order("created_at", { ascending: false }).limit(300);
  return (data ?? []).map((c) => ({ id: c.id as string, name: (c.company as string) || (c.name as string), email: (c.email as string | null) ?? "" }));
}
