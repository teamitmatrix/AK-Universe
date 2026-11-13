import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in admin's name and e-mail, or null if the caller is not an active admin.
 * Looked up server-side on every request: never inferred from anything the browser sends.
 */
export async function getAdminIdentity() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  // select("*"): the `active` column only exists once migration 005 is applied.
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin" || data.active === false) return null;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || String(data.email ?? user.email ?? "Admin");
  return { name, email: String(data.email ?? user.email ?? "") };
}
