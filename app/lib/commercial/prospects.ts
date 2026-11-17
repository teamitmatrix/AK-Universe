import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/admin/team";
import type { CommercialMe } from "./session";
import { OPEN_STAGES, isStage, type ProspectCard, type ProspectEvent } from "./stages";

/*
 * Prospect pipeline of the signed-in rep (handoff page 05, migration 011). Every query is filtered on the rep's id
 * AND runs with their session, so RLS returns only their own rows — never another rep's, whatever id is asked for.
 */

const COLUMNS =
  "id, name, company, email, phone, source, need, budget_cents, stage, next_action, next_followup_at, notes, lost_reason, customer_id, converted_at, created_at, updated_at, project:video_projects(reference)";

type Row = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  need: string | null;
  budget_cents: number | null;
  stage: string;
  next_action: string | null;
  next_followup_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  customer_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  project: { reference: string } | { reference: string }[] | null;
};

const toCard = (r: Row): ProspectCard => ({
  id: r.id,
  name: r.name,
  company: r.company,
  email: r.email,
  phone: r.phone,
  source: r.source,
  need: r.need,
  budgetCents: r.budget_cents,
  stage: isStage(r.stage) ? r.stage : "nouveau",
  nextAction: r.next_action,
  nextFollowupAt: r.next_followup_at,
  notes: r.notes,
  lostReason: r.lost_reason,
  projectReference: (Array.isArray(r.project) ? r.project[0]?.reference : r.project?.reference) ?? null,
  customerId: r.customer_id,
  convertedAt: r.converted_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export async function loadPipeline(me: CommercialMe, now = Date.now()) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("prospects").select(COLUMNS).eq("salesperson_id", me.id).order("updated_at", { ascending: false }).limit(1000);
  // Before migration 011 the table does not exist: the page says so instead of inventing cards.
  if (error) return { ready: false as const };
  const cards = ((data ?? []) as unknown as Row[]).map(toCard);
  const open = cards.filter((c) => OPEN_STAGES.includes(c.stage));
  const won = cards.filter((c) => c.stage === "gagne").length;
  const lost = cards.filter((c) => c.stage === "perdu").length;
  return {
    ready: true as const,
    /** Server time of this load: the board marks late follow-ups with it (same value on server and client). */
    now,
    cards,
    kpis: {
      active: open.length,
      pipelineCents: open.reduce((s, c) => s + (c.budgetCents ?? 0), 0),
      conversion: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
      lateFollowups: open.filter((c) => c.nextFollowupAt && new Date(c.nextFollowupAt).getTime() < now).length,
    },
  };
}
export type Pipeline = Awaited<ReturnType<typeof loadPipeline>>;

/** One prospect of the rep (null if it is not theirs — RLS + filter). */
export async function loadProspect(me: CommercialMe, id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select(COLUMNS).eq("id", id).eq("salesperson_id", me.id).maybeSingle();
  return data ? toCard(data as unknown as Row) : null;
}

/** History of one of the rep's prospects (server-side log, migration 011). */
export async function loadProspectHistory(me: CommercialMe, id: string): Promise<ProspectEvent[] | null> {
  if (!(await loadProspect(me, id))) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("prospect_events").select("id, kind, from_stage, to_stage, actor_id, created_at").eq("prospect_id", id).order("created_at").limit(200);
  if (error) return null;
  // Names of the people who acted (the rep, an admin): read with the service key, only for these ids.
  const ids = [...new Set((data ?? []).map((e) => e.actor_id).filter((x): x is string => !!x && x !== me.id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await createAdminClient().from("profiles").select("id, email, first_name, last_name").in("id", ids);
    for (const p of people ?? []) names.set(p.id, displayName(p));
  }
  return (data ?? []).map((e) => ({
    id: e.id as number,
    kind: e.kind as ProspectEvent["kind"],
    fromStage: e.from_stage,
    toStage: e.to_stage,
    actor: e.actor_id === me.id ? me.name : e.actor_id ? (names.get(e.actor_id) ?? null) : null,
    at: e.created_at,
  }));
}
