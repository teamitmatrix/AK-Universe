import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { loadBillingProfile, type BillingProfile } from "./billing";
import { parsePrefs, type NotificationPrefs } from "./notification-prefs";
import type { ClientMe } from "./session";

/*
 * Data of "Mon compte" (/client/dashboard/mon-compte). Everything is read with the customer's own session (RLS) except
 * the pending e-mail change, a server-only table read with the service key for the caller's own id.
 */

export type AccountProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
};

export type ClientAccount = {
  email: string;
  profile: AccountProfile;
  /** Columns of migration 018 exist (company / address / preferences can be saved). */
  profileReady: boolean;
  billing: BillingProfile;
  billingReady: boolean;
  prefs: NotificationPrefs;
  /** The account has a password (e-mail sign-in), as opposed to Google / Apple only. */
  hasPassword: boolean;
  mfaEnabled: boolean;
  pendingEmail: string | null;
  createdAt: string | null;
};

export async function loadClientAccount(me: ClientMe): Promise<ClientAccount> {
  const supabase = await createClient();
  const [{ data: auth }, { data: row, error }, factors, billing, membership] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("*").eq("id", me.id).maybeSingle(),
    supabase.auth.mfa.listFactors(),
    loadBillingProfile(me),
    supabase.from("organization_members").select("organizations (name)").eq("user_id", me.id).limit(1).maybeSingle(),
  ]);
  if (error) throw new Error(`Account: profile query failed: ${error.message}`);
  const p = (row ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const orgName = (membership.data?.organizations as unknown as { name?: string } | null)?.name ?? "";

  let pendingEmail: string | null = null;
  try {
    const { data } = await createAdminClient().from("account_email_changes").select("new_email, expires_at").eq("user_id", me.id).maybeSingle();
    if (data && new Date(data.expires_at as string) > new Date()) pendingEmail = data.new_email as string;
  } catch {
    // Table missing before migration 018: nothing pending.
  }

  const user = auth.user;
  return {
    email: user?.email ?? me.email,
    profile: {
      firstName: str("first_name"),
      lastName: str("last_name"),
      phone: str("phone"),
      company: str("company_name") || orgName,
      addressLine1: str("address_line1"),
      addressLine2: str("address_line2"),
      postalCode: str("postal_code"),
      city: str("city"),
      country: str("country") || "FR",
    },
    profileReady: "notification_prefs" in p,
    billing: billing.profile,
    billingReady: billing.ready,
    prefs: parsePrefs(p.notification_prefs),
    hasPassword: Boolean(user?.identities?.some((i) => i.provider === "email")),
    mfaEnabled: Boolean(factors.data?.totp.some((f) => f.status === "verified")),
    pendingEmail,
    createdAt: user?.created_at ?? null,
  };
}
