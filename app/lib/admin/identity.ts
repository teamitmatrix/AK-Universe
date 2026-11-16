import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in admin's name and e-mail, or null if the caller is not an active admin.
 * Looked up server-side on every request: never inferred from anything the browser sends.
 */
export async function getAdminIdentity() {
  const user = await getCurrentUser();
  // A cookie the proxy still accepts can already be rejected by Auth (revoked session).
  // Clearing it has to happen in a route handler: a page cannot write cookies.
  if (!user) {
    const path = (await headers()).get("x-pathname") || "/admin/dashboard";
    const next = path.startsWith("/") && !path.startsWith("//") ? path : "/admin/dashboard";
    redirect(`/auth/session?redirectTo=${encodeURIComponent(next)}`);
  }
  const supabase = await createClient();
  // select("*"): the `active` column only exists once migration 005 is applied.
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin" || data.active === false) return null;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || String(data.email ?? user.email ?? "Admin");
  return { name, email: String(data.email ?? user.email ?? "") };
}
