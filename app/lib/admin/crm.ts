import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OPEN_QUOTE, PAID, displayName, selectProjects, type Commission, type SchemaLevel, type StaffProfile, type TeamProject } from "./team";

/**
 * Company-wide CRM and finance screens (clients, prospects, sales ledger, quotes & invoices, commissions),
 * all derived from the existing tables — video_projects, payments, subscriptions, profiles, commissions —
 * with no parallel store. Every query runs with the admin's session, so RLS (is_admin()) applies.
 *
 * Vocabulary, as the site actually works:
 *   prospect = a video request (quote or booking) not paid yet (status nouveau / acompte_en_attente)
 *   sale     = a video project whose deposit is paid, or a paid Agents IA subscription payment
 *   client   = anyone with at least one sale
 *   invoice  = a payment recorded in `payments` (Stripe deposit / subscription, or a balance recorded by an admin)
 */

type Payment = {
  id: string;
  user_id: string | null;
  kind: "subscription" | "deposit" | "balance";
  subscription_id: string | null;
  project_id: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
  stripe_object_id: string | null;
};
type Subscription = { id: string; user_id: string; plan: string; cycle: string; status: string; monthly_total_cents: number; created_at: string };
type Person = { id: string; email: string; first_name: string | null; last_name: string | null };

const DAY = 86_400_000;
const sum = <T>(rows: T[], pick: (r: T) => number) => rows.reduce((total, r) => total + pick(r), 0);
const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const norm = (v: string | null | undefined) => (v ?? "").toLowerCase();
const startOfMonth = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);

export const projectClient = (p: Pick<TeamProject, "company" | "first_name" | "last_name" | "email">) =>
  p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
export const projectContact = (p: Pick<TeamProject, "first_name" | "last_name" | "email">) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
const needOf = (p: TeamProject) => (p.items ?? []).map((i) => i.service).filter(Boolean).join(" + ") || "—";

/** Everything the five screens need, loaded once per request. */
async function loadContext() {
  const supabase = await createClient();
  const [{ projects, level }, paymentsRes, subsRes, staffRes, commissionsRes] = await Promise.all([
    selectProjects(supabase, { extra: "items" }, 5000),
    supabase.from("payments").select("id, user_id, kind, subscription_id, project_id, amount_cents, status, created_at, stripe_object_id").order("created_at", { ascending: false }).limit(10000),
    supabase.from("subscriptions").select("id, user_id, plan, cycle, status, monthly_total_cents, created_at").limit(10000),
    supabase.from("profiles").select("*").eq("role", "commercial").order("first_name"),
    supabase.from("commissions").select("id, commercial_id, project_id, amount_cents, status, created_at, validated_at, paid_at").order("created_at", { ascending: false }).limit(10000),
  ]);
  const payments = ((paymentsRes.data ?? []) as Payment[]).filter((p) => p.status === "paid");
  const subs = (subsRes.data ?? []) as Subscription[];
  const commerciaux = (staffRes.data ?? []) as StaffProfile[];
  const commissions = commissionsRes.error ? null : ((commissionsRes.data ?? []) as (Commission & { validated_at: string | null; paid_at: string | null })[]);

  // Names of subscription clients (accounts), fetched only for the accounts concerned.
  const userIds = [...new Set([...subs.map((s) => s.user_id), ...payments.map((p) => p.user_id).filter((x): x is string => !!x)])];
  const people = new Map<string, Person>();
  for (let i = 0; i < userIds.length; i += 200) {
    const { data } = await supabase.from("profiles").select("id, email, first_name, last_name").in("id", userIds.slice(i, i + 200));
    for (const p of (data ?? []) as Person[]) people.set(p.id, p);
  }

  const collectedByProject = new Map<string, number>();
  const firstPaymentByProject = new Map<string, string>();
  for (const p of payments) {
    if (!p.project_id) continue;
    collectedByProject.set(p.project_id, (collectedByProject.get(p.project_id) ?? 0) + p.amount_cents);
    const first = firstPaymentByProject.get(p.project_id);
    if (!first || p.created_at < first) firstPaymentByProject.set(p.project_id, p.created_at);
  }

  return {
    projects,
    level: level as SchemaLevel,
    payments,
    subs,
    subsById: new Map(subs.map((s) => [s.id, s])),
    commerciaux,
    commercialName: new Map(commerciaux.map((c) => [c.id, displayName(c)])),
    commissions,
    commissionByProject: new Map((commissions ?? []).filter((c) => c.project_id).map((c) => [c.project_id!, c])),
    people,
    collectedByProject,
    firstPaymentByProject,
  };
}
type Ctx = Awaited<ReturnType<typeof loadContext>>;

const personName = (ctx: Ctx, userId: string | null) => {
  const p = userId ? ctx.people.get(userId) : undefined;
  return p ? displayName(p) : "—";
};
/** Active sales reps for filters / assignment selects. */
const repOptions = (ctx: Ctx) => ctx.commerciaux.map((c) => ({ id: c.id, name: displayName(c), active: c.active !== false }));
/** Filter value for "assigned to nobody". */
export const UNASSIGNED = "aucun";

/** URL filter → one of the allowed values, or "" (no filter). Never trusts the raw query string. */
export const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | "" =>
  allowed.includes(value as T) ? (value as T) : "";
/** Sales-rep filter: a profile id, "aucun" (unassigned) or "" (everyone). */
export const repParam = (value: unknown) =>
  value === UNASSIGNED || (typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)) ? (value as string) : "";
const matchRep = (filter: string, id: string | null | undefined) => !filter || (filter === UNASSIGNED ? !id : id === filter);

// ---------- Clients ----------

export type ClientFilter = { status: "" | "actif" | "ancien"; commercial: string; q: string };

export async function loadClients(filter: ClientFilter) {
  const ctx = await loadContext();
  type Row = {
    key: string;
    name: string;
    contact: string;
    email: string;
    commercialId: string | null;
    sales: number;
    signedCents: number;
    collectedCents: number;
    last: string;
    active: boolean;
    kinds: Set<"video" | "abonnement">;
  };
  const map = new Map<string, Row>();
  const row = (key: string, init: () => Omit<Row, "sales" | "signedCents" | "collectedCents" | "last" | "active" | "kinds">) => {
    let r = map.get(key);
    if (!r) map.set(key, (r = { ...init(), sales: 0, signedCents: 0, collectedCents: 0, last: "", active: false, kinds: new Set() }));
    return r;
  };

  // Oldest first, so the latest project decides the assigned rep.
  for (const p of [...ctx.projects].reverse()) {
    if (!PAID.has(p.status)) continue;
    const key = p.user_id ? `u:${p.user_id}` : `e:${norm(p.email) || p.id}`;
    const r = row(key, () => ({ key, name: projectClient(p), contact: projectContact(p), email: p.email ?? "", commercialId: null }));
    r.sales += 1;
    r.signedCents += p.total_cents;
    r.collectedCents += ctx.collectedByProject.get(p.id) ?? 0;
    if (p.created_at > r.last) r.last = p.created_at;
    if (p.status === "acompte_paye" || p.status === "en_cours") r.active = true;
    if (p.commercial_id) r.commercialId = p.commercial_id;
    r.kinds.add("video");
  }
  for (const pay of ctx.payments) {
    if (pay.kind !== "subscription" || !pay.user_id) continue;
    const person = ctx.people.get(pay.user_id);
    const key = `u:${pay.user_id}`;
    const r = row(key, () => ({ key, name: person ? displayName(person) : "—", contact: person ? displayName(person) : "—", email: person?.email ?? "", commercialId: null }));
    r.sales += 1;
    r.signedCents += pay.amount_cents;
    r.collectedCents += pay.amount_cents;
    if (pay.created_at > r.last) r.last = pay.created_at;
    const sub = pay.subscription_id ? ctx.subsById.get(pay.subscription_id) : undefined;
    if (sub?.status === "active") r.active = true;
    r.kinds.add("abonnement");
  }

  const all = [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  const q = norm(filter.q.trim());
  const rows = all
    .filter((r) => !filter.status || (filter.status === "actif") === r.active)
    .filter((r) => matchRep(filter.commercial, r.commercialId))
    .filter((r) => !q || norm(r.name).includes(q) || norm(r.email).includes(q) || norm(r.contact).includes(q))
    .map((r) => ({ ...r, kinds: [...r.kinds], commercial: r.commercialId ? (ctx.commercialName.get(r.commercialId) ?? "—") : null }));

  return {
    assignment: ctx.level !== "none",
    reps: repOptions(ctx),
    kpis: {
      total: all.length,
      active: all.filter((r) => r.active).length,
      signedCents: sum(all, (r) => r.signedCents),
      collectedCents: sum(all, (r) => r.collectedCents),
      reps: new Set(all.map((r) => r.commercialId).filter(Boolean)).size,
    },
    rows,
  };
}

// ---------- Prospects ----------

export type ProspectFilter = { stage: "" | "nouveau" | "acompte_en_attente"; commercial: string; q: string };

export async function loadProspects(filter: ProspectFilter, now = new Date()) {
  const ctx = await loadContext();
  const open = ctx.projects.filter((p) => OPEN_QUOTE.has(p.status));
  const yearAgo = new Date(now.getTime() - 365 * DAY).toISOString();
  const lastYear = ctx.projects.filter((p) => p.created_at >= yearAgo && p.status !== "annule");
  const q = norm(filter.q.trim());

  const rows = open
    .filter((p) => !filter.stage || p.status === filter.stage)
    .filter((p) => matchRep(filter.commercial, p.commercial_id))
    .filter((p) => !q || [p.company, p.first_name, p.last_name, p.email, p.reference].some((v) => norm(v).includes(q)))
    .map((p) => ({
      id: p.id,
      reference: p.reference,
      contact: projectContact(p),
      company: p.company ?? "",
      email: p.email ?? "",
      need: needOf(p),
      budgetCents: p.total_cents,
      stage: p.status,
      kind: p.kind,
      createdAt: p.created_at,
      ageDays: Math.floor((now.getTime() - new Date(p.created_at).getTime()) / DAY),
      commercialId: p.commercial_id ?? null,
    }));

  return {
    assignment: ctx.level !== "none",
    reps: repOptions(ctx),
    kpis: {
      total: open.length,
      unassigned: ctx.level === "none" ? null : open.filter((p) => !p.commercial_id).length,
      pipelineCents: sum(open, (p) => p.total_cents),
      conversion: rate(lastYear.filter((p) => PAID.has(p.status)).length, lastYear.length),
      reps: new Set(open.map((p) => p.commercial_id).filter(Boolean)).size,
    },
    rows,
  };
}

// ---------- Sales ledger ----------

export const LEDGER_PERIODS = ["mois", "mois-precedent", "30j", "12m", "tout"] as const;
export type LedgerPeriod = (typeof LEDGER_PERIODS)[number];
export type LedgerFilter = { period: LedgerPeriod; commercial: string; state: "" | "solde" | "a-encaisser"; type: "" | "video" | "abonnement" };

function periodBounds(period: LedgerPeriod, now: Date): [Date | null, Date | null] {
  if (period === "mois") return [startOfMonth(now), null];
  if (period === "mois-precedent") return [startOfMonth(now, -1), startOfMonth(now)];
  if (period === "30j") return [new Date(now.getTime() - 30 * DAY), null];
  if (period === "12m") return [new Date(now.getTime() - 365 * DAY), null];
  return [null, null];
}

export async function loadLedger(filter: LedgerFilter, now = new Date()) {
  const ctx = await loadContext();
  type Sale = {
    id: string;
    projectId: string | null;
    date: string;
    reference: string;
    type: "video" | "abonnement";
    commercial: string | null;
    commercialId: string | null;
    client: string;
    product: string;
    amountCents: number;
    collectedCents: number;
    remainingCents: number;
    commissionCents: number | null;
  };
  const sales: Sale[] = [];
  for (const p of ctx.projects) {
    if (!PAID.has(p.status)) continue;
    const collected = ctx.collectedByProject.get(p.id) ?? 0;
    sales.push({
      id: `p:${p.id}`,
      projectId: p.id,
      // The sale happens when the deposit is paid; older rows fall back to the request date.
      date: ctx.firstPaymentByProject.get(p.id) ?? p.created_at,
      reference: p.reference,
      type: "video",
      commercialId: p.commercial_id ?? null,
      commercial: p.commercial_id ? (ctx.commercialName.get(p.commercial_id) ?? "—") : null,
      client: projectClient(p),
      product: needOf(p),
      amountCents: p.total_cents,
      collectedCents: collected,
      remainingCents: Math.max(0, p.total_cents - collected),
      commissionCents: ctx.commissions ? (ctx.commissionByProject.get(p.id)?.amount_cents ?? null) : null,
    });
  }
  for (const pay of ctx.payments) {
    if (pay.kind !== "subscription") continue;
    const sub = pay.subscription_id ? ctx.subsById.get(pay.subscription_id) : undefined;
    sales.push({
      id: `s:${pay.id}`,
      projectId: null,
      date: pay.created_at,
      reference: sub ? `${sub.plan} · ${sub.cycle}` : "—",
      type: "abonnement",
      commercialId: null,
      commercial: null,
      client: personName(ctx, pay.user_id),
      product: sub ? `Agents IA — ${sub.plan} (${sub.cycle})` : "Agents IA",
      amountCents: pay.amount_cents,
      collectedCents: pay.amount_cents,
      remainingCents: 0,
      commissionCents: null,
    });
  }

  const [from, to] = periodBounds(filter.period, now);
  const rows = sales
    .filter((s) => (!from || new Date(s.date) >= from) && (!to || new Date(s.date) < to))
    .filter((s) => !filter.type || s.type === filter.type)
    .filter((s) => matchRep(filter.commercial, s.commercialId))
    .filter((s) => !filter.state || (filter.state === "solde") === (s.remainingCents === 0))
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    assignment: ctx.level !== "none",
    reps: repOptions(ctx),
    kpis: {
      signedCents: sum(rows, (s) => s.amountCents),
      collectedCents: sum(rows, (s) => s.collectedCents),
      remainingCents: sum(rows, (s) => s.remainingCents),
      count: rows.length,
      settled: rows.filter((s) => s.remainingCents === 0).length,
    },
    rows,
  };
}

// ---------- Quotes & invoices ----------

export type QuoteFilter = { group: "" | "en-attente" | "acceptes" | "refuses"; type: "" | "devis" | "acompte"; commercial: string };
const groupOf = (status: string) => (PAID.has(status) ? "acceptes" : status === "annule" ? "refuses" : "en-attente");

export async function loadQuotes(filter: QuoteFilter) {
  const ctx = await loadContext();
  const all = ctx.projects;
  const accepted = all.filter((p) => PAID.has(p.status));
  const refused = all.filter((p) => p.status === "annule");

  const byRep = new Map<string, { id: string | null; name: string; sent: number; accepted: number; refused: number }>();
  for (const p of all) {
    const id = p.commercial_id ?? null;
    const key = id ?? UNASSIGNED;
    let r = byRep.get(key);
    if (!r) byRep.set(key, (r = { id, name: id ? (ctx.commercialName.get(id) ?? "—") : "", sent: 0, accepted: 0, refused: 0 }));
    r.sent += 1;
    if (PAID.has(p.status)) r.accepted += 1;
    if (p.status === "annule") r.refused += 1;
  }

  const quotes = all
    .filter((p) => !filter.group || groupOf(p.status) === filter.group)
    .filter((p) => !filter.type || p.kind === filter.type)
    .filter((p) => matchRep(filter.commercial, p.commercial_id))
    .slice(0, 500)
    .map((p) => ({
      id: p.id,
      reference: p.reference,
      kind: p.kind,
      client: projectClient(p),
      commercial: p.commercial_id ? (ctx.commercialName.get(p.commercial_id) ?? "—") : null,
      date: p.created_at,
      amountCents: p.total_cents,
      status: p.status,
      group: groupOf(p.status),
    }));

  const projectById = new Map(all.map((p) => [p.id, p]));
  const invoices = ctx.payments.slice(0, 300).map((pay) => {
    const project = pay.project_id ? projectById.get(pay.project_id) : undefined;
    const sub = pay.subscription_id ? ctx.subsById.get(pay.subscription_id) : undefined;
    return {
      id: pay.id,
      kind: pay.kind,
      date: pay.created_at,
      reference: project?.reference ?? (sub ? `${sub.plan} · ${sub.cycle}` : "—"),
      client: project ? projectClient(project) : personName(ctx, pay.user_id),
      amountCents: pay.amount_cents,
      stripeId: pay.stripe_object_id,
    };
  });

  return {
    assignment: ctx.level !== "none",
    reps: repOptions(ctx),
    kpis: {
      sent: all.length,
      accepted: accepted.length,
      refused: refused.length,
      pending: all.length - accepted.length - refused.length,
      acceptance: rate(accepted.length, all.length),
      invoicedCents: sum(ctx.payments, (p) => p.amount_cents),
    },
    byRep: [...byRep.values()]
      .map((r) => ({ ...r, rate: rate(r.accepted, r.sent) }))
      .sort((a, b) => (a.id === null ? 1 : b.id === null ? -1 : b.sent - a.sent)),
    quotes,
    invoices,
  };
}

// ---------- Commissions ----------

export type CommissionFilter = { status: "" | "en_attente" | "validee" | "a_payer" | "payee"; commercial: string };

export async function loadCommissionBoard(filter: CommissionFilter) {
  const ctx = await loadContext();
  if (!ctx.commissions || ctx.level === "none") return { migrated: false as const };
  const projectById = new Map(ctx.projects.map((p) => [p.id, p]));
  // Commissions of invoices issued in the sales space (migration 012): read separately so the board keeps working before it.
  const supabase = await createClient();
  const { data: docLinks } = await supabase.from("commissions").select("id, document_id").not("document_id", "is", null).limit(10000);
  const docIds = [...new Set((docLinks ?? []).map((l) => l.document_id as string))];
  const { data: docs } = docIds.length ? await supabase.from("sales_documents").select("id, number, client_name, total_ht_cents").in("id", docIds) : { data: [] };
  const docById = new Map((docs ?? []).map((d) => [d.id as string, d]));
  const docOf = new Map((docLinks ?? []).map((l) => [l.id as string, docById.get(l.document_id as string)]));
  const all = ctx.commissions.map((c) => {
    const project = c.project_id ? projectById.get(c.project_id) : undefined;
    const doc = c.id ? docOf.get(c.id) : undefined;
    return {
      id: c.id!,
      date: c.created_at,
      commercialId: c.commercial_id,
      commercial: ctx.commercialName.get(c.commercial_id) ?? "—",
      reference: project?.reference ?? (doc?.number as string | undefined) ?? "—",
      client: project ? projectClient(project) : ((doc?.client_name as string | undefined) ?? "—"),
      saleCents: project?.total_cents ?? (doc ? Number(doc.total_ht_cents) : null),
      amountCents: c.amount_cents,
      status: c.status,
      validatedAt: c.validated_at,
      paidAt: c.paid_at,
    };
  });
  const by = (status: string) => all.filter((c) => c.status === status);

  // Paid sales with a rep but no commission yet: what "Calculer les commissions" would create.
  const rateOf = new Map(ctx.commerciaux.map((c) => [c.id, c.commission_rate ?? null]));
  const missing = ctx.projects.filter((p) => PAID.has(p.status) && p.commercial_id && !ctx.commissionByProject.has(p.id));

  return {
    migrated: true as const,
    reps: repOptions(ctx),
    kpis: {
      totalCents: sum(all, (c) => c.amountCents),
      pending: { count: by("en_attente").length, cents: sum(by("en_attente"), (c) => c.amountCents) },
      validated: { count: by("validee").length, cents: sum(by("validee"), (c) => c.amountCents) },
      toPay: { count: by("a_payer").length, cents: sum(by("a_payer"), (c) => c.amountCents) },
      paid: { count: by("payee").length, cents: sum(by("payee"), (c) => c.amountCents) },
    },
    missing: {
      ready: missing.filter((p) => rateOf.get(p.commercial_id!) != null).length,
      noRate: missing.filter((p) => rateOf.get(p.commercial_id!) == null).length,
    },
    rows: all.filter((c) => !filter.status || c.status === filter.status).filter((c) => matchRep(filter.commercial, c.commercialId)),
  };
}
