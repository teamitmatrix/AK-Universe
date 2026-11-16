import "server-only";
import { createClient } from "@/lib/supabase/server";
import { loadCatalogue } from "./catalogue";
import { displayName, type StaffProfile } from "./team";

/**
 * Global admin search (header of every admin page): team, site accounts, the commercial pipeline
 * (prospects, customers, quotes and invoices), video projects and catalogue items.
 * Reads the existing tables with the admin's session (RLS applies). A missing table is skipped.
 */

/** Strip characters that have a meaning in PostgREST filters / LIKE patterns. */
const clean = (q: string) => q.replace(/[%_\\,()*:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export async function searchAdmin(raw: string) {
  const q = clean(raw);
  if (q.length < 2) return { q, tooShort: true as const };
  const like = `%${q}%`;
  const supabase = await createClient();

  const [people, projects, catalogue, prospects, customers, documents] = await Promise.all([
    supabase.from("profiles").select("*").or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`).limit(20),
    supabase
      .from("video_projects")
      .select("id, reference, status, kind, total_cents, created_at, email:contact->>email, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom")
      .or(`reference.ilike.${like},contact->>email.ilike.${like},contact->>entreprise.ilike.${like},contact->>nom.ilike.${like},contact->>prenom.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(20),
    loadCatalogue(),
    supabase.from("prospects").select("id, name, company, email, stage").or(`name.ilike.${like},company.ilike.${like},email.ilike.${like},phone.ilike.${like}`).order("updated_at", { ascending: false }).limit(20),
    supabase.from("customers").select("id, name, company, email").or(`name.ilike.${like},company.ilike.${like},email.ilike.${like},phone.ilike.${like}`).order("created_at", { ascending: false }).limit(20),
    supabase
      .from("sales_documents")
      .select("id, number, kind, status, client_name, client_email, total_ht_cents")
      .or(`number.ilike.${like},client_name.ilike.${like},client_email.ilike.${like}`)
      .order("issue_date", { ascending: false })
      .limit(20),
  ]);

  const lower = q.toLowerCase();
  const profiles = (people.data ?? []) as (StaffProfile | (Omit<StaffProfile, "role"> & { role: "admin" | "user" }))[];
  return {
    q,
    tooShort: false as const,
    team: profiles.filter((p) => p.role !== "user").map((p) => ({ id: p.id, name: displayName(p), email: p.email, role: p.role, active: p.active !== false })),
    accounts: profiles.filter((p) => p.role === "user").map((p) => ({ id: p.id, name: displayName(p), email: p.email })),
    projects: (projects.data ?? []).map((p) => ({
      id: p.id,
      reference: p.reference,
      status: p.status,
      kind: p.kind,
      totalCents: p.total_cents,
      createdAt: p.created_at,
      client: p.company || [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "—",
      email: p.email ?? "",
    })),
    catalogue: catalogue.rows.filter((r) => r.name.toLowerCase().includes(lower) || r.detail.toLowerCase().includes(lower)).slice(0, 10),
    prospects: (prospects.error ? [] : (prospects.data ?? [])).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      company: (p.company as string | null) ?? "",
      email: (p.email as string | null) ?? "",
      stage: p.stage as string,
    })),
    customers: (customers.error ? [] : (customers.data ?? [])).map((c) => ({
      id: c.id as string,
      name: ((c.company as string | null) || (c.name as string)) ?? "—",
      contact: c.company ? (c.name as string) : "",
      email: (c.email as string | null) ?? "",
    })),
    documents: (documents.error ? [] : (documents.data ?? [])).map((d) => ({
      id: d.id as string,
      number: (d.number as string | null) ?? "—",
      kind: d.kind as "devis" | "facture",
      status: d.status as string,
      client: d.client_name as string,
      amountCents: Number(d.total_ht_cents ?? 0),
    })),
  };
}
