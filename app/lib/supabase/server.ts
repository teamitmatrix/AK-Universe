import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Service-role client for trusted server code only (webhooks, public quote intake). Bypasses RLS. */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  return createServiceClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Anonymous client without cookies, for public data (keeps routes cacheable). */
export function createPublicClient() {
  const { url, key } = getSupabaseEnv();
  return createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
