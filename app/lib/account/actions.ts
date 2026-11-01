"use server";

import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SECTORS, SIZES } from "@/config/organisation";

export async function createOrganization(input: { name: string; sector: string; size: string }) {
  const name = input.name.trim();
  if (!name || name.length > 120 || !SECTORS.includes(input.sector) || !SIZES.includes(input.size)) {
    return { success: false as const, code: "invalid_input" as const };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion.html?redirectTo=/organisation.html");
  await ensureProfile(auth.user);

  const { error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_sector: input.sector,
    p_size: input.size,
  });
  if (error) {
    console.error("create_organization failed:", error.message);
    return { success: false as const, code: "failed" as const };
  }
  redirect("/abonnement.html");
}
