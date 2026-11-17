"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/admin/team";
import { loadProspectHistory } from "./prospects";
import { getCommercial } from "./session";
import { SOURCES, isStage, type ProspectEvent, type Stage } from "./stages";

/*
 * Writes of the prospect pipeline. Server actions are public endpoints, so each one:
 *   1. re-checks the caller (active sales rep, from the database);
 *   2. validates every field on the server;
 *   3. writes with the rep's session AND `.eq("salesperson_id", me.id)` — RLS refuses anything else anyway,
 *      so a guessed / incremented id can never touch another rep's prospect.
 * The stage history is written by a database trigger; the conversion is one database transaction.
 */

type Fail = { success: false; error: "forbidden" | "invalid" | "notFound" | "converted" | "lost" | "failed" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });
const revalidate = () => {
  revalidatePath("/commercial/prospects");
  revalidatePath("/commercial/dashboard");
};

export type ProspectInput = {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  need: string;
  budgetEuros: string;
  nextAction: string;
  nextFollowupAt: string; // ISO date-time or ""
  notes: string;
};

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};

/** Validated row, or null when a field is invalid. */
function parse(input: ProspectInput) {
  const name = text(input.name, 120);
  const company = text(input.company, 160);
  const email = text(input.email, 254);
  const phone = text(input.phone, 40);
  const need = text(input.need, 500);
  const nextAction = text(input.nextAction, 200);
  const notes = text(input.notes, 4000);
  const source = text(input.source, 40);
  if (!name || [company, email, phone, need, nextAction, notes, source].includes(undefined)) return null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (phone && !/^[+0-9 ().-]{6,40}$/.test(phone)) return null;
  if (source && !(SOURCES as readonly string[]).includes(source)) return null;
  const rawBudget = String(input.budgetEuros ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const budget = rawBudget === "" ? null : Number(rawBudget);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 10_000_000)) return null;
  const rawDate = String(input.nextFollowupAt ?? "").trim();
  const followup = rawDate === "" ? null : Date.parse(rawDate);
  if (followup !== null && Number.isNaN(followup)) return null;
  return {
    name,
    company,
    email: email?.toLowerCase() ?? null,
    phone,
    source,
    need,
    budget_cents: budget === null ? null : Math.round(budget * 100),
    next_action: nextAction,
    next_followup_at: followup === null ? null : new Date(followup).toISOString(),
    notes,
  };
}

export async function createProspect(input: ProspectInput): Promise<{ success: true; id: string } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  const row = parse(input);
  if (!row) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("prospects").insert({ ...row, salesperson_id: me.id, stage: "nouveau" }).select("id").single();
  if (error || !data) {
    console.error("createProspect failed:", error?.message);
    return fail("failed");
  }
  revalidate();
  return { success: true, id: data.id };
}

export async function updateProspect(id: string, input: ProspectInput): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const row = parse(input);
  if (!row) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.from("prospects").update(row).eq("id", id).eq("salesperson_id", me.id).select("id");
  if (error) {
    console.error("updateProspect failed:", error.message);
    return fail("failed");
  }
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}

/** Moves a card to another stage (buttons or drag-and-drop). "perdu" may carry a reason. */
export async function moveProspect(id: string, stage: Stage, lostReason?: string): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id) || !isStage(stage)) return fail("invalid");
  const reason = stage === "perdu" ? text(lostReason, 300) : null;
  if (reason === undefined) return fail("invalid");
  const supabase = await createClient();
  const { data: current } = await supabase.from("prospects").select("stage, converted_at").eq("id", id).eq("salesperson_id", me.id).maybeSingle();
  if (!current) return fail("notFound");
  if (current.converted_at) return fail("converted");
  if (current.stage === stage) return { success: true };
  const { data, error } = await supabase.from("prospects").update({ stage, lost_reason: reason }).eq("id", id).eq("salesperson_id", me.id).select("id");
  if (error) {
    console.error("moveProspect failed:", error.message);
    return fail(/converted_prospect/.test(error.message) ? "converted" : "failed");
  }
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}

export async function deleteProspect(id: string): Promise<{ success: true } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  // RLS also refuses converted prospects: they are the history of a customer.
  const { data, error } = await supabase.from("prospects").delete().eq("id", id).eq("salesperson_id", me.id).is("converted_at", null).select("id");
  if (error) return fail("failed");
  if (!data?.length) return fail("notFound");
  revalidate();
  return { success: true };
}

/**
 * "Convertir en client": one database transaction (convert_prospect, migration 011) creates the customer record
 * — or merges into this rep's existing customer with the same e-mail — links prospect ⇄ customer, sets the stage
 * to "gagné" and logs it. Idempotent: converting twice returns the same customer.
 */
export async function convertProspect(id: string): Promise<{ success: true; customerId: string } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_prospect", { p_prospect: id });
  if (error) {
    if (/prospect_lost/.test(error.message)) return fail("lost");
    if (/prospect_not_found|forbidden/.test(error.message)) return fail("notFound");
    console.error("convertProspect failed:", error.message);
    return fail("failed");
  }
  revalidate();
  return { success: true, customerId: data as string };
}

export async function getProspectHistory(id: string): Promise<{ success: true; events: ProspectEvent[] } | Fail> {
  const me = await getCommercial();
  if (!me) return fail("forbidden");
  if (!isUuid(id)) return fail("invalid");
  const events = await loadProspectHistory(me, id);
  return events ? { success: true, events } : fail("notFound");
}
