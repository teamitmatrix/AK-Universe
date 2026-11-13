import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OPEN_QUOTE, buildCommercialRow, loadInvoiceSales, selectProjects, type Commission } from "@/lib/admin/team";
import { loadNextAppointments } from "./agenda";
import type { CommercialMe } from "./session";

/*
 * Commercial dashboard (handoff pages 07 / 09): the rep's own month KPIs and three widgets.
 * Same definitions as the admin space (lib/admin/team.ts → buildCommercialRow), so the rep and the admin always
 * see the same figures:
 *   CA généré ce mois   = total of the rep's sales (deposit paid) created this month
 *   Nombre de ventes    = those sales
 *   Commission générée  = commissions created this month
 *   Commission à payer  = commissions validated or approved for payout (validee + a_payer)
 *   Commission payée    = commissions paid this month (paid_at)
 *   Objectif mensuel    = monthly_target_cents set by an admin
 * Every query is filtered on the rep's id AND runs with the rep's session (RLS), so nothing of another rep can leak.
 */

const DAY = 86_400_000;
/** A quote with no answer after this many days is flagged "à relancer". */
export const FOLLOW_UP_AFTER_DAYS = 3;
const APPOINTMENT_TYPES = new Set(["rdv", "appel", "reunion"]);

type Task = { id: string; title: string; notes: string | null; type: string; due_at: string; status: "a_faire" | "fait"; project_id: string | null };

export async function loadCommercialDashboard(me: CommercialMe, now = new Date()) {
  const supabase = await createClient();
  const [{ projects }, commissionsRes, tasksRes, invoices, events, quoteDocs] = await Promise.all([
    selectProjects(supabase, { assigned: { column: "commercial_id", id: me.id } }, 2000),
    supabase.from("commissions").select("id, commercial_id, project_id, amount_cents, status, created_at, paid_at").eq("commercial_id", me.id).limit(5000),
    supabase.from("tasks").select("id, title, notes, type, due_at, status, project_id").eq("assigned_to", me.id).eq("status", "a_faire").order("due_at").limit(500),
    loadInvoiceSales(supabase, me.id),
    loadNextAppointments(me, 5),
    // The rep's own sent quotes (sales space, migration 012); [] before.
    supabase.from("sales_documents").select("id, number, client_name, total_ttc_cents, issue_date, created_at").eq("salesperson_id", me.id).eq("kind", "devis").eq("status", "en_attente").limit(200),
  ]);

  const commissions = commissionsRes.error ? null : ((commissionsRes.data ?? []) as (Commission & { paid_at: string | null })[]);
  const row = buildCommercialRow(me.profile, projects, commissions, now, invoices);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidMonth = commissions
    ? commissions.filter((c) => c.status === "payee" && c.paid_at && new Date(c.paid_at) >= monthStart).reduce((s, c) => s + c.amount_cents, 0)
    : null;

  const nowMs = now.getTime();
  const quotes = projects
    .filter((p) => OPEN_QUOTE.has(p.status))
    .map((p) => ({
      id: p.id,
      reference: p.reference,
      client: p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—",
      status: p.status,
      totalCents: p.total_cents,
      createdAt: p.created_at,
      ageDays: Math.floor((nowMs - new Date(p.created_at).getTime()) / DAY),
    }))
    .concat(
      (quoteDocs.error ? [] : (quoteDocs.data ?? [])).map((d) => ({
        id: d.id as string,
        reference: d.number as string,
        client: d.client_name as string,
        status: "envoye",
        totalCents: d.total_ttc_cents as number,
        createdAt: `${d.issue_date}T12:00:00`,
        ageDays: Math.max(0, Math.floor((nowMs - new Date(`${d.issue_date}T12:00:00`).getTime()) / DAY)),
      })),
    )
    // Oldest first: the ones waiting longest need a call first.
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const tasks = tasksRes.error ? null : ((tasksRes.data ?? []) as Task[]);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const appointments = (tasks ?? []).filter((t) => APPOINTMENT_TYPES.has(t.type) && new Date(t.due_at).getTime() >= nowMs - 3_600_000);
  const today = (tasks ?? []).filter((t) => new Date(t.due_at).getTime() < endOfToday);

  return {
    kpis: {
      caMonth: row.caMonth,
      salesMonth: row.salesMonth,
      commissionMonth: row.commissionMonth,
      commissionToPay: row.commissionToPay,
      commissionPaidMonth: paidMonth,
      target: row.target,
      progress: row.progress,
    },
    quotes: {
      total: quotes.length,
      toFollowUp: quotes.filter((q) => q.ageDays >= FOLLOW_UP_AFTER_DAYS).length,
      items: quotes.slice(0, 6),
    },
    tasksReady: tasks !== null,
    appointments: [...events, ...appointments.map((t) => ({ id: t.id, title: t.title, notes: t.notes, type: t.type, dueAt: t.due_at }))]
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .slice(0, 5),
    today: today.slice(0, 8).map((t) => ({ id: t.id, title: t.title, notes: t.notes, type: t.type, dueAt: t.due_at, overdue: new Date(t.due_at).getTime() < nowMs })),
    todayTotal: today.length,
  };
}
export type CommercialDashboard = Awaited<ReturnType<typeof loadCommercialDashboard>>;
