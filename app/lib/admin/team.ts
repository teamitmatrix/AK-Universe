import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Sales team (commerciaux) and video team (vidéastes), read from the existing tables:
 * profiles (role commercial / videaste), video_projects (commercial_id / videaste_id / deadline / revision_rounds)
 * and commissions. The same row builders feed the dashboard widgets, the roster pages and the detail pages,
 * so a figure is never computed two different ways.
 *
 * Every query runs with the signed-in admin's session, so Row Level Security (is_admin()) re-checks the role.
 */

/** A videographer with this many active projects is overloaded; with NORMAL_LOAD_AT, at normal capacity. */
export const OVERLOAD_AT = 5;
export const NORMAL_LOAD_AT = 3;

/** Statuses meaning the client has paid (at least the deposit) — a "sale". */
export const PAID = new Set(["acompte_paye", "en_cours", "termine"]);
/** Quote still open: request received or deposit awaited. */
export const OPEN_QUOTE = new Set(["nouveau", "acompte_en_attente"]);
export const isActiveProject = (status: string) => status !== "termine" && status !== "annule";

export type StaffRole = "commercial" | "videaste";
export type StaffProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: StaffRole;
  active?: boolean;
  commission_rate?: number | null;
  monthly_target_cents?: number | null;
  created_at?: string;
};
export type TeamProject = {
  id: string;
  reference: string;
  kind: "devis" | "acompte";
  status: string;
  total_cents: number;
  deposit_cents: number;
  created_at: string;
  user_id: string | null;
  email: string | null;
  company: string | null;
  first_name: string | null;
  last_name: string | null;
  commercial_id?: string | null;
  videaste_id?: string | null;
  deadline?: string | null;
  revision_rounds?: number | null;
  /** Only when requested with `extra: "items"`. */
  items?: { service: string; details?: string; price: number }[];
};
export type Commission = { id?: string; commercial_id: string; project_id?: string | null; amount_cents: number; status: string; created_at: string };

export const BASE_PROJECT_COLUMNS =
  "id, reference, kind, status, total_cents, deposit_cents, created_at, user_id, email:contact->>email, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom";
const ASSIGNMENT_COLUMNS = ", commercial_id, videaste_id, deadline";
const REVISION_COLUMNS = ", revision_rounds";

type Supabase = Awaited<ReturnType<typeof createClient>>;
/** Which optional schema is present: "none" (before 005), "assignment" (005), "revisions" (005 + 006). */
export type SchemaLevel = "none" | "assignment" | "revisions";

/**
 * Loads projects with every column the database has: assignment (migration 005) and revision rounds (006)
 * when present, falling back cleanly when not, so the admin space never breaks on an older schema.
 */
export type ProjectFilter = {
  /** Only projects assigned to someone in this column (or to this person, with `id`). */
  assigned?: { column: "commercial_id" | "videaste_id"; id?: string };
  /** Only projects created since this date. */
  since?: Date;
  /** Only projects in these statuses. */
  statuses?: string[];
  /** Extra columns to read (e.g. "items"). */
  extra?: "items";
};

export async function selectProjects(supabase: Supabase, filter: ProjectFilter = {}, limit = 5000) {
  const attempts: [SchemaLevel, string][] = [
    ["revisions", BASE_PROJECT_COLUMNS + ASSIGNMENT_COLUMNS + REVISION_COLUMNS],
    ["assignment", BASE_PROJECT_COLUMNS + ASSIGNMENT_COLUMNS],
    ["none", BASE_PROJECT_COLUMNS],
  ];
  const extra = filter.extra ? `, ${filter.extra}` : "";
  for (const [level, columns] of attempts) {
    let q = supabase.from("video_projects").select(columns + extra);
    if (filter.assigned) q = filter.assigned.id ? q.eq(filter.assigned.column, filter.assigned.id) : q.not(filter.assigned.column, "is", null);
    if (filter.since) q = q.gte("created_at", filter.since.toISOString());
    if (filter.statuses) q = q.in("status", filter.statuses);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
    if (!error) return { projects: (data ?? []) as unknown as TeamProject[], level };
    // A filter on assignment columns fails by design before migration 005: only log unexpected errors.
    if (level === "none" && !filter.assigned) console.error("Admin: video_projects failed:", error.message);
  }
  return { projects: [] as TeamProject[], level: "none" as SchemaLevel };
}

const sum = <T>(rows: T[], pick: (r: T) => number) => rows.reduce((total, r) => total + pick(r), 0);
const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
const startOfMonth = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
const inMonth = (iso: string, now: Date) => new Date(iso) >= startOfMonth(now) && new Date(iso) <= now;
export const todayISO = (now = new Date()) => now.toISOString().slice(0, 10);

export const displayName = (p: Pick<StaffProfile, "first_name" | "last_name" | "email">) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;

export type LoadLevel = "overloaded" | "normal" | "available" | "inactive";
export const loadLevel = (activeProjects: number, active = true): LoadLevel =>
  !active ? "inactive" : activeProjects >= OVERLOAD_AT ? "overloaded" : activeProjects >= NORMAL_LOAD_AT ? "normal" : "available";

// ---------- Row builders (pure) ----------

/** An invoice issued by a rep in the sales space (sales_documents, migration 012): a sale once issued or paid. */
export type InvoiceSale = { salesperson_id: string | null; total_ht_cents: number; issue_date: string; status: string };

/** The reps' issued / paid invoices; [] before migration 012. Read with the caller's session (RLS: admin all, rep own). */
export async function loadInvoiceSales(supabase: Supabase, commercialId?: string): Promise<InvoiceSale[]> {
  let q = supabase.from("sales_documents").select("salesperson_id, total_ht_cents, issue_date, status").eq("kind", "facture").in("status", ["en_attente", "payee"]);
  if (commercialId) q = q.eq("salesperson_id", commercialId);
  const { data, error } = await q.limit(10000);
  return error ? [] : ((data ?? []) as InvoiceSale[]);
}

export function buildCommercialRow(c: StaffProfile, projects: TeamProject[], commissions: Commission[] | null, now = new Date(), invoices: InvoiceSale[] = []) {
  const mine = projects.filter((p) => p.commercial_id === c.id);
  const projectSales = mine.filter((p) => PAID.has(p.status));
  // A sale = a paid video request assigned to the rep, or an invoice the rep issued (sales space).
  const myInvoices = invoices.filter((i) => i.salesperson_id === c.id);
  const sales = [...projectSales.map((p) => ({ at: p.created_at, cents: p.total_cents })), ...myInvoices.map((i) => ({ at: `${i.issue_date}T12:00:00`, cents: i.total_ht_cents }))];
  const monthSales = sales.filter((s) => inMonth(s.at, now));
  const caMonth = sum(monthSales, (s) => s.cents);
  const target = c.monthly_target_cents ?? null;
  const own = commissions?.filter((x) => x.commercial_id === c.id) ?? null;
  return {
    id: c.id,
    name: displayName(c),
    email: c.email,
    active: c.active !== false,
    commissionRate: c.commission_rate ?? null,
    target,
    salesMonth: monthSales.length,
    caMonth,
    progress: target ? Math.round((caMonth / target) * 100) : null,
    salesTotal: sales.length,
    caTotal: sum(sales, (s) => s.cents),
    quotesSent: mine.length,
    quotesOpen: mine.filter((p) => OPEN_QUOTE.has(p.status)).length,
    conversion: rate(projectSales.length, mine.filter((p) => p.status !== "annule").length),
    commissionMonth: own ? sum(own.filter((x) => inMonth(x.created_at, now)), (x) => x.amount_cents) : null,
    commissionToPay: own ? sum(own.filter((x) => x.status === "validee" || x.status === "a_payer"), (x) => x.amount_cents) : null,
    commissionPending: own ? own.filter((x) => x.status === "en_attente").length : null,
  };
}
export type CommercialRow = ReturnType<typeof buildCommercialRow>;

export function buildVideasteRow(v: StaffProfile, projects: TeamProject[], now = new Date(), hasRevisions = true) {
  const mine = projects.filter((p) => p.videaste_id === v.id);
  const active = mine.filter((p) => isActiveProject(p.status));
  const today = todayISO(now);
  return {
    id: v.id,
    name: displayName(v),
    email: v.email,
    active: v.active !== false,
    activeProjects: active.length,
    delivered: mine.filter((p) => p.status === "termine").length,
    late: active.filter((p) => p.deadline && p.deadline < today).length,
    revisions: hasRevisions ? sum(active, (p) => p.revision_rounds ?? 0) : null,
    inRevision: hasRevisions ? active.filter((p) => (p.revision_rounds ?? 0) > 0).length : null,
    load: loadLevel(active.length, v.active !== false),
  };
}
export type VideasteRow = ReturnType<typeof buildVideasteRow>;

// ---------- Loaders ----------

async function loadStaff(supabase: Supabase, role: StaffRole) {
  const { data } = await supabase.from("profiles").select("*").eq("role", role).order("first_name");
  return (data ?? []) as StaffProfile[];
}

async function loadCommissions(supabase: Supabase, commercialId?: string) {
  let q = supabase.from("commissions").select("id, commercial_id, project_id, amount_cents, status, created_at");
  if (commercialId) q = q.eq("commercial_id", commercialId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(10000);
  return error ? null : ((data ?? []) as Commission[]);
}

/** Commerciaux roster page: one row per sales rep + team totals. */
export async function loadCommerciaux(now = new Date()) {
  const supabase = await createClient();
  const [staff, { projects, level }, commissions, invoices] = await Promise.all([
    loadStaff(supabase, "commercial"),
    selectProjects(supabase, { assigned: { column: "commercial_id" } }),
    loadCommissions(supabase),
    loadInvoiceSales(supabase),
  ]);
  if (level === "none") return { migrated: false as const };
  const rows = staff.map((c) => buildCommercialRow(c, projects, commissions, now, invoices));
  const conversions = rows.map((r) => r.conversion).filter((x): x is number => x !== null);
  return {
    migrated: true as const,
    rows,
    kpis: {
      caMonth: sum(rows, (r) => r.caMonth),
      salesMonth: sum(rows, (r) => r.salesMonth),
      active: rows.filter((r) => r.active).length,
      total: rows.length,
      quotesOpen: sum(rows, (r) => r.quotesOpen),
      conversion: conversions.length ? Math.round((sum(conversions, (x) => x) / conversions.length) * 10) / 10 : null,
      commissionToPay: commissions ? sum(rows, (r) => r.commissionToPay ?? 0) : null,
    },
  };
}

/** Vidéastes roster page: one row per videographer + team totals. */
export async function loadVideastes(now = new Date()) {
  const supabase = await createClient();
  const [staff, { projects, level }] = await Promise.all([
    loadStaff(supabase, "videaste"),
    selectProjects(supabase, { assigned: { column: "videaste_id" } }),
  ]);
  if (level === "none") return { migrated: false as const };
  const hasRevisions = level === "revisions";
  const rows = staff.map((v) => buildVideasteRow(v, projects, now, hasRevisions));
  return {
    migrated: true as const,
    hasRevisions,
    rows,
    kpis: {
      activeProjects: sum(rows, (r) => r.activeProjects),
      delivered: sum(rows, (r) => r.delivered),
      late: sum(rows, (r) => r.late),
      revisions: hasRevisions ? sum(rows, (r) => r.revisions ?? 0) : null,
      active: rows.filter((r) => r.active).length,
      total: rows.length,
      overloaded: rows.filter((r) => r.load === "overloaded").length,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

async function loadPerson(supabase: Supabase, id: string, role: StaffRole) {
  if (!isUuid(id)) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", id).eq("role", role).maybeSingle();
  return (data as StaffProfile | null) ?? null;
}

/** One sales rep: row figures + their sales, open quotes, every assigned project and commissions. */
export async function loadCommercialDetail(id: string, now = new Date()) {
  const supabase = await createClient();
  const person = await loadPerson(supabase, id, "commercial");
  if (!person) return null;
  const [{ projects, level }, commissions, invoices] = await Promise.all([
    selectProjects(supabase, { assigned: { column: "commercial_id", id } }, 1000),
    loadCommissions(supabase, id),
    loadInvoiceSales(supabase, id),
  ]);
  if (level === "none") return { person, migrated: false as const };
  return {
    person,
    migrated: true as const,
    row: buildCommercialRow(person, projects, commissions, now, invoices),
    sales: projects.filter((p) => PAID.has(p.status)),
    openQuotes: projects.filter((p) => OPEN_QUOTE.has(p.status)),
    projects,
    commissions,
    references: new Map(projects.map((p) => [p.id, p.reference])),
  };
}

/** One videographer: row figures + every assigned project with deadline and revision rounds. */
export async function loadVideasteDetail(id: string, now = new Date()) {
  const supabase = await createClient();
  const person = await loadPerson(supabase, id, "videaste");
  if (!person) return null;
  const { projects, level } = await selectProjects(supabase, { assigned: { column: "videaste_id", id } }, 1000);
  if (level === "none") return { person, migrated: false as const };
  const hasRevisions = level === "revisions";
  return {
    person,
    migrated: true as const,
    hasRevisions,
    row: buildVideasteRow(person, projects, now, hasRevisions),
    projects,
    today: todayISO(now),
  };
}

/** Active staff for the assignment selects on /admin?vue=demandes (empty before migration 005). */
export async function loadAssignableStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").in("role", ["commercial", "videaste"]).order("first_name");
  if (error) return { commerciaux: [], videastes: [] };
  const staff = ((data ?? []) as StaffProfile[]).filter((s) => s.active !== false);
  const pick = (role: StaffRole) => staff.filter((s) => s.role === role).map((s) => ({ id: s.id, name: displayName(s) }));
  return { commerciaux: pick("commercial"), videastes: pick("videaste") };
}
