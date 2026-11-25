import "server-only";
import { createClient } from "@/lib/supabase/server";
import { PAID, selectProjects, type TeamProject } from "@/lib/admin/team";
import { PRODUCT_TYPES, type ProductType } from "./commission-rules";
import { loadRates, toDoc, type SalesDoc } from "./sales-docs";
import type { CommercialMe } from "./session";

/*
 * The rep's money screens (handoff pages 04 / 10 / 11): Mes ventes, Mes commissions, Mes clients, Mon profil.
 * A sale = an invoice the rep issued (sales_documents, "émise" or "payée") or a video request assigned to the rep whose
 * deposit is paid (same definition as the admin space). Commissions come from the commissions table (own rows only).
 * Every query is filtered on the rep's id AND runs with their session (RLS) — another rep's data can never appear.
 */

export type CommissionStatus = "en_attente" | "validee" | "a_payer" | "payee";
export type SaleRow = {
  key: string;
  source: "facture" | "video";
  reference: string;
  date: string;
  client: string;
  clientEmail: string | null;
  product: string;
  amountHtCents: number;
  rate: number | null;
  commissionCents: number | null;
  commissionStatus: CommissionStatus | null;
  invoicePaid: boolean;
  /** Commission per product type (for the breakdown). */
  byType: Partial<Record<ProductType, number>>;
};
type CommissionRow = { id: string; project_id: string | null; document_id?: string | null; amount_cents: number; status: CommissionStatus; created_at: string; validated_at: string | null; paid_at: string | null };

const clientOf = (p: TeamProject) => p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";

async function loadContext(me: CommercialMe) {
  const supabase = await createClient();
  const [docsRes, { projects }, rates] = await Promise.all([
    supabase
      .from("sales_documents")
      .select("id, number, kind, status, client_name, client_email, client_siret, client_address, issue_date, due_date, lines, vat_rate, total_ht_cents, total_ttc_cents, commission_cents, notes, quote_id, paid_at, created_at")
      .eq("salesperson_id", me.id)
      .limit(2000),
    selectProjects(supabase, { assigned: { column: "commercial_id", id: me.id }, extra: "items" }, 2000),
    loadRates(),
  ]);
  // document_id exists from migration 012: fall back to the older columns before.
  const withDoc = await supabase.from("commissions").select("id, project_id, document_id, amount_cents, status, created_at, validated_at, paid_at").eq("commercial_id", me.id).limit(5000);
  const comRes = withDoc.error
    ? await supabase.from("commissions").select("id, project_id, amount_cents, status, created_at, validated_at, paid_at").eq("commercial_id", me.id).limit(5000)
    : withDoc;
  const docs: SalesDoc[] = docsRes.error ? [] : (docsRes.data ?? []).map((r) => toDoc(r as Record<string, unknown>));
  const commissions = (comRes.data ?? []) as CommissionRow[];
  return { docsReady: !docsRes.error, docs, projects, commissions, commissionsReady: !comRes.error, rates };
}
type Ctx = Awaited<ReturnType<typeof loadContext>>;

function buildSales(ctx: Ctx): SaleRow[] {
  const byDoc = new Map(ctx.commissions.filter((c) => c.document_id).map((c) => [c.document_id!, c]));
  const byProject = new Map(ctx.commissions.filter((c) => c.project_id).map((c) => [c.project_id!, c]));
  const rows: SaleRow[] = [];

  for (const d of ctx.docs) {
    if (d.kind !== "facture" || (d.status !== "en_attente" && d.status !== "payee")) continue;
    const c = byDoc.get(d.id);
    const byType: Partial<Record<ProductType, number>> = {};
    for (const l of d.lines) byType[l.product_type] = (byType[l.product_type] ?? 0) + (l.total_cents * l.rate) / 100;
    const rates = [...new Set(d.lines.map((l) => Number(l.rate)))];
    rows.push({
      key: `d:${d.id}`,
      source: "facture",
      reference: d.number,
      date: d.paidAt ?? d.issueDate,
      client: d.clientName,
      clientEmail: d.clientEmail,
      product: d.lines.map((l) => l.label).join(" + "),
      amountHtCents: d.totalHtCents,
      rate: rates.length === 1 ? rates[0] : d.totalHtCents ? Math.round((d.commissionCents / d.totalHtCents) * 1000) / 10 : null,
      commissionCents: c ? c.amount_cents : d.commissionCents,
      commissionStatus: c?.status ?? null,
      invoicePaid: d.status === "payee",
      byType,
    });
  }

  for (const p of ctx.projects) {
    if (!PAID.has(p.status)) continue;
    const c = byProject.get(p.id);
    const amount = c?.amount_cents ?? null;
    rows.push({
      key: `p:${p.id}`,
      source: "video",
      reference: p.reference,
      date: p.created_at,
      client: clientOf(p),
      clientEmail: p.email,
      product: (p.items ?? []).map((i) => i.service).filter(Boolean).join(" + ") || "Vidéo",
      amountHtCents: p.total_cents,
      rate: amount !== null && p.total_cents ? Math.round((amount / p.total_cents) * 1000) / 10 : null,
      commissionCents: amount,
      commissionStatus: c?.status ?? null,
      invoicePaid: true,
      byType: amount !== null ? { digital: amount } : {},
    });
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

const monthOf = (iso: string) => iso.slice(0, 7);

/** Mes ventes — the rep's own sales for one month (YYYY-MM). */
export async function loadLedger(me: CommercialMe, month: string | undefined, now = new Date()) {
  const ctx = await loadContext(me);
  const all = buildSales(ctx);
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const selected = month && /^\d{4}-\d{2}$/.test(month) ? month : current;
  const months = [...new Set([current, ...all.map((r) => monthOf(r.date))])].sort().reverse();
  const rows = all.filter((r) => monthOf(r.date) === selected);
  return {
    docsReady: ctx.docsReady,
    month: selected,
    months,
    rows,
    totals: {
      count: rows.length,
      amountHtCents: rows.reduce((s, r) => s + r.amountHtCents, 0),
      commissionCents: rows.reduce((s, r) => s + (r.commissionCents ?? 0), 0),
    },
  };
}

/** Mes commissions — KPIs by status, breakdown by product type, objectives & performance, detail. */
export async function loadMyCommissions(me: CommercialMe) {
  const ctx = await loadContext(me);
  const sales = buildSales(ctx);
  const supabase = await createClient();
  const { data: prospects, error: prospectsError } = await supabase.from("prospects").select("stage").eq("salesperson_id", me.id).limit(5000);

  const sum = (status: CommissionStatus) => ctx.commissions.filter((c) => c.status === status).reduce((s, c) => s + c.amount_cents, 0);
  const breakdown = PRODUCT_TYPES.map((type) => {
    const withType = sales.filter((s) => (s.byType[type] ?? 0) > 0);
    return { type, rate: ctx.rates[type], sales: withType.length, commissionCents: Math.round(withType.reduce((s, r) => s + (r.byType[type] ?? 0), 0)) };
  }).filter((b) => b.sales > 0);

  const won = prospectsError ? null : (prospects ?? []).filter((p) => p.stage === "gagne").length;
  const lost = prospectsError ? null : (prospects ?? []).filter((p) => p.stage === "perdu").length;
  const docKey = new Map(ctx.docs.map((d) => [d.id, d]));
  const projectKey = new Map(ctx.projects.map((p) => [p.id, p]));
  const saleKey = new Map(sales.map((s) => [s.key, s]));

  return {
    commissionsReady: ctx.commissionsReady,
    kpis: { pending: sum("en_attente"), validated: sum("validee"), toPay: sum("a_payer"), paid: sum("payee") },
    breakdown,
    performance: {
      averageBasketCents: sales.length ? Math.round(sales.reduce((s, r) => s + r.amountHtCents, 0) / sales.length) : null,
      conversion: won !== null && lost !== null && won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
      quotesSent: ctx.docs.filter((d) => d.kind === "devis" && d.status !== "brouillon").length,
      invoicesIssued: ctx.docs.filter((d) => d.kind === "facture" && d.status !== "brouillon").length,
      won,
      lost,
    },
    rows: ctx.commissions
      .map((c) => {
        const s = c.document_id ? saleKey.get(`d:${c.document_id}`) : c.project_id ? saleKey.get(`p:${c.project_id}`) : undefined;
        const d = c.document_id ? docKey.get(c.document_id) : undefined;
        const p = c.project_id ? projectKey.get(c.project_id) : undefined;
        return {
          id: c.id,
          date: c.created_at,
          reference: d?.number ?? p?.reference ?? "—",
          client: s?.client ?? (d ? d.clientName : p ? clientOf(p) : "—"),
          product: s?.product ?? "—",
          amountHtCents: s?.amountHtCents ?? null,
          rate: s?.rate ?? null,
          commissionCents: c.amount_cents,
          status: c.status,
          paidAt: c.paid_at,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/** Mes clients — ONLY clients this rep brought in: their converted prospects, their invoices, their paid video requests. */
export async function loadMyClients(me: CommercialMe) {
  const ctx = await loadContext(me);
  const sales = buildSales(ctx);
  const supabase = await createClient();
  const { data: customers } = await supabase.from("customers").select("id, name, company, email, phone, created_at").eq("salesperson_id", me.id).limit(2000);

  type Client = { key: string; name: string; contact: string | null; email: string | null; phone: string | null; sales: number; revenueCents: number; since: string; sources: Set<"prospect" | "facture" | "site"> };
  const map = new Map<string, Client>();
  const keyOf = (email: string | null, name: string) => (email ? `e:${email.toLowerCase()}` : `n:${name.trim().toLowerCase()}`);
  const upsert = (key: string, init: Omit<Client, "key" | "sales" | "revenueCents" | "sources">) => {
    let c = map.get(key);
    if (!c) map.set(key, (c = { key, ...init, sales: 0, revenueCents: 0, sources: new Set() }));
    if (init.since < c.since) c.since = init.since;
    return c;
  };

  for (const cu of customers ?? []) {
    const name = (cu.company as string) || (cu.name as string);
    const c = upsert(keyOf(cu.email as string | null, name), { name, contact: cu.company ? (cu.name as string) : null, email: (cu.email as string | null) ?? null, phone: (cu.phone as string | null) ?? null, since: cu.created_at as string });
    c.sources.add("prospect");
  }
  for (const s of sales) {
    const c = upsert(keyOf(s.clientEmail, s.client), { name: s.client, contact: null, email: s.clientEmail, phone: null, since: s.date });
    c.sales += 1;
    c.revenueCents += s.amountHtCents;
    c.sources.add(s.source === "facture" ? "facture" : "site");
  }
  const clients = [...map.values()].map((c) => ({ ...c, sources: [...c.sources] })).sort((a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name));
  return { clients, totals: { count: clients.length, revenueCents: clients.reduce((s, c) => s + c.revenueCents, 0) } };
}

/** Mon profil — identity, status, monthly target and commission rates (read-only: set by an admin). */
export async function loadMyProfile(me: CommercialMe) {
  return { name: me.name, email: me.email, active: me.profile.active !== false, targetCents: me.profile.monthly_target_cents ?? null, ownRate: me.profile.commission_rate ?? null, rates: await loadRates(), since: me.profile.created_at ?? null };
}
