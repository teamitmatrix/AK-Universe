"use server";

import { audit } from "./audit";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { syncProjectProspect } from "@/lib/commercial/project-prospects";
import { notifyCommission, notifyLeadAssigned, notifyProjectPayment } from "@/lib/notify";
import { resolveProjectUniverse } from "@/lib/projects/universe";
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
 * Creates the missing commissions: one "en attente" commission per paid video sale that has a sales rep with a
 * commission rate and no commission yet (amount = sale total × rate). Also backfills subscription commissions
 * (migration 014 ensure_subscription_commission) for paid subscription payments. Idempotent.
 */
export async function generateCommissions(): Promise<{ success: true; created: number; skippedNoRate: number } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const supabase = await createClient();

  const projectSelect = "id, status, total_cents, commercial_id, universe, items";
  let projectsRes = await supabase
    .from("video_projects")
    .select(projectSelect)
    .not("commercial_id", "is", null)
    .in("status", [...PAID])
    .limit(10000);
  if (projectsRes.error && /universe/i.test(projectsRes.error.message)) {
    projectsRes = await supabase
      .from("video_projects")
      .select("id, status, total_cents, commercial_id, items")
      .not("commercial_id", "is", null)
      .in("status", [...PAID])
      .limit(10000);
  }
  const [{ data: existing, error: cErr }, { data: reps }, { data: subPays }] = await Promise.all([
    supabase.from("commissions").select("project_id").not("project_id", "is", null).limit(10000),
    supabase.from("profiles").select("*").eq("role", "commercial"),
    supabase.from("payments").select("id").eq("kind", "subscription").in("status", ["paid", "complete"]).limit(10000),
  ]);
  const pErr = projectsRes.error;
  const projects = projectsRes.data as
    | {
        id: string;
        status: string;
        total_cents: number;
        commercial_id: string;
        universe?: string | null;
        items?: { service?: string }[] | null;
      }[]
    | null;
  if (pErr || cErr) {
    console.error("generateCommissions failed:", (pErr ?? cErr)?.message);
    return fail("failed");
  }
  const done = new Set((existing ?? []).map((c) => c.project_id));
  type RepRates = {
    commission_rate: number | null;
    commission_rate_ai?: number | null;
    commission_rate_marketing?: number | null;
    commission_rate_digital?: number | null;
  };
  const rateOf = new Map((reps ?? []).map((r) => [r.id as string, r as RepRates]));
  const pctFor = (rep: RepRates | undefined, universe: "agents" | "marketing" | "digital") => {
    if (!rep) return null;
    if (universe === "agents") return rep.commission_rate_ai ?? rep.commission_rate;
    if (universe === "marketing") return rep.commission_rate_marketing ?? rep.commission_rate;
    return rep.commission_rate_digital ?? rep.commission_rate;
  };

  let skippedNoRate = 0;
  const rows: { commercial_id: string; project_id: string; amount_cents: number; status: "en_attente" }[] = [];
  for (const p of projects ?? []) {
    if (done.has(p.id)) continue;
    const universe = resolveProjectUniverse(p.universe, p.items);
    const pct = pctFor(rateOf.get(p.commercial_id), universe);
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

  let subCreated = 0;
  if (subPays?.length) {
    const { count: before } = await supabase.from("commissions").select("id", { count: "exact", head: true }).not("payment_id", "is", null);
    for (const pay of subPays) {
      await supabase.rpc("ensure_subscription_commission", { p_payment_id: pay.id });
    }
    const { count: after } = await supabase.from("commissions").select("id", { count: "exact", head: true }).not("payment_id", "is", null);
    subCreated = Math.max(0, (after ?? 0) - (before ?? 0));
  }

  const created = rows.length + subCreated;
  revalidateFinance();
  if (created) await audit("commission.generate", `${created} commission(s)`, { created: rows.length, subscription: subCreated, skippedNoRate });
  return { success: true, created, skippedNoRate };
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

/** Marks every selected commission currently "à payer" as paid (bulk payout). Max 200 ids. */
export async function bulkMarkCommissionsPaid(ids: string[]): Promise<{ success: true; updated: number } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || ids.some((id) => !isUuid(id))) return fail("invalid");
  const supabase = await createClient();
  const paidAt = new Date().toISOString();
  const { data, error } = await supabase.from("commissions").update({ status: "payee", paid_at: paidAt }).in("id", ids).eq("status", "a_payer").select("id");
  if (error) {
    console.error("bulkMarkCommissionsPaid failed:", error.message);
    return fail("failed");
  }
  const updated = data?.length ?? 0;
  revalidateFinance();
  if (updated) {
    await audit("commission.bulk_payee", `${updated} commission(s)`, { updated });
    for (const row of data ?? []) await notifyCommission(row.id, "payee");
  }
  return { success: true, updated };
}

/** Assigns (or clears) the sales rep earning recurring commissions on a subscription. */
export async function assignSubscriptionCommercial(subscriptionId: string, commercialId: string | null): Promise<{ success: true } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  if (!isUuid(subscriptionId) || (commercialId !== null && !isUuid(commercialId))) return fail("invalid");
  const supabase = await createClient();
  if (commercialId) {
    const { data: rep } = await supabase.from("profiles").select("id").eq("id", commercialId).eq("role", "commercial").eq("active", true).maybeSingle();
    if (!rep) return fail("notFound");
  }
  const { data, error } = await supabase.from("subscriptions").update({ commercial_id: commercialId }).eq("id", subscriptionId).select("id");
  if (error) {
    console.error("assignSubscriptionCommercial failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("notFound");
  revalidateFinance();
  await audit("subscription.assign", subscriptionId, { commercialId });
  return { success: true };
}
