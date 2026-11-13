import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Website leads in the pipeline: a video request assigned by an admin to a sales rep becomes (or stays) that rep's
 * prospect, linked by project_id (one prospect per request, migration 011). Written with the service key from
 * server code that already checked the admin; never throws — the assignment / payment itself must not fail.
 *   assign to rep X   → prospect created for X, or handed over to X (logged as "reassigned")
 *   un-assign          → the open prospect is removed (the rep no longer follows this request)
 *   deposit paid       → prospect moved to "gagné" (the rep then converts it to a customer)
 * A prospect already converted to a customer is never moved or removed.
 */

const missing = (m: string) => /prospects/.test(m) && /(does not exist|schema cache|relation)/i.test(m);

export async function syncProjectProspect(projectId: string, commercialId: string | null) {
  try {
    const db = createAdminClient();
    const { data: existing, error: readError } = await db.from("prospects").select("id, salesperson_id, converted_at").eq("project_id", projectId).maybeSingle();
    if (readError) {
      if (!missing(readError.message)) console.warn("syncProjectProspect failed:", readError.message);
      return;
    }
    if (existing?.converted_at) return;

    if (!commercialId) {
      if (existing) await db.from("prospects").delete().eq("id", existing.id).is("converted_at", null);
      return;
    }
    if (existing) {
      if (existing.salesperson_id !== commercialId) await db.from("prospects").update({ salesperson_id: commercialId }).eq("id", existing.id);
      return;
    }

    const { data: p } = await db
      .from("video_projects")
      .select("id, status, total_cents, items, created_at, company:contact->>entreprise, first_name:contact->>prenom, last_name:contact->>nom, email:contact->>email, phone:contact->>tel")
      .eq("id", projectId)
      .maybeSingle();
    // Only open requests are prospects; a paid project is already a sale.
    if (!p || !["nouveau", "acompte_en_attente"].includes(p.status)) return;
    const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.company || p.email || "—";
    const need = ((p.items ?? []) as { service?: string }[]).map((i) => i.service).filter(Boolean).join(" + ");
    const { error } = await db.from("prospects").upsert(
      {
        salesperson_id: commercialId,
        name: name.slice(0, 120),
        company: p.company?.slice(0, 160) || null,
        email: p.email?.toLowerCase().slice(0, 254) || null,
        phone: p.phone?.slice(0, 40) || null,
        source: "site_web",
        need: need.slice(0, 500) || null,
        budget_cents: p.total_cents,
        stage: p.status === "acompte_en_attente" ? "devis_envoye" : "nouveau",
        project_id: projectId,
        created_at: p.created_at,
      },
      { onConflict: "project_id", ignoreDuplicates: true },
    );
    if (error) console.warn("syncProjectProspect insert failed:", error.message);
  } catch (cause) {
    console.warn("syncProjectProspect failed:", cause);
  }
}

/** The client paid the deposit of this request: its prospect is won (still to be converted by the rep). */
export async function markProjectProspectWon(projectId: string) {
  try {
    const { error } = await createAdminClient().from("prospects").update({ stage: "gagne" }).eq("project_id", projectId).is("converted_at", null).neq("stage", "gagne");
    if (error && !missing(error.message)) console.warn("markProjectProspectWon failed:", error.message);
  } catch (cause) {
    console.warn("markProjectProspectWon failed:", cause);
  }
}
