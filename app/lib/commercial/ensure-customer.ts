import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Find or create a customers row for this sales rep.
 * Merge preference: same e-mail first, then same company name (case-insensitive).
 * Uses the service role because customers have no insert RLS policy
 * (they are normally created by convert_prospect).
 * Returns null when there is no e-mail (no stable contact key for a new row).
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
  const orgKey = norm(company || name);

  try {
    const admin = createAdminClient();

    const { data: byEmail } = await admin
      .from("customers")
      .select("id, phone, company, name, email")
      .eq("salesperson_id", input.salespersonId)
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    let existing = byEmail;

    if (!existing && orgKey) {
      const { data: peers } = await admin
        .from("customers")
        .select("id, phone, company, name, email")
        .eq("salesperson_id", input.salespersonId)
        .limit(500);
      existing =
        (peers ?? []).find((r) => {
          const label = norm((r.company as string | null) || (r.name as string) || "");
          return label === orgKey;
        }) ?? null;
    }

    if (existing?.id) {
      const patch: Record<string, string> = {};
      if (!existing.phone && phone) patch.phone = phone;
      if (!existing.company && company) patch.company = company;
      // Keep the first registered e-mail on a company match (unique per rep).
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
        company: company || name,
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
