import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  PAID,
  buildCommercialRow, loadInvoiceSales,
  buildVideasteRow,
  isActiveProject as isActive,
  selectProjects,
  todayISO,
  type Commission,
  type StaffProfile,
} from "./team";

/**
 * Admin dashboard figures, computed from the real tables only (payments, video_projects, subscriptions,
 * profiles, commissions). Nothing here is simulated: a figure whose source does not exist yet
 * (migration 005 not applied, no analytics tool connected) is returned as null and shown as "unavailable".
 *
 * Every query runs with the signed-in admin's session, so Row Level Security (is_admin()) re-checks the role.
 */

const DAY = 86_400_000;
/** A deposit still unpaid after this many days counts as a late payment. */
export const LATE_PAYMENT_DAYS = 7;
/** A checkout still unpaid after this many hours counts as abandoned. */
export const ABANDONED_AFTER_HOURS = 24;

export const PERIODS = ["7j", "30j", "mois", "mois-precedent"] as const;
export type Period = (typeof PERIODS)[number];
export const isPeriod = (v: unknown): v is Period => PERIODS.includes(v as Period);

type Payment = { amount_cents: number; status: string; created_at: string; kind?: string };
type Subscription = { user_id: string; status: string; monthly_total_cents: number; created_at: string };

const startOfMonth = (d: Date, offset = 0) => new Date(d.getFullYear(), d.getMonth() + offset, 1);
const sum = <T>(rows: T[], pick: (r: T) => number) => rows.reduce((total, r) => total + pick(r), 0);
const inRange = (iso: string, from: Date, to: Date) => {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < to.getTime();
};
/** Percentage change, or null when there is nothing to compare with. */
const delta = (current: number, previous: number) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);
/** [from, to) of the selected period, and of the same-length period just before it. */
function periodRange(period: Period, now: Date) {
  let from: Date;
  let to: Date;
  if (period === "mois") {
    from = startOfMonth(now);
    to = now;
  } else if (period === "mois-precedent") {
    from = startOfMonth(now, -1);
    to = startOfMonth(now);
  } else {
    to = now;
    from = new Date(now.getTime() - (period === "7j" ? 7 : 30) * DAY);
  }
  const length = to.getTime() - from.getTime();
  const prevFrom = period === "mois-precedent" ? startOfMonth(now, -2) : period === "mois" ? startOfMonth(now, -1) : new Date(from.getTime() - length);
  const prevTo = period === "mois" ? new Date(prevFrom.getTime() + length) : from;
  return { from, to, prevFrom, prevTo };
}

export async function loadDashboard(period: Period, now = new Date()) {
  const supabase = await createClient();
  const range = periodRange(period, now);
  const sixMonthsAgo = startOfMonth(now, -5);
  // 12 months of projects: covers the revenue chart, the period comparisons and the active workload.
  const projectsSince = startOfMonth(now, -12);

  const [{ projects, level }, paymentsRes, subsRes, profilesRes, staffRes, commissionsRes, projectPaymentsRes] = await Promise.all([
    selectProjects(supabase, { since: projectsSince }),
    supabase.from("payments").select("amount_cents, status, created_at, kind").gte("created_at", sixMonthsAgo.toISOString()).limit(10000),
    supabase.from("subscriptions").select("user_id, status, monthly_total_cents, created_at").limit(10000),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", range.from.toISOString()).lt("created_at", range.to.toISOString()),
    supabase.from("profiles").select("*").in("role", ["commercial", "videaste"]).order("first_name"),
    supabase.from("commissions").select("id, commercial_id, project_id, amount_cents, status, created_at").limit(10000),
    // All-time payments per project: what is already collected on each sale (deposit + recorded balance).
    supabase.from("payments").select("project_id, amount_cents, created_at").eq("status", "paid").not("project_id", "is", null).limit(20000),
  ]);

  const migrated = level !== "none";
  const payments = ((paymentsRes.data ?? []) as Payment[]).filter((p) => p.status === "paid");
  const subs = (subsRes.data ?? []) as Subscription[];
  const staff = (staffRes.data ?? []) as StaffProfile[];
  const commissions = commissionsRes.error ? null : ((commissionsRes.data ?? []) as Commission[]);

  // ---------- KPI row ----------
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(now, -1);
  // Same number of elapsed days last month, so the comparison is fair mid-month.
  const prevMonthSameDay = new Date(prevMonthStart.getTime() + (now.getTime() - monthStart.getTime()));
  const thisMonthPayments = payments.filter((p) => inRange(p.created_at, monthStart, now));
  const prevMonthPayments = payments.filter((p) => inRange(p.created_at, prevMonthStart, prevMonthSameDay));
  // Encaissé = money received this month.
  const collected = sum(thisMonthPayments, (p) => p.amount_cents);
  const prevCollected = sum(prevMonthPayments, (p) => p.amount_cents);

  const collectedByProject = new Map<string, number>();
  const firstPayment = new Map<string, string>();
  for (const p of (projectPaymentsRes.data ?? []) as { project_id: string; amount_cents: number; created_at: string }[]) {
    collectedByProject.set(p.project_id, (collectedByProject.get(p.project_id) ?? 0) + p.amount_cents);
    if (!firstPayment.has(p.project_id) || p.created_at < firstPayment.get(p.project_id)!) firstPayment.set(p.project_id, p.created_at);
  }
  // CA = sales signed in the period (same definition as the Ventes page): full total of each video sale on the
  // day its deposit was paid, plus subscription payments.
  const signedIn = (from: Date, to: Date) =>
    sum(projects.filter((p) => PAID.has(p.status) && inRange(firstPayment.get(p.id) ?? p.created_at, from, to)), (p) => p.total_cents) +
    sum(payments.filter((p) => p.kind === "subscription" && inRange(p.created_at, from, to)), (p) => p.amount_cents);
  const revenue = signedIn(monthStart, now);
  const prevRevenue = signedIn(prevMonthStart, prevMonthSameDay);
  const salesIn = (from: Date, to: Date) =>
    projects.filter((p) => PAID.has(p.status) && inRange(firstPayment.get(p.id) ?? p.created_at, from, to)).length +
    payments.filter((p) => p.kind === "subscription" && inRange(p.created_at, from, to)).length;

  // Active client = active subscription or a paid project still in progress (guests counted by e-mail).
  const activeClients = new Set<string>();
  for (const s of subs) if (s.status === "active") activeClients.add(`u:${s.user_id}`);
  for (const p of projects)
    if (p.status === "acompte_paye" || p.status === "en_cours") activeClients.add(p.user_id ? `u:${p.user_id}` : `e:${(p.email ?? p.id).toLowerCase()}`);

  // À encaisser = deposits awaited + what is still due on every sale (total − already collected), as on the Ventes page.
  const toCollect =
    sum(projects.filter((p) => p.status === "acompte_en_attente"), (p) => p.deposit_cents) +
    sum(projects.filter((p) => PAID.has(p.status)), (p) => Math.max(0, p.total_cents - (collectedByProject.get(p.id) ?? 0)));

  const last30 = projects.filter((p) => inRange(p.created_at, new Date(now.getTime() - 30 * DAY), now));
  const prev30 = projects.filter((p) => inRange(p.created_at, new Date(now.getTime() - 60 * DAY), new Date(now.getTime() - 30 * DAY)));
  const conv = rate(last30.filter((p) => PAID.has(p.status)).length, last30.length);
  const prevConv = rate(prev30.filter((p) => PAID.has(p.status)).length, prev30.length);

  const kpis = {
    revenue: { value: revenue, delta: delta(revenue, prevRevenue) },
    collected: { value: collected, delta: delta(collected, prevCollected) },
    orders: { value: salesIn(monthStart, now), delta: delta(salesIn(monthStart, now), salesIn(prevMonthStart, prevMonthSameDay)) },
    activeClients: activeClients.size,
    prospects: projects.filter((p) => p.status === "nouveau" || p.status === "acompte_en_attente").length,
    toCollect,
    conversion: { value: conv, delta: conv !== null && prevConv !== null ? Math.round((conv - prevConv) * 10) / 10 : null },
    pendingCommissions: commissions ? sum(commissions.filter((c) => c.status === "validee" || c.status === "a_payer"), (c) => c.amount_cents) : null,
  };

  // ---------- Revenue, last 6 months (real paid payments) ----------
  const revenueSeries = Array.from({ length: 6 }, (_, i) => {
    const from = startOfMonth(now, i - 5);
    const to = startOfMonth(now, i - 4);
    const rows = payments.filter((p) => inRange(p.created_at, from, to));
    return { month: from.toISOString(), cents: sum(rows, (p) => p.amount_cents), count: rows.length };
  });

  // ---------- Site performance + conversion funnel, for the selected period ----------
  const abandonCutoff = new Date(now.getTime() - ABANDONED_AFTER_HOURS * 3_600_000);
  const periodStats = (from: Date, to: Date) => {
    const reqs = projects.filter((p) => inRange(p.created_at, from, to));
    const checkouts = reqs.filter((p) => p.kind === "acompte");
    const paid = reqs.filter((p) => PAID.has(p.status));
    const periodSubs = subs.filter((s) => inRange(s.created_at, from, to));
    return {
      requests: reqs.length,
      checkouts: checkouts.length,
      paid: paid.length,
      abandonedDeposits: checkouts.filter((p) => p.status === "acompte_en_attente" && new Date(p.created_at) < abandonCutoff),
      subsStarted: periodSubs.length,
      subsActive: periodSubs.filter((s) => s.status === "active").length,
      abandonedSubs: periodSubs.filter((s) => (s.status === "pending" || s.status === "incomplete") && new Date(s.created_at) < abandonCutoff),
      revenue: sum(payments.filter((p) => inRange(p.created_at, from, to)), (p) => p.amount_cents),
    };
  };
  const cur = periodStats(range.from, range.to);
  const prev = periodStats(range.prevFrom, range.prevTo);
  const { count: prevSignups } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", range.prevFrom.toISOString())
    .lt("created_at", range.prevTo.toISOString());
  const signups = profilesRes.count ?? 0;

  const site = {
    signups: { value: signups, delta: delta(signups, prevSignups ?? 0) },
    requests: { value: cur.requests, delta: delta(cur.requests, prev.requests) },
    checkouts: { value: cur.checkouts + cur.subsStarted, delta: delta(cur.checkouts + cur.subsStarted, prev.checkouts + prev.subsStarted) },
    paid: { value: cur.paid + cur.subsActive, delta: delta(cur.paid + cur.subsActive, prev.paid + prev.subsActive) },
    revenue: { value: cur.revenue, delta: delta(cur.revenue, prev.revenue) },
    conversion: rate(cur.paid, cur.requests),
  };

  const abandonedCount = cur.abandonedDeposits.length + cur.abandonedSubs.length;
  const funnel = {
    requests: cur.requests + cur.subsStarted,
    checkouts: cur.checkouts + cur.subsStarted,
    abandoned: abandonedCount,
    paid: cur.paid + cur.subsActive,
  };

  /** Aggregates only: the browser never receives a name, e-mail, reference or session of a visitor (RGPD). */
  const abandonedCarts = {
    checkouts: funnel.checkouts,
    abandoned: abandonedCount,
    rate: rate(abandonedCount, funnel.checkouts),
    deposits: { count: cur.abandonedDeposits.length, valueCents: sum(cur.abandonedDeposits, (p) => p.deposit_cents) },
    subscriptions: { count: cur.abandonedSubs.length, monthlyCents: sum(cur.abandonedSubs, (s) => s.monthly_total_cents) },
    hours: ABANDONED_AFTER_HOURS,
  };

  // ---------- Teams ----------
  const commerciaux = staff.filter((s) => s.role === "commercial");
  const videastes = staff.filter((s) => s.role === "videaste");

  // Same row builders as the Commerciaux / Vidéastes pages, so both screens always agree.
  const invoices = migrated ? await loadInvoiceSales(supabase) : [];
  const commercialRows = migrated ? commerciaux.map((c) => buildCommercialRow(c, projects, commissions, now, invoices)) : null;
  const videasteRows = migrated ? videastes.map((v) => buildVideasteRow(v, projects, now, level === "revisions")) : null;

  // ---------- Urgent items ----------
  const lateCutoff = new Date(now.getTime() - LATE_PAYMENT_DAYS * DAY);
  const urgent = {
    pendingCommissions: commissions ? commissions.filter((c) => c.status === "en_attente").length : null,
    latePayments:
      projects.filter((p) => p.status === "acompte_en_attente" && new Date(p.created_at) < lateCutoff).length +
      subs.filter((s) => s.status === "past_due").length,
    unassignedProspects: migrated ? projects.filter((p) => p.status === "nouveau" && !p.commercial_id).length : null,
    overdueProjects: migrated ? projects.filter((p) => isActive(p.status) && p.deadline && p.deadline < todayISO(now)).length : null,
    overloadedVideastes: videasteRows ? videasteRows.filter((v) => v.load === "overloaded").length : null,
  };

  // Next deadlines (late first), with the videographer in charge.
  const staffName = new Map(staff.map((s) => [s.id, [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email]));
  const today = todayISO(now);
  const deadlines = migrated
    ? projects
        .filter((p) => isActive(p.status) && p.deadline)
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          reference: p.reference,
          client: p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || "—",
          deadline: p.deadline!,
          late: p.deadline! < today,
          videaste: p.videaste_id ? (staffName.get(p.videaste_id) ?? null) : null,
          videasteId: p.videaste_id ?? null,
        }))
    : null;

  return { period, kpis, revenueSeries, site, funnel, abandonedCarts, urgent, commercialRows, videasteRows, migrated, deadlines };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
