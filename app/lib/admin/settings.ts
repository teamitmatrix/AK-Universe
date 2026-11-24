import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompany } from "@/lib/company";
import { emailConfigured, teamAddresses } from "@/lib/email";
import { getTeamNotifications } from "@/lib/notifications";
import { getTerms } from "@/lib/terms";
import { loadAuditLog } from "./audit";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "./team";

/** Everything the Paramètres tabs show, read live. */
export async function loadSettings() {
  const supabase = await createClient();
  const me = await getCurrentUser();
  const [{ data: profile }, company, terms, notifications, { data: team }, ...checks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", me?.id ?? "").maybeSingle(),
    getCompany(),
    getTerms(),
    getTeamNotifications(),
    supabase.from("profiles").select("*").in("role", ["admin", "commercial", "videaste"]).order("role").order("first_name"),
    // Which admin-space migrations are applied (each probe is a harmless empty read).
    supabase.from("profiles").select("active").limit(1),
    supabase.from("video_projects").select("revision_rounds").limit(1),
    supabase.from("commissions").select("id").limit(1),
    supabase.from("tasks").select("id").limit(1),
    supabase.storage.from("documents").list("library", { limit: 1 }),
    supabase.from("audit_log").select("id").limit(1),
  ]);
  const [m005, m006, m007, m008Tasks, m008Storage, m009] = checks.map((c) => !c.error);
  const auditLog = m009 ? await loadAuditLog(50) : null;
  const stripe = getStripe();

  return {
    profile: {
      firstName: (profile?.first_name as string | null) ?? "",
      lastName: (profile?.last_name as string | null) ?? "",
      phone: (profile?.phone as string | null) ?? "",
      email: (profile?.email as string | undefined) ?? me?.email ?? "",
      lastSignIn: me?.last_sign_in_at ?? null,
    },
    company,
    terms: {
      version: terms.version,
      label: terms.label,
      title: terms.title,
      bodyHtml: terms.bodyHtml,
      href: terms.href,
    },
    notifications,
    team: (team ?? []).map((p) => ({
      id: p.id as string,
      name: displayName(p as { first_name: string | null; last_name: string | null; email: string }),
      email: p.email as string,
      role: p.role as "admin" | "commercial" | "videaste",
      active: p.active !== false,
    })),
    security: {
      migrations: [
        { id: "005_admin_space", ok: m005 },
        { id: "006_revision_rounds", ok: m006 },
        // 007 adds a policy + an index to the commissions table; the table itself comes from 005.
        { id: "007_finance", ok: m007 },
        { id: "008_tasks_documents", ok: m008Tasks && m008Storage },
        { id: "009_audit_log", ok: m009 },
      ],
      email: emailConfigured(),
      teamRecipients: teamAddresses().length,
      stripe: stripe ? (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "live" : "test") : "off",
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
    auditLog,
  };
}
