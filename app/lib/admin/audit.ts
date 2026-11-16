import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Appends an entry to the audit log (migration 009) after a sensitive admin write succeeded:
 * price changes, promotions, account (de)activation, settings, commissions, recorded balances.
 * Written with the admin's own session: RLS only accepts entries in the caller's name.
 * Never blocks the action itself — before migration 009, or if the insert fails, it just warns.
 */
export async function audit(action: string, target?: string | null, details?: Record<string, unknown>) {
  try {
    const me = await getCurrentUser();
    if (!me) return;
    const supabase = await createClient();
    const { error } = await supabase.from("audit_log").insert({
      actor_id: me.id,
      action: action.slice(0, 80),
      target: target ? String(target).slice(0, 200) : null,
      details: details ?? null,
    });
    if (error && !/audit_log/.test(error.message)) console.warn("Audit log write failed:", error.message);
  } catch (cause) {
    console.warn("Audit log write failed:", cause);
  }
}

/** Latest entries for Paramètres → Sécurité; null before migration 009. */
export async function loadAuditLog(limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("audit_log").select("id, actor_id, action, target, details, created_at").order("created_at", { ascending: false }).limit(limit);
  if (error) return null;
  const ids = [...new Set((data ?? []).map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, email, first_name, last_name").in("id", ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email]));
  return (data ?? []).map((r) => ({ id: r.id as number, at: r.created_at as string, actor: (r.actor_id && name.get(r.actor_id)) || "—", action: r.action as string, target: (r.target as string | null) ?? "" }));
}
