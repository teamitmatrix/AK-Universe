import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/*
 * Server-side role lookups after sign-in. Reads profiles with the service key, from a user id taken from a
 * verified session — never a role or a flag sent by the browser.
 */

type Profile = { id: string; role?: string; active?: boolean | null };

async function profileOf(uid: string) {
  const { data, error } = await createAdminClient().from("profiles").select("*").eq("id", uid).maybeSingle();
  return error ? null : ((data as Profile | null) ?? null);
}

/** True when the account exists in profiles and was deactivated by an admin. */
export async function isDeactivated(uid: string) {
  return (await profileOf(uid))?.active === false;
}

/**
 * Where a signed-in user lands. Commercial and videaste spaces are still on another branch:
 * until they land on main, those roles use /equipe (shared tasks / assigned projects).
 * null = deactivated (must not get in).
 */
export async function homePathFor(uid: string) {
  const profile = await profileOf(uid);
  if (profile?.active === false) return null;
  switch (profile?.role) {
    case "admin":
      return "/admin/dashboard";
    case "commercial":
    case "videaste":
      return "/equipe";
  }
  const { data } = await createAdminClient().from("organization_members").select("organization_id").eq("user_id", uid).limit(1);
  return data?.length ? "/entreprise/dashboard" : "/dashboard";
}