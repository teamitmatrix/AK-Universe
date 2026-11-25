import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Find or create a customers row for this sales rep + client e-mail.
 * Uses the service role because customers have no insert RLS policy
 * (they are normally created by convert_prospect).
 * Returns null when there is no e-mail (no stable merge key).
 */
export async function ensureCustomerForRep(input: {
  salespersonId: string;
  name: string;
  email: string | null;
  phone?: string | null;
  company?: string | null;
}): Promise<string | null> {
  const email = input.email?.trim().toLowerCase() || null;
  if (!email || !input.salespersonId) return null;
  const name = input.name.trim().slice(0, 160);
  if (!name) return null;
  const phone = input.phone?.trim().slice(0, 40) || null;
  const company = input.company?.trim().slice(0, 160) || null;

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("customers")
      .select("id, phone, company, name")
      .eq("salesperson_id", input.salespersonId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const patch: Record<string, string> = {};
      if (!existing.phone && phone) patch.phone = phone;
      if (!existing.company && company) patch.company = company;
      if (Object.keys(patch).length) {
        await admin.from("customers").update(patch).eq("id", existing.id);
      }
      return existing.id as string;
    }

    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).limit(1).maybeSingle();
    const { data, error } = await admin
      .from("customers")
      .insert({
        salesperson_id: input.salespersonId,
        name,
        company,
        email,
        phone,
        profile_id: (profile?.id as string | undefined) ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("ensureCustomerForRep insert failed:", error?.message);
      // Race on unique (salesperson_id, email): re-read.
      const { data: again } = await admin
        .from("customers")
        .select("id")
        .eq("salesperson_id", input.salespersonId)
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      return (again?.id as string | undefined) ?? null;
    }
    return data.id as string;
  } catch (cause) {
    console.error("ensureCustomerForRep failed:", cause);
    return null;
  }
}
