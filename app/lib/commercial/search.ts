import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OPEN_QUOTE, PAID } from "@/lib/admin/team";
import { commercialHref } from "./nav";
import type { CommercialMe } from "./session";

/*
 * Global search of the Commercial header (handoff page 02: "a scoped search endpoint that only ever queries
 * records the authenticated rep is allowed to see"). Searches ONLY the rep's own projects (quotes / prospects,
 * sales / clients) and own tasks: every query is filtered on the rep's id and runs with their session (RLS).
 */

/** Strip characters that have a meaning in PostgREST filters / LIKE patterns (same rule as the admin search). */
const clean = (q: string) => q.replace(/[%_\\,()*:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export type SearchHit = { id: string; group: "prospects" | "documents" | "quotes" | "sales" | "tasks"; title: string; subtitle: string; status?: string; at?: string; href: string | null };

export async function searchMine(me: CommercialMe, raw: string) {
  const q = clean(String(raw ?? ""));
  if (q.length < 2) return { q, tooShort: true as const, hits: [] as SearchHit[] };
  const like = `%${q}%`;
  const supabase = await createClient();

  const [prospects, documents, projects, tasks] = await Promise.all([
    // Before migration 011 this errors and simply returns nothing.
    supabase
      .from("prospects")
      .select("id, name, company, email, stage, updated_at")
      .eq("salesperson_id", me.id)
      .or(`name.ilike.${like},company.ilike.${like},email.ilike.${like}`)
      .order("updated_at", { ascending: false })
      .limit(8),
    // The rep's quotes & invoices (migration 012); before it this errors and returns nothing.
    supabase
      .from("sales_documents")
      .select("id, number, kind, status, client_name, client_email, issue_date")
      .eq("salesperson_id", me.id)
      .or(`number.ilike.${like},client_name.ilike.${like},client_email.ilike.${like}`)
      .order("issue_date", { ascending: false })
      .limit(8),
    supabase
      .from("video_projects")
      .select("id, reference, status, total_cents, created_at, email:contact->>email, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom")
      .eq("commercial_id", me.id)
      .or(`reference.ilike.${like},contact->>email.ilike.${like},contact->>entreprise.ilike.${like},contact->>nom.ilike.${like},contact->>prenom.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase.from("tasks").select("id, title, notes, type, due_at, status").eq("assigned_to", me.id).or(`title.ilike.${like},notes.ilike.${like}`).order("due_at").limit(6),
  ]);

  const hits: SearchHit[] = [];
  for (const p of prospects.data ?? []) {
    hits.push({
      id: p.id,
      group: "prospects",
      title: p.company ? `${p.company} — ${p.name}` : p.name,
      subtitle: p.email ?? "",
      status: `stage:${p.stage}`,
      at: p.updated_at,
      href: commercialHref("prospects"),
    });
  }
  for (const d of documents.data ?? []) {
    hits.push({
      id: d.id,
      group: "documents",
      title: `${d.number} — ${d.client_name}`,
      subtitle: d.client_email ?? "",
      status: `doc:${d.kind}:${d.status}`,
      at: d.issue_date,
      href: `/commercial/document?id=${d.id}`,
    });
  }
  for (const p of projects.data ?? []) {
    const client = p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—";
    const group = OPEN_QUOTE.has(p.status) ? "quotes" : PAID.has(p.status) ? "sales" : null;
    if (!group) continue;
    hits.push({
      id: p.id,
      group,
      title: `${p.reference} — ${client}`,
      subtitle: p.email ?? "",
      status: p.status,
      at: p.created_at,
      href: group === "quotes" ? commercialHref("devisFactures", p.reference) : commercialHref("ventes", p.reference),
    });
  }
  for (const t of tasks.data ?? []) {
    hits.push({ id: t.id, group: "tasks", title: t.title, subtitle: t.notes ?? "", status: t.status, at: t.due_at, href: commercialHref("agenda") });
  }
  return { q, tooShort: false as const, hits };
}
