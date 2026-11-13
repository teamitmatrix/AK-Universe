"use server";

import { audit } from "./audit";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { syncProjectProspect } from "@/lib/commercial/project-prospects";
import { notifyCommission, notifyLeadAssigned, notifyProjectPayment } from "@/lib/notify";
import { PAID, isUuid } from "./team";

/**
 * CRM / finance writes of the admin space. Each action re-checks the admin role itself, validates its input
 * and re-reads the rows it changes from the database — amounts are always computed on the server, never taken
 * from the browser. RLS re-checks the admin role in the database (migrations 005 and 007).
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "nothingDue" | "staleStatus" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });

function revalidateFinance() {
  for (const path of ["/admin/dashboard", "/admin/clients", "/admin/prospects", "/admin/ventes", "/admin/devis-factures", "/admin/commissions", "/admin/commerciaux", "/admin/commercial-detail", "/admin"]) {
    revalidatePath(path);
  }
}

/** Assigns (or un-assigns, with null) an open prospect to an active sales rep. */
export async function assignProspect(projectId: string, commercialId: string | null): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(projectId) || (commercialId !== null && !isUuid(commercialId))) return fail("invalid");
  const supabase = await createClient();
  if (commercialId) {
    const { data: rep } = await supabase.from("profiles").select("*").eq("id", commercialId).eq("role", "commercial").maybeSingle();
    if (!rep || rep.active === false) return fail("notFound");
  }
  const { data, error } = await supabase.from("video_projects").update({ commercial_id: commercialId }).eq("id", projectId).select("id");
  if (error) {
    console.error("assignProspect failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("notFound");
  revalidateFinance();
  await syncProjectProspect(projectId, commercialId);
  await notifyLeadAssigned(projectId, commercialId);
  return { success: true };
}

/**
 * Records that the remaining balance of a paid video project has been collected (bank transfer, cheque…).
 * The amount is recomputed here: project total minus what `payments` already holds for it.
 */
export async function recordBalance(projectId: string): Promise<{ success: true; amountCents: number } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(projectId)) return fail("invalid");
  const supabase = await createClient();

  const { data: project } = await supabase.from("video_projects").select("id, user_id, status, total_cents").eq("id", projectId).maybeSingle();
  if (!project) return fail("notFound");
  if (!PAID.has(project.status)) return fail("invalid");

  const { data: paid } = await supabase.from("payments").select("amount_cents").eq("project_id", projectId).eq("status", "paid");
  const remaining = project.total_cents - (paid ?? []).reduce((s, p) => s + p.amount_cents, 0);
  if (remaining <= 0) return fail("nothingDue");

  const { error } = await supabase.from("payments").insert({
    user_id: project.user_id,
    kind: "balance",
    project_id: projectId,
    amount_cents: remaining,
    currency: "eur",
    status: "paid",
  });
  if (error) {
    console.error("recordBalance failed:", error.message);
    return fail("failed");
  }
  revalidateFinance();
  await audit("payment.balance", projectId, { amountCents: remaining });
  await notifyProjectPayment("invoice_paid", projectId, remaining, `balance:${projectId}`);
  return { success: true, amountCents: remaining };
}

/**
 * Creates the missing commissions: one "en attente" commission per paid sale that has a sales rep with a
 * commission rate and no commission yet (amount = sale total × rate). Idempotent — a unique index on
 * commissions.project_id (migration 007) prevents duplicates even if two admins click at once.
 */
export async function generateCommissions(): Promise<{ success: true; created: number; skippedNoRate: number } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const supabase = await createClient();

  const [{ data: projects, error: pErr }, { data: existing, error: cErr }, { data: reps }] = await Promise.all([
    supabase.from("video_projects").select("id, status, total_cents, commercial_id").not("commercial_id", "is", null).in("status", [...PAID]).limit(10000),
    supabase.from("commissions").select("project_id").not("project_id", "is", null).limit(10000),
    supabase.from("profiles").select("*").eq("role", "commercial"),
  ]);
  if (pErr || cErr) {
    console.error("generateCommissions failed:", (pErr ?? cErr)?.message);
    return fail("failed");
  }
  const done = new Set((existing ?? []).map((c) => c.project_id));
  const rateOf = new Map((reps ?? []).map((r) => [r.id as string, r.commission_rate as number | null]));

  let skippedNoRate = 0;
  const rows: { commercial_id: string; project_id: string; amount_cents: number; status: "en_attente" }[] = [];
  for (const p of projects ?? []) {
    if (done.has(p.id)) continue;
    const pct = rateOf.get(p.commercial_id);
    if (pct == null) {
      skippedNoRate += 1;
      continue;
    }
    rows.push({ commercial_id: p.commercial_id, project_id: p.id, amount_cents: Math.round((p.total_cents * Number(pct)) / 100), status: "en_attente" });
  }
  if (rows.length) {
    const { error } = await supabase.from("commissions").upsert(rows, { onConflict: "project_id", ignoreDuplicates: true });
    if (error) {
      console.error("generateCommissions insert failed:", error.message);
      return fail("failed");
    }
  }
  revalidateFinance();
  if (rows.length) await audit("commission.generate", `${rows.length} commission(s)`, { created: rows.length, skippedNoRate });
  return { success: true, created: rows.length, skippedNoRate };
}

/** Allowed commission workflow: en attente → validée → à payer → payée. */
const NEXT: Record<string, { from: string; stamp?: "validated_at" | "paid_at" }> = {
  validee: { from: "en_attente", stamp: "validated_at" },
  a_payer: { from: "validee" },
  payee: { from: "a_payer", stamp: "paid_at" },
};

export async function setCommissionStatus(id: string, to: "validee" | "a_payer" | "payee"): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const step = NEXT[to];
  if (!isUuid(id) || !step) return fail("invalid");
  const supabase = await createClient();
  const update: Record<string, string> = { status: to };
  if (step.stamp) update[step.stamp] = new Date().toISOString();
  // `.eq("status", from)` makes the transition atomic: a stale screen cannot skip a step or pay twice.
  const { data, error } = await supabase.from("commissions").update(update).eq("id", id).eq("status", step.from).select("id");
  if (error) {
    console.error("setCommissionStatus failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("staleStatus");
  revalidateFinance();
  await audit(`commission.${to}`, id);
  if (to === "validee" || to === "payee") await notifyCommission(id, to);
  return { success: true };
}
