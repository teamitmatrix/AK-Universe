"use server";

import { revalidatePath } from "next/cache";
import { SOURCES } from "@/lib/commercial/stages";
import { isAdmin } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/admin/team";
import { audit } from "./audit";

type Fail = { success: false; error: "forbidden" | "invalid" | "failed" | "duplicate" };
const fail = (error: Fail["error"]): Fail => ({ success: false, error });

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim();
  return s.length > max ? undefined : s || null;
};

export type AdminProspectInput = {
  salespersonId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  need: string;
  budgetEuros: string;
  notes: string;
};

export type AdminCustomerInput = {
  salespersonId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
};

async function assertActiveCommercial(id: string) {
  if (!isUuid(id)) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id").eq("id", id).eq("role", "commercial").eq("active", true).maybeSingle();
  return Boolean(data);
}

/** Admin creates a prospect and assigns it to a commercial. */
export async function createAdminProspect(input: AdminProspectInput): Promise<{ success: true; id: string } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const salespersonId = String(input.salespersonId ?? "").trim();
  if (!(await assertActiveCommercial(salespersonId))) return fail("invalid");

  const name = text(input.name, 120);
  const company = text(input.company, 160);
  const email = text(input.email, 254);
  const phone = text(input.phone, 40);
  const need = text(input.need, 500);
  const notes = text(input.notes, 4000);
  const source = text(input.source, 40);
  if (!name || [company, email, phone, need, notes, source].includes(undefined)) return fail("invalid");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("invalid");
  if (phone && !/^[+0-9 ().-]{6,40}$/.test(phone)) return fail("invalid");
  if (source && !(SOURCES as readonly string[]).includes(source)) return fail("invalid");
  const rawBudget = String(input.budgetEuros ?? "").trim().replace(/\s/g, "").replace(",", ".");
  const budget = rawBudget === "" ? null : Number(rawBudget);
  if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 10_000_000)) return fail("invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      salesperson_id: salespersonId,
      name,
      company,
      email: email?.toLowerCase() ?? null,
      phone,
      source,
      need,
      budget_cents: budget === null ? null : Math.round(budget * 100),
      notes,
      stage: "nouveau",
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createAdminProspect failed:", error?.message);
    return fail("failed");
  }
  await audit("crm.prospect.create", data.id, { salespersonId, name });
  revalidatePath("/admin/prospects");
  revalidatePath("/admin/dashboard");
  return { success: true, id: data.id };
}

/**
 * Admin creates a customer record directly (service role: customers have no insert RLS policy;
 * normally they appear via convert_prospect). E-mail is required so the same fiche is reused on
 * devis / Mes clients (merge key = salesperson + e-mail).
 */
export async function createAdminCustomer(input: AdminCustomerInput): Promise<{ success: true; id: string } | Fail> {
  if (!(await isAdmin())) return fail("forbidden");
  const salespersonId = String(input.salespersonId ?? "").trim();
  if (!(await assertActiveCommercial(salespersonId))) return fail("invalid");

  const name = text(input.name, 160);
  const company = text(input.company, 160);
  const email = text(input.email, 254);
  const phone = text(input.phone, 40);
  if (!name || !email || [company, phone].includes(undefined)) return fail("invalid");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("invalid");
  if (phone && !/^[+0-9 ().-]{6,40}$/.test(phone)) return fail("invalid");
  const emailNorm = email.toLowerCase();

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("customers")
      .select("id")
      .eq("salesperson_id", salespersonId)
      .ilike("email", emailNorm)
      .limit(1)
      .maybeSingle();
    if (existing) return fail("duplicate");

    const { data: profile } = await admin.from("profiles").select("id").ilike("email", emailNorm).limit(1).maybeSingle();
    const { data, error } = await admin
      .from("customers")
      .insert({
        salesperson_id: salespersonId,
        name,
        company,
        email: emailNorm,
        phone,
        profile_id: (profile?.id as string | undefined) ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("createAdminCustomer failed:", error?.message);
      if (/customers_rep_email_key|duplicate/i.test(error?.message ?? "")) return fail("duplicate");
      return fail("failed");
    }
    await audit("crm.customer.create", data.id, { salespersonId, name });
    for (const path of [
      "/admin/clients",
      "/admin/client-detail",
      "/admin/dashboard",
      "/admin/devis-factures",
      "/commercial/mes-clients",
      "/commercial/devis-factures",
      "/commercial/dashboard",
    ]) {
      revalidatePath(path);
    }
    return { success: true, id: data.id };
  } catch (cause) {
    console.error("createAdminCustomer failed:", cause);
    return fail("failed");
  }
}
