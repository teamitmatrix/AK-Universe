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
 * Where a signed-in user lands after login / /espace.
 * Admin → admin dashboard · Commercial → sales portal · Videaste → videographer portal.
 * null = deactivated (must not get in).
 */
export async function homePathFor(uid: string) {
  const profile = await profileOf(uid);
  if (profile?.active === false) return null;
  switch (profile?.role) {
    case "admin":
      return "/admin/dashboard";
    case "commercial":
      return "/commercial/dashboard";
    case "videaste":
      return "/videaste/dashboard";
  }
  return "/client/dashboard";
}

/** Default landing after sign-in when no redirectTo was requested: each role opens its own space. */
export async function landingPathFor(uid: string) {
  return (await homePathFor(uid)) ?? "/";
}