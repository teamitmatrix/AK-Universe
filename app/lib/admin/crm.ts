import "server-only";
import { type DocKind, type DocStatus } from "@/lib/commercial/commission-rules";
import { OPEN_STAGES, isStage, type Stage } from "@/lib/commercial/stages";
import { createClient } from "@/lib/supabase/server";
import { PAID, displayName, isUuid, selectProjects, type Commission, type SchemaLevel, type StaffProfile, type TeamProject } from "./team";

/**
 * Company-wide CRM and finance screens. Every query runs with the admin's session, so RLS (is_admin()) applies.
 *
 * Prospects, clients and quotes/invoices are the commercial space's own tables (migrations 011 and 012):
 *   prospects       the pipeline every rep works (7 stages)
 *   customers       the customer record created when a prospect is won
 *   sales_documents quotes and invoices a rep writes
 * The sales ledger and the commission board stay on video_projects, payments and commissions.
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

type RepDirectory = { reps: { id: string; name: string; active: boolean }[]; nameOf: Map<string, string> };

/** Every commercial, for filters and the "assigned rep" column. */
async function loadRepDirectory(): Promise<RepDirectory> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, email, first_name, last_name, active").eq("role", "commercial").order("first_name");
  const rows = (data ?? []) as Pick<StaffProfile, "id" | "email" | "first_name" | "last_name" | "active">[];
  return {
    reps: rows.map((c) => ({ id: c.id, name: displayName(c), active: c.active !== false })),
    nameOf: new Map(rows.map((c) => [c.id, displayName(c)])),
  };
}

const LIVE_DOC = new Set(["brouillon", "en_attente", "validee", "payee"]);

// ---------- Clients (customers, migration 011) ----------

export type ClientFilter = { status: "" | "actif" | "ancien"; commercial: string; q: string };

type CustomerDoc = {
  id: string;
  customer_id: string | null;
  salesperson_id: string | null;
  client_email: string | null;
  kind: string;
  status: string;
  total_ht_cents: number;
  issue_date: string;
  number: string | null;
};

export async function loadClients(filter: ClientFilter) {
  const supabase = await createClient();
  const [custRes, docRes, directory] = await Promise.all([
    supabase
      .from("customers")
      .select("id, salesperson_id, name, company, email, phone, profile_id, source_prospect_id, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase.from("sales_documents").select("id, customer_id, salesperson_id, client_email, kind, status, total_ht_cents, issue_date, number").limit(5000),
    loadRepDirectory(),
  ]);
  if (custRes.error) return { ready: false as const };
  const docs = (docRes.error ? [] : (docRes.data ?? [])) as CustomerDoc[];
  const byCustomer = new Map<string, CustomerDoc[]>();
  const byEmail = new Map<string, CustomerDoc[]>();
  for (const d of docs) {
    if (d.customer_id) {
      const list = byCustomer.get(d.customer_id) ?? [];
      list.push(d);
      byCustomer.set(d.customer_id, list);
    } else if (d.client_email && d.salesperson_id) {
      const key = `${d.salesperson_id}:${d.client_email.toLowerCase()}`;
      const list = byEmail.get(key) ?? [];
      list.push(d);
      byEmail.set(key, list);
    }
  }

  const all = ((custRes.data ?? []) as {
    id: string;
    salesperson_id: string | null;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    source_prospect_id: string | null;
    created_at: string;
  }[]).map((c) => {
    const linked = byCustomer.get(c.id) ?? [];
    const loose = c.email && c.salesperson_id ? (byEmail.get(`${c.salesperson_id}:${c.email.toLowerCase()}`) ?? []) : [];
    const seen = new Set(linked.map((d) => d.id));
    const own = [...linked, ...loose.filter((d) => !seen.has(d.id))];
    const live = own.filter((d) => LIVE_DOC.has(d.status));
    const invoices = own.filter((d) => d.kind === "facture" && (d.status === "en_attente" || d.status === "payee"));
    const paid = invoices.filter((d) => d.status === "payee");
    const last = live.reduce((best, d) => (d.issue_date > best ? d.issue_date : best), "");
    return {
      id: c.id,
      name: c.company || c.name,
      contact: c.company ? c.name : "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      commercialId: c.salesperson_id,
      commercial: c.salesperson_id ? (directory.nameOf.get(c.salesperson_id) ?? "—") : null,
      prospectId: c.source_prospect_id,
      sales: invoices.length,
      signedCents: sum(invoices, (d) => d.total_ht_cents),
      collectedCents: sum(paid, (d) => d.total_ht_cents),
      last: last || c.created_at,
      active: live.length > 0 || own.length === 0,
    };
  });

  const q = norm(filter.q.trim());
  const rows = all
    .filter((r) => !filter.status || (filter.status === "actif") === r.active)
    .filter((r) => matchRep(filter.commercial, r.commercialId))
    .filter((r) => !q || [r.name, r.contact, r.email, r.phone].some((v) => norm(v).includes(q)))
    .sort((a, b) => b.last.localeCompare(a.last));

  return {
    ready: true as const,
    reps: directory.reps,
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

// ---------- Prospects (prospects, migration 011) ----------

export type ProspectFilter = { stage: "" | Stage; commercial: string; q: string };

type ProspectRow = {
  id: string;
  salesperson_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  need: string | null;
  budget_cents: number | null;
  stage: string;
  next_followup_at: string | null;
  lost_reason: string | null;
  created_at: string;
  project: { reference: string } | { reference: string }[] | null;
};

export async function loadProspects(filter: ProspectFilter, now = new Date()) {
  const supabase = await createClient();
  const [prosRes, directory] = await Promise.all([
    supabase
      .from("prospects")
      .select("id, salesperson_id, name, company, email, phone, need, budget_cents, stage, next_followup_at, lost_reason, created_at, project:video_projects(reference)")
      .order("updated_at", { ascending: false })
      .limit(2000),
    loadRepDirectory(),
  ]);
  if (prosRes.error) return { ready: false as const };
  const nowMs = now.getTime();
  const all = ((prosRes.data ?? []) as unknown as ProspectRow[]).map((p) => {
    const stage = isStage(p.stage) ? p.stage : "nouveau";
    const open = (OPEN_STAGES as readonly string[]).includes(stage);
    const project = Array.isArray(p.project) ? p.project[0] : p.project;
    return {
      id: p.id,
      name: p.name,
      company: p.company ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      need: p.need ?? "",
      budgetCents: p.budget_cents,
      stage,
      followupAt: p.next_followup_at,
      late: open && !!p.next_followup_at && new Date(p.next_followup_at).getTime() < nowMs,
      lostReason: p.lost_reason ?? "",
      createdAt: p.created_at,
      projectReference: project?.reference ?? null,
      commercialId: p.salesperson_id,
      commercial: directory.nameOf.get(p.salesperson_id) ?? "—",
      open,
    };
  });
  const open = all.filter((p) => p.open);
  const won = all.filter((p) => p.stage === "gagne").length;
  const lost = all.filter((p) => p.stage === "perdu").length;
  const q = norm(filter.q.trim());
  const rows = all
    .filter((p) => !filter.stage || p.stage === filter.stage)
    .filter((p) => matchRep(filter.commercial, p.commercialId))
    .filter((p) => !q || [p.name, p.company, p.email, p.phone, p.need, p.projectReference].some((v) => norm(v).includes(q)));

  return {
    ready: true as const,
    reps: directory.reps,
    kpis: {
      total: all.length,
      open: open.length,
      late: open.filter((p) => p.late).length,
      pipelineCents: sum(open, (p) => p.budgetCents ?? 0),
      conversion: rate(won, won + lost),
      reps: new Set(all.map((p) => p.commercialId)).size,
    },
    rows,
  };
}

// ---------- Sales ledger ----------

export const LEDGER_PERIODS = ["mois", "mois-precedent", "30j", "12m", "tout"] as const;
export type LedgerPeriod = (typeof LEDGER_PERIODS)[number];
export type LedgerFilter = { period: LedgerPeriod; commercial: string; state: "" | "solde" | "a-encaisser"; type: "" | "video" | "abonnement" | "facture" };

function periodBounds(period: LedgerPeriod, now: Date): [Date | null, Date | null] {
  if (period === "mois") return [startOfMonth(now), null];
  if (period === "mois-precedent") return [startOfMonth(now, -1), startOfMonth(now)];
  if (period === "30j") return [new Date(now.getTime() - 30 * DAY), null];
  if (period === "12m") return [new Date(now.getTime() - 365 * DAY), null];
  return [null, null];
}

export async function loadLedger(filter: LedgerFilter, now = new Date()) {
  const supabase = await createClient();
  const [ctx, invoiceRes] = await Promise.all([
    loadContext(),
    // Issued or paid invoices written in the commercial space (migration 012). Drafts and cancelled ones are not sales.
    supabase
      .from("sales_documents")
      .select("id, number, status, salesperson_id, customer_id, client_name, issue_date, total_ht_cents, commission_cents")
      .eq("kind", "facture")
      .in("status", ["en_attente", "payee"])
      .limit(5000),
  ]);
  type Sale = {
    id: string;
    projectId: string | null;
    documentId: string | null;
    customerId: string | null;
    date: string;
    reference: string;
    type: "video" | "abonnement" | "facture";
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
      documentId: null,
      customerId: null,
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
      documentId: null,
      customerId: null,
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
  for (const doc of (invoiceRes.error ? [] : (invoiceRes.data ?? [])) as {
    id: string;
    number: string | null;
    status: string;
    salesperson_id: string | null;
    customer_id: string | null;
    client_name: string;
    issue_date: string;
    total_ht_cents: number;
    commission_cents: number;
  }[]) {
    const paid = doc.status === "payee";
    sales.push({
      id: `f:${doc.id}`,
      projectId: null,
      documentId: doc.id,
      customerId: doc.customer_id,
      date: `${doc.issue_date}T12:00:00`,
      reference: doc.number ?? "—",
      type: "facture",
      commercialId: doc.salesperson_id,
      commercial: doc.salesperson_id ? (ctx.commercialName.get(doc.salesperson_id) ?? "—") : null,
      client: doc.client_name,
      product: "Facture",
      amountCents: doc.total_ht_cents,
      collectedCents: paid ? doc.total_ht_cents : 0,
      remainingCents: paid ? 0 : doc.total_ht_cents,
      commissionCents: doc.commission_cents,
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

// ---------- Quotes & invoices (sales_documents, migration 012) ----------

export type QuoteFilter = { status: "" | DocStatus; type: "" | DocKind; commercial: string };

const DOC_COLUMNS =
  "id, number, kind, status, salesperson_id, customer_id, client_name, client_email, issue_date, total_ht_cents, total_ttc_cents, commission_cents";

export async function loadQuotes(filter: QuoteFilter) {
  const supabase = await createClient();
  const [docRes, directory] = await Promise.all([
    supabase.from("sales_documents").select(DOC_COLUMNS).order("issue_date", { ascending: false }).limit(2000),
    loadRepDirectory(),
  ]);
  if (docRes.error) return { ready: false as const };
  const all = ((docRes.data ?? []) as {
    id: string;
    number: string | null;
    kind: DocKind;
    status: DocStatus;
    salesperson_id: string | null;
    customer_id: string | null;
    client_name: string;
    client_email: string | null;
    issue_date: string;
    total_ht_cents: number;
    total_ttc_cents: number;
    commission_cents: number;
  }[]).map((d) => ({
    id: d.id,
    number: d.number ?? "—",
    kind: d.kind,
    status: d.status,
    customerId: d.customer_id,
    client: d.client_name,
    email: d.client_email ?? "",
    commercialId: d.salesperson_id,
    commercial: d.salesperson_id ? (directory.nameOf.get(d.salesperson_id) ?? "—") : null,
    date: d.issue_date,
    amountCents: d.total_ht_cents,
    ttcCents: d.total_ttc_cents,
    commissionCents: d.commission_cents,
  }));

  const quotes = all.filter((d) => d.kind === "devis");
  const invoices = all.filter((d) => d.kind === "facture");
  const decided = quotes.filter((d) => d.status === "validee" || d.status === "annulee");
  const byRep = new Map<string, { id: string | null; name: string; quotes: number; invoices: number; accepted: number; paid: number }>();
  for (const d of all) {
    const id = d.commercialId;
    const key = id ?? UNASSIGNED;
    let r = byRep.get(key);
    if (!r) byRep.set(key, (r = { id, name: d.commercial ?? "", quotes: 0, invoices: 0, accepted: 0, paid: 0 }));
    if (d.kind === "devis") r.quotes += 1;
    else r.invoices += 1;
    if (d.kind === "devis" && d.status === "validee") r.accepted += 1;
    if (d.kind === "facture" && d.status === "payee") r.paid += 1;
  }

  const rows = all
    .filter((d) => !filter.status || d.status === filter.status)
    .filter((d) => !filter.type || d.kind === filter.type)
    .filter((d) => matchRep(filter.commercial, d.commercialId))
    .slice(0, 500);

  return {
    ready: true as const,
    reps: directory.reps,
    kpis: {
      quotes: quotes.length,
      invoices: invoices.length,
      openQuotes: quotes.filter((d) => d.status === "brouillon" || d.status === "en_attente").length,
      potentialCents: sum(
        quotes.filter((d) => d.status === "brouillon" || d.status === "en_attente"),
        (d) => d.ttcCents,
      ),
      toCollectCents: sum(
        invoices.filter((d) => d.status === "en_attente"),
        (d) => d.ttcCents,
      ),
      invoicedCents: sum(
        invoices.filter((d) => d.status === "en_attente" || d.status === "payee"),
        (d) => d.ttcCents,
      ),
      acceptance: rate(decided.filter((d) => d.status === "validee").length, decided.length),
    },
    byRep: [...byRep.values()].sort((a, b) => (a.id === null ? 1 : b.id === null ? -1 : b.quotes + b.invoices - (a.quotes + a.invoices))),
    rows,
  };
}

// ---------- One record (detail pages) ----------

export async function loadProspectRecord(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .select(
      "id, salesperson_id, name, company, email, phone, source, need, budget_cents, stage, next_action, next_followup_at, notes, lost_reason, customer_id, project_id, converted_at, created_at, updated_at, project:video_projects(reference)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as ProspectRow & {
    source: string | null;
    next_action: string | null;
    notes: string | null;
    customer_id: string | null;
    project_id: string | null;
    converted_at: string | null;
    updated_at: string;
  };
  const directory = await loadRepDirectory();
  const { data: events } = await supabase.from("prospect_events").select("id, kind, from_stage, to_stage, actor_id, created_at").eq("prospect_id", id).order("created_at").limit(200);
  const actorIds = [...new Set((events ?? []).map((e) => e.actor_id).filter((x): x is string => !!x))];
  const actors = new Map<string, string>();
  if (actorIds.length) {
    const { data: people } = await supabase.from("profiles").select("id, email, first_name, last_name").in("id", actorIds);
    for (const p of people ?? []) actors.set(p.id, displayName(p));
  }
  const project = Array.isArray(row.project) ? row.project[0] : row.project;
  return {
    id: row.id,
    name: row.name,
    company: row.company ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    source: row.source ?? "",
    need: row.need ?? "",
    budgetCents: row.budget_cents,
    stage: isStage(row.stage) ? row.stage : "nouveau",
    nextAction: row.next_action ?? "",
    followupAt: row.next_followup_at,
    notes: row.notes ?? "",
    lostReason: row.lost_reason ?? "",
    customerId: row.customer_id,
    projectReference: project?.reference ?? null,
    convertedAt: row.converted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commercialId: row.salesperson_id,
    commercial: directory.nameOf.get(row.salesperson_id) ?? "—",
    history: (events ?? []).map((e) => ({
      id: e.id as number,
      kind: e.kind as "created" | "stage" | "converted" | "reassigned",
      fromStage: (e.from_stage as string | null) ?? null,
      toStage: (e.to_stage as string | null) ?? null,
      actor: e.actor_id ? (actors.get(e.actor_id as string) ?? null) : null,
      at: e.created_at as string,
    })),
  };
}

export async function loadCustomerRecord(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("id, salesperson_id, name, company, email, phone, profile_id, source_prospect_id, created_at").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const directory = await loadRepDirectory();
  const email = (data.email as string | null) ?? "";
  const linked = supabase.from("sales_documents").select("id, number, kind, status, issue_date, total_ht_cents, customer_id, salesperson_id, client_email").eq("customer_id", data.id).order("issue_date", { ascending: false }).limit(100);
  const loose =
    email && data.salesperson_id
      ? supabase
          .from("sales_documents")
          .select("id, number, kind, status, issue_date, total_ht_cents, customer_id, salesperson_id, client_email")
          .is("customer_id", null)
          .eq("salesperson_id", data.salesperson_id)
          .ilike("client_email", email.replace(/[\\%_]/g, "\\$&"))
          .order("issue_date", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as CustomerDoc[] });
  const [linkedRes, looseRes] = await Promise.all([linked, loose]);
  const own = [...((linkedRes.data ?? []) as CustomerDoc[]), ...((looseRes.data ?? []) as CustomerDoc[])].sort((a, b) => b.issue_date.localeCompare(a.issue_date));
  return {
    id: data.id as string,
    name: (data.company as string | null) || (data.name as string),
    contact: data.company ? (data.name as string) : "",
    email: (data.email as string | null) ?? "",
    phone: (data.phone as string | null) ?? "",
    commercialId: (data.salesperson_id as string | null) ?? null,
    commercial: data.salesperson_id ? (directory.nameOf.get(data.salesperson_id as string) ?? "—") : null,
    prospectId: (data.source_prospect_id as string | null) ?? null,
    hasAccount: Boolean(data.profile_id),
    createdAt: data.created_at as string,
    documents: own.map((d) => ({ id: d.id, number: d.number ?? "—", kind: d.kind, status: d.status, date: d.issue_date, amountCents: d.total_ht_cents })),
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
