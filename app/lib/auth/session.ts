import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** The signed-in user (verified with the Auth server), or null. */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export async function isAdmin() {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  // select("*"): the `active` column only exists once migration 005 is applied. A deactivated admin is blocked at once.
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data?.role === "admin" && data.active !== false;
}

/**
 * Accounts created before the database migration have no profiles row (the sign-up trigger did not exist yet),
 * and organisations / subscriptions reference it. Creates the missing row; does nothing when it exists.
 */
export async function ensureProfile(user: User) {
  const meta = user.user_metadata ?? {};
  const [first, ...rest] = String(meta.full_name ?? "").split(" ");
  const { error } = await createAdminClient()
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email ?? "",
        first_name: meta.first_name ?? (first || null),
        last_name: meta.last_name ?? (rest.join(" ") || null),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  if (error) console.error("ensureProfile failed:", error.message);
}
