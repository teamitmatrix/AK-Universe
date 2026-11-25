"use server";

import { redirect } from "next/navigation";
import { subscriptionResumePath } from "@/lib/auth/redirect";
import { ensureProfile } from "@/lib/auth/session";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { SECTORS, SIZES } from "@/config/organisation";

export async function createOrganization(input: { name: string; sector: string; size: string; next?: string }) {
  const name = input.name.trim();
  if (!name || name.length > 120 || !SECTORS.includes(input.sector) || !SIZES.includes(input.size)) {
    return { success: false as const, code: "invalid_input" as const };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion?redirectTo=/organisation");
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

  // Registration ends here. A plan chosen on the public site continues on that plan's checkout.
  // Otherwise the client dashboard opens.
  const { data: subs } = await createAdminClient().from("subscriptions").select("status").eq("user_id", auth.user.id);
  const statuses = (subs ?? []).map((row) => row.status as string);
  const live = statuses.some((status) => status === "active" || status === "past_due");
  const unfinished = statuses.some((status) => status === "pending" || status === "incomplete");
  const resume = subscriptionResumePath(input.next);
  if (!live && (resume || unfinished)) redirect(resume ?? "/agents-ia#tarifs");
  redirect("/client/dashboard");
}
